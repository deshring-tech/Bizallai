/**
 * MODULE  storage
 *
 * Purpose          Get a business photo into storage from the browser.
 * Responsibilities Client-side validation, shrinking, and the two upload paths.
 * Dependencies     supabase/browser, photo-url, image-resize, env.
 * Security         Direct uploads take an RLS-compatible path whose first
 *                  segment is the uploader's user id. Building that path here —
 *                  rather than accepting one from the caller — is what makes
 *                  the storage policy enforceable rather than merely conventional.
 * Notes            Two paths on purpose. A signed-in owner uploads straight to
 *                  storage, which keeps large files off our server. A visitor
 *                  setting up a page has no account yet and so cannot satisfy
 *                  that policy; their file goes through `/api/uploads`, which
 *                  checks it and stores it with the service-role key.
 */

"use client";

import { clientEnv } from "@/lib/env";
import { shrinkImage } from "@/lib/image-resize";
import { PHOTO_BUCKET, PHOTO_EXTENSIONS, photoPathFromUrl, type PhotoType } from "@/lib/photo-url";
import { browserClient } from "@/lib/supabase/browser";

const MAX_BYTES = 20 * 1024 * 1024;
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
 * Rejects before any work happens, so an owner on a slow connection learns
 * immediately rather than after a long upload. The ceiling is generous because
 * the file is shrunk before it is sent.
 */
function acceptedType(file: File): PhotoType {
  const type = ACCEPTED.find((candidate) => candidate === file.type);
  if (!type) throw new UploadError("Use a JPG, PNG or WebP image.");
  if (file.size > MAX_BYTES) {
    throw new UploadError("That image is too large. Please choose a smaller one.");
  }
  return type;
}

export type UploadedPhoto = { url: string; path: string };

/** Signed-in owners: straight to storage, so the file never touches our server. */
export async function uploadPhoto(
  file: File,
  context: { userId: string; businessId: string },
): Promise<UploadedPhoto> {
  const originalType = acceptedType(file);
  const blob = await shrinkImage(file);
  // `shrinkImage` returns the original file when it declines to re-encode.
  const type: PhotoType = blob === file ? originalType : "image/webp";

  const storage = browserClient().storage.from(PHOTO_BUCKET);
  const path = `${context.userId}/${context.businessId}/${crypto.randomUUID()}.${PHOTO_EXTENSIONS[type]}`;

  const { error } = await storage.upload(path, blob, {
    contentType: type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw new UploadError("Could not upload that image. Please try again.");

  return { url: storage.getPublicUrl(path).data.publicUrl, path };
}

/** Before sign-up: the server checks the file and stores it on the visitor's behalf. */
export async function uploadPhotoToServer(file: File): Promise<{ url: string }> {
  acceptedType(file);
  const blob = await shrinkImage(file);

  const body = new FormData();
  body.append("file", blob, "photo");

  let response: Response;
  try {
    response = await fetch("/api/uploads", { method: "POST", body });
  } catch {
    throw new UploadError("Check your connection and try again.");
  }

  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.url) {
    throw new UploadError(payload.error?.message ?? "Could not upload that image. Please try again.");
  }

  return { url: payload.url };
}

/**
 * Best-effort cleanup when an owner removes a photo. A failure leaves an
 * orphaned object, which is wasteful but harmless, so it never blocks the edit.
 * Photos added before sign-up, or copied in by an import, live outside the
 * owner's folder and always fall into that case.
 */
export async function deletePhoto(url: string): Promise<void> {
  const path = photoPathFromUrl(url, clientEnv.NEXT_PUBLIC_SUPABASE_URL);
  if (!path) return;

  await browserClient().storage.from(PHOTO_BUCKET).remove([path]);
}
