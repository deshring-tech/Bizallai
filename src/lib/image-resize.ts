/**
 * MODULE  image-resize
 *
 * Purpose          Shrink a photo in the browser before it is uploaded.
 * Responsibilities Bound the dimensions, re-encode, and fall back safely.
 * Dependencies     None beyond browser canvas APIs.
 * Notes            Phone cameras produce 3–8 MB files. On a slow mobile
 *                  connection that is a long upload for an image displayed at
 *                  most 640px wide, and serverless upload routes cap request
 *                  bodies at around 4.5 MB. Every failure path returns the
 *                  original file, so an old browser still works — just slower.
 */

"use client";

const MAX_EDGE = 1600;
const QUALITY = 0.82;

/** Below this, re-encoding costs more time than it saves on the wire. */
const SKIP_BELOW_BYTES = 400 * 1024;

export async function shrinkImage(file: File): Promise<Blob> {
  if (file.size <= SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // WebP keeps transparency and is the smallest widely supported format.
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );

    // Keep the original if re-encoding produced nothing, or made it bigger.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
