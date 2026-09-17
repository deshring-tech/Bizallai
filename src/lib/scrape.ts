/**
 * MODULE  scrape
 *
 * Purpose          Fetch user-supplied URLs safely.
 * Responsibilities SSRF defence, redirect handling, transfer limits, and
 *                  reducing HTML to readable text and candidate images.
 * Dependencies     node:dns, errors, env, site.
 * Security         URLs come from untrusted form fields and from third-party
 *                  pages, so the server must not become a proxy into a private
 *                  network. Hostnames are resolved and checked against private
 *                  ranges before every request, including each redirect hop.
 */

import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { siteUrl } from "@/lib/env";
import { badRequest, upstreamFailed } from "@/lib/errors";
import { SITE_NAME } from "@/lib/site";

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

type FetchOptions = {
  accept: string;
  maxBytes: number;
  /** Checked before the body is read, so an unwanted file is never downloaded. */
  acceptContentType?: (contentType: string) => boolean;
};

type Fetched = { url: URL; bytes: Uint8Array; truncated: boolean };

const MAX_REDIRECTS = 3;

/**
 * The one way this app fetches a URL a user supplied. Redirects are followed by
 * hand and every hop is re-checked: a public host that redirects to
 * 169.254.169.254 must be refused exactly like a direct link to it. The time
 * limit covers the whole chain, and the body is read under a hard byte ceiling.
 */
async function guardedFetch(rawUrl: string, options: FetchOptions): Promise<Fetched> {
  let url = await assertPublicUrl(rawUrl);
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  try {
    for (let hop = 0; ; hop += 1) {
      const response = await fetch(url, {
        redirect: "manual",
        signal,
        headers: {
          accept: options.accept,
          // Identifies us honestly to the site being read.
          "user-agent": `${SITE_NAME}Bot/1.0 (+${siteUrl})`,
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);

        if (!location || hop >= MAX_REDIRECTS) {
          throw upstreamFailed(
            "That link redirects too many times. Paste the address your browser ends up on.",
          );
        }

        url = await assertPublicUrl(new URL(location, url).toString());
        continue;
      }

      if (!response.ok) {
        throw upstreamFailed(`That page returned an error (${response.status}).`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (options.acceptContentType && !options.acceptContentType(contentType)) {
        await response.body?.cancel().catch(() => undefined);
        throw badRequest("That link is not a web page we can read.");
      }

      return { url, ...(await readCapped(response, options.maxBytes)) };
    }
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw upstreamFailed("That page took too long to respond.");
    }
    // fetch reports DNS, TLS and connection failures as TypeError.
    if (error instanceof TypeError) {
      throw upstreamFailed("We couldn't open that link. Check the address and try again.");
    }
    throw error;
  }
}

/** Downloads a web page and reduces it to a title, readable text and candidate images. */
export async function fetchPageText(rawUrl: string): Promise<ScrapedPage> {
  const page = await guardedFetch(rawUrl, {
    accept: "text/html,application/xhtml+xml",
    maxBytes: MAX_BYTES,
    acceptContentType: (type) => type.includes("html") || type.includes("text/plain"),
  });

  // Truncation is acceptable for a page: its start carries what import needs.
  const html = new TextDecoder().decode(page.bytes);

  return {
    url: page.url.toString(),
    title: extractTitle(html),
    text: htmlToText(html).slice(0, MAX_TEXT_CHARS),
    images: extractImages(html, page.url),
  };
}

/** Downloads a file whole or not at all: a truncated image is a corrupt image. */
export async function fetchPublicBytes(
  rawUrl: string,
  options: { accept: string; maxBytes: number },
): Promise<Uint8Array> {
  const file = await guardedFetch(rawUrl, options);
  if (file.truncated) throw badRequest("That file is too large.");
  return file.bytes;
}

/** Reads the body incrementally so an enormous response cannot exhaust memory. */
async function readCapped(
  response: Response,
  maxBytes: number,
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) return { bytes: new Uint8Array(), truncated: false };

  const chunks: Uint8Array[] = [];
  let received = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (received + value.byteLength > maxBytes) {
      chunks.push(value.subarray(0, maxBytes - received));
      received = maxBytes;
      truncated = true;
      break;
    }

    chunks.push(value);
    received += value.byteLength;
  }

  await reader.cancel().catch(() => undefined);

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes, truncated };
}
