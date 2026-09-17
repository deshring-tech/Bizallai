/**
 * MODULE  image-import
 *
 * Purpose          Bring the photos from an imported website into our storage.
 * Responsibilities Fetch each candidate safely, confirm it really is an image,
 *                  store it, and return our own URLs in the original order.
 * Dependencies     scrape (guarded fetch), repositories/photos, photo-url.
 * Security         The URLs come from a stranger's web page. Every fetch goes
 *                  through the SSRF guard, the size is capped, and the type is
 *                  read from the file's own signature. The remote Content-Type
 *                  header is never trusted: an SVG or HTML file labelled as an
 *                  image would otherwise become stored, publicly served content.
 * Notes            A bad image is dropped rather than failing the import —
 *                  three good photos out of five is still a good import.
 */

import "server-only";

import type { PhotoType } from "@/lib/photo-url";
import { storeImportedImage } from "@/lib/repositories/photos";
import { fetchPublicBytes } from "@/lib/scrape";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Below this an "image" is an icon, spacer or tracking pixel, not a photo. */
const MIN_IMAGE_BYTES = 8 * 1024;

export const MAX_IMPORTED_PHOTOS = 8;

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

/** Identifies an image by its leading bytes. SVG is deliberately not accepted. */
export function sniffImageType(bytes: Uint8Array): PhotoType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && pngSignature.every((value, index) => bytes[index] === value)) {
    return "image/png";
  }

  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))) return "image/gif";

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }

  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 4))) {
    return "image/avif";
  }

  return null;
}

/** Copies up to `MAX_IMPORTED_PHOTOS` images and returns the ones that succeeded. */
export async function copyRemoteImages(urls: readonly string[]): Promise<string[]> {
  const candidates = [...new Set(urls)].slice(0, MAX_IMPORTED_PHOTOS);
  const results = await Promise.allSettled(candidates.map(copyOne));

  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed > 0) console.warn(`[image-import] skipped ${failed} of ${candidates.length} images`);

  return results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
}

async function copyOne(url: string): Promise<string | null> {
  const bytes = await fetchPublicBytes(url, { accept: "image/*", maxBytes: MAX_IMAGE_BYTES });
  if (bytes.length < MIN_IMAGE_BYTES) return null;

  const type = sniffImageType(bytes);
  if (!type) return null;

  return storeImportedImage(bytes, type);
}
