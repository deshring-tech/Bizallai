/**
 * MODULE  storage
 *
 * Purpose          Upload business photos straight from the browser.
 * Responsibilities Client-side validation, RLS-compatible paths, public URLs.
 * Dependencies     supabase/browser.
 * Security         The storage policy requires the first path segment to equal
 *                  the uploader's user id. Building the path here — rather than
 *                  accepting one from the caller — is what makes that policy
 *                  enforceable rather than merely conventional.
 * Notes            Uploading directly to storage keeps large files off our own
 *                  server entirely; the API only ever sees the resulting URL.
 */

"use client";

import { browserClient } from "@/lib/supabase/browser";

const BUCKET = "business-photos";
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

/** The `accept` attribute for file inputs, kept in step with what we allow. */
export const ACCEPTED_IMAGE_TYPES = ACCEPTED.join(",");

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

function extensionFor(type: string): string {
  return type === "image/jpeg" ? "jpg" : type.replace("image/", "");
}

/**
 * Rejects before the network call so an owner on a slow connection learns
 * immediately, rather than after a 20-second upload.
 */
function validate(file: File): void {
  if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
    throw new UploadError("Use a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError("That image is over 8 MB. Please choose a smaller one.");
  }
}

export type UploadedPhoto = { url: string; path: string };

export async function uploadPhoto(
  file: File,
  context: { userId: string; businessId: string },
): Promise<UploadedPhoto> {
  validate(file);

  const db = browserClient();
  const path = `${context.userId}/${context.businessId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;

  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw new UploadError("Could not upload that image. Please try again.");

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Best-effort cleanup when an owner removes a photo. A failure here leaves an
 * orphaned object, which is wasteful but harmless — so it never blocks the edit.
 */
export async function deletePhoto(url: string): Promise<void> {
  const path = pathFromPublicUrl(url);
  if (!path) return;

  await browserClient().storage.from(BUCKET).remove([path]);
}

/** Only our own bucket URLs yield a path; imported third-party images yield null. */
function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}
