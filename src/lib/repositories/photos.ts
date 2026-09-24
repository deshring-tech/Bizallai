/**
 * MODULE  repositories/photos
 *
 * Purpose          Server-side writes to photo storage.
 * Responsibilities Store an image the server has already checked.
 * Dependencies     supabase/server, photo-url, errors.
 * Security         Uses the service-role key, because the visitor may not have
 *                  signed in yet — during an import, or while adding photos to
 *                  a page they are still building. The caller must already have
 *                  size-checked the bytes and identified their type from the
 *                  file signature. Objects go in shared folders, outside any
 *                  user's own folder, so the policy limiting owners to their
 *                  own folder neither applies nor needs loosening.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import { upstreamFailed } from "@/lib/errors";
import { PHOTO_BUCKET, PHOTO_EXTENSIONS, type PhotoType } from "@/lib/photo-url";
import { serviceClient } from "@/lib/supabase/server";

/** `imported` came from someone's website; `uploads` was chosen by a visitor. */
export type ImageFolder = "imported" | "uploads";

/** Returns the public URL of the stored image. */
export async function storeImage(
  bytes: Uint8Array,
  type: PhotoType,
  folder: ImageFolder,
): Promise<string> {
  const storage = serviceClient().storage.from(PHOTO_BUCKET);
  const path = `${folder}/${randomUUID()}.${PHOTO_EXTENSIONS[type]}`;

  const { error } = await storage.upload(path, bytes, {
    contentType: type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw upstreamFailed("Could not save that photo.");
  return storage.getPublicUrl(path).data.publicUrl;
}
