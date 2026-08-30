/**
 * MODULE  scrape
 *
 * Purpose          Fetch a user-supplied web page and reduce it to plain text.
 * Responsibilities SSRF defence, transfer limits, HTML to text extraction.
 * Dependencies     node:dns, errors.
 * Security         The URL comes from an untrusted form field, so the server
 *                  must not be turned into a proxy for the private network.
 *                  Hostnames are resolved and checked against private ranges
 *                  before the request, and redirects are not followed.
 */

import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { badRequest, upstreamFailed } from "@/lib/errors";

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 12_000;
/** Enough context for extraction without paying for a whole marketing site. */
const MAX_TEXT_CHARS = 24_000;

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;

  const [a = 0, b = 0] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true; // multicast and reserved
  return false;
}

function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase();
  if (value === "::1" || value === "::") return true;
  if (value.startsWith("fe80") || value.startsWith("fc") || value.startsWith("fd")) return true;
  // IPv4-mapped addresses smuggle private v4 space through a v6 literal.
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped?.[1] ? isPrivateIPv4(mapped[1]) : false;
}

function isPrivateAddress(address: string): boolean {
  return isIP(address) === 6 ? isPrivateIPv6(address) : isPrivateIPv4(address);
}

/** Validates the URL and confirms it resolves to a public address. */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw badRequest("That does not look like a valid link.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw badRequest("Only http and https links can be imported.");
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw badRequest("That link is not reachable.");
  }

  if (isIP(host)) {
    if (isPrivateAddress(host)) throw badRequest("That link is not reachable.");
    return url;
  }

  let resolved: Array<{ address: string }>;
  try {
    resolved = await lookup(host, { all: true });
  } catch {
    throw badRequest("We could not reach that link.");
  }

  if (resolved.length === 0 || resolved.some((entry) => isPrivateAddress(entry.address))) {
    throw badRequest("That link is not reachable.");
  }

  return url;
}

/** Strips scripts, styles and markup, leaving readable text with its structure. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(?:p|div|section|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t ]+/g, " ")
    // Stripped tags leave stray spaces hugging the line breaks we just created.
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ScrapedPage = {
  url: string;
  title: string | null;
  text: string;
  /** Absolute image URLs found on the page, in document order. */
  images: string[];
};

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? htmlToText(match[1]).slice(0, 160) : null;
}

/** Prefers social preview images; they are the ones already chosen to represent the business. */
function extractImages(html: string, base: URL): string[] {
  const found: string[] = [];

  const metaPattern =
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi;
  const imgPattern = /<img[^>]+src=["']([^"']+)["']/gi;

  for (const pattern of [metaPattern, imgPattern]) {
    for (const match of html.matchAll(pattern)) {
      const raw = match[1];
      if (!raw) continue;
      try {
        const absolute = new URL(raw, base);
        if (absolute.protocol !== "https:" && absolute.protocol !== "http:") continue;
        if (!found.includes(absolute.toString())) found.push(absolute.toString());
      } catch {
        continue;
      }
      if (found.length >= 12) return found;
    }
  }

  return found;
}

/**
 * Downloads a page with a hard byte ceiling. `redirect: "error"` matters: a
 * public hostname that 302s to 169.254.169.254 would otherwise defeat the
 * pre-flight address check.
 */
export async function fetchPageText(rawUrl: string): Promise<ScrapedPage> {
  const url = await assertPublicUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: "error",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "BizPageBot/1.0 (+https://bizpage.app/bot)",
      },
    });

    if (!response.ok) {
      throw upstreamFailed(`That page returned an error (${response.status}).`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html") && !contentType.includes("text/plain")) {
      throw badRequest("That link is not a web page we can read.");
    }

    const html = await readCapped(response, MAX_BYTES);

    return {
      url: url.toString(),
      title: extractTitle(html),
      text: htmlToText(html).slice(0, MAX_TEXT_CHARS),
      images: extractImages(html, url),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw upstreamFailed("That page took too long to respond.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Reads the body incrementally so an enormous response cannot exhaust memory. */
async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  while (received < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }

  await reader.cancel().catch(() => undefined);
  return text;
}
