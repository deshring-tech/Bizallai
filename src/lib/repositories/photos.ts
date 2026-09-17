/**
 * MODULE  repositories/photos
 *
 * Purpose          Server-side writes to photo storage.
 * Responsibilities Store an image copied in during an import.
 * Dependencies     supabase/server, photo-url, errors.
 * Security         Uses the service-role key, because the visitor running an
 *                  import may not have signed in yet. The caller must already
 *                  have size-checked the bytes and identified their type from
 *                  the file signature. Objects go under `imported/`, outside
 *                  any user's folder, so owners' own-folder storage policy
 *                  neither applies nor needs loosening.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import { upstreamFailed } from "@/lib/errors";
import { PHOTO_BUCKET, PHOTO_EXTENSIONS, type PhotoType } from "@/lib/photo-url";
import { serviceClient } from "@/lib/supabase/server";

/** Returns the public URL of the stored image. */
export async function storeImportedImage(bytes: Uint8Array, type: PhotoType): Promise<string> {
  const storage = serviceClient().storage.from(PHOTO_BUCKET);
  const path = `imported/${randomUUID()}.${PHOTO_EXTENSIONS[type]}`;

  const { error } = await storage.upload(path, bytes, {
    contentType: type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw upstreamFailed("Could not save an imported photo.");
  return storage.getPublicUrl(path).data.publicUrl;
}
