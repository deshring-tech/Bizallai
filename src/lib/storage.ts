/**
 * MODULE  storage
 *
 * Purpose          Upload business photos straight from the browser.
 * Responsibilities Client-side validation, RLS-compatible paths, public URLs.
 * Dependencies     supabase/browser, photo-url, env.
 * Security         The storage policy requires the first path segment to equal
 *                  the uploader's user id. Building the path here — rather than
 *                  accepting one from the caller — is what makes that policy
 *                  enforceable rather than merely conventional.
 * Notes            Uploading directly to storage keeps large files off our own
 *                  server entirely; the API only ever sees the resulting URL.
 */

"use client";

import { clientEnv } from "@/lib/env";
import { PHOTO_BUCKET, PHOTO_EXTENSIONS, photoPathFromUrl, type PhotoType } from "@/lib/photo-url";
import { browserClient } from "@/lib/supabase/browser";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED: readonly PhotoType[] = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** The `accept` attribute for file inputs, kept in step with what we allow. */
export const ACCEPTED_IMAGE_TYPES = ACCEPTED.join(",");

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/**
 * Rejects before the network call so an owner on a slow connection learns
 * immediately, rather than after a 20-second upload.
 */
function acceptedType(file: File): PhotoType {
  const type = ACCEPTED.find((candidate) => candidate === file.type);
  if (!type) throw new UploadError("Use a JPG, PNG or WebP image.");
  if (file.size > MAX_BYTES) {
    throw new UploadError("That image is over 8 MB. Please choose a smaller one.");
  }
  return type;
}

export type UploadedPhoto = { url: string; path: string };

export async function uploadPhoto(
  file: File,
  context: { userId: string; businessId: string },
): Promise<UploadedPhoto> {
  const type = acceptedType(file);

  const storage = browserClient().storage.from(PHOTO_BUCKET);
  const path = `${context.userId}/${context.businessId}/${crypto.randomUUID()}.${PHOTO_EXTENSIONS[type]}`;

  const { error } = await storage.upload(path, file, {
    contentType: type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw new UploadError("Could not upload that image. Please try again.");

  return { url: storage.getPublicUrl(path).data.publicUrl, path };
}

/**
 * Best-effort cleanup when an owner removes a photo. A failure leaves an
 * orphaned object, which is wasteful but harmless, so it never blocks the edit.
 * Photos copied in by an import live outside the owner's folder and always
 * fall into that case.
 */
export async function deletePhoto(url: string): Promise<void> {
  const path = photoPathFromUrl(url, clientEnv.NEXT_PUBLIC_SUPABASE_URL);
  if (!path) return;

  await browserClient().storage.from(PHOTO_BUCKET).remove([path]);
}
