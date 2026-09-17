/**
 * MODULE  photo-url
 *
 * Purpose          Decide whether an image URL points at our own photo storage.
 * Responsibilities Bucket name, stored image types, URL-to-path conversion.
 * Dependencies     None. The Supabase origin is passed in, so this runs in the
 *                  browser, on the server and in tests alike.
 * Security         Only images we stored may appear on a page. A third-party
 *                  URL makes `next/image` throw (it only loads configured
 *                  hosts), social-media image links expire, and any foreign
 *                  image can track a page's visitors. URLs are compared after
 *                  parsing, never by string prefix, so a host such as
 *                  `project.supabase.co.evil.com` does not pass.
 */

import type { Photo } from "@/lib/domain/business";

export const PHOTO_BUCKET = "business-photos";

/** Image types we will store, with the file extension each is saved under. */
export const PHOTO_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
} as const;

export type PhotoType = keyof typeof PHOTO_EXTENSIONS;

const PUBLIC_PATH_PREFIX = `/storage/v1/object/public/${PHOTO_BUCKET}/`;

/** The object path inside our bucket, or null if the URL is not one of ours. */
export function photoPathFromUrl(url: string, supabaseUrl: string): string | null {
  let parsed: URL;
  let origin: URL;
  try {
    parsed = new URL(url);
    origin = new URL(supabaseUrl);
  } catch {
    return null;
  }

  if (parsed.origin !== origin.origin) return null;
  if (!parsed.pathname.startsWith(PUBLIC_PATH_PREFIX)) return null;

  let path: string;
  try {
    path = decodeURIComponent(parsed.pathname.slice(PUBLIC_PATH_PREFIX.length));
  } catch {
    return null;
  }

  // An encoded path that climbs out of the bucket is not one of ours.
  if (!path || path.split("/").some((segment) => segment === "" || segment === "..")) return null;
  return path;
}

export function isStoredPhotoUrl(url: string, supabaseUrl: string): boolean {
  return photoPathFromUrl(url, supabaseUrl) !== null;
}

export function keepStoredPhotos(photos: readonly Photo[], supabaseUrl: string): Photo[] {
  return photos.filter((photo) => isStoredPhotoUrl(photo.url, supabaseUrl));
}
