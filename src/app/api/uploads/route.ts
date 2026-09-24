/**
 * ROUTE  POST /api/uploads
 *
 * Lets a visitor add photos before they have an account. A page without
 * pictures is not worth publishing, and asking someone to sign up first is
 * where owners give up. Anonymous visitors cannot write to storage directly —
 * the policy keys every object to a user id — so the file comes through here.
 */

import type { NextRequest } from "next/server";
import { badRequest } from "@/lib/errors";
import { clientKey, jsonError, jsonOk } from "@/lib/http";
import { sniffImageType } from "@/lib/image-import";
import { enforceRateLimit } from "@/lib/rate-limit";
import { storeImage } from "@/lib/repositories/photos";

export const runtime = "nodejs";

/**
 * The browser shrinks photos before sending, so anything close to this is
 * either an unshrunk original from an old browser or someone probing us.
 * Serverless platforms cap request bodies near 4.5 MB in any case.
 */
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(`upload:${clientKey(request)}`, { limit: 30, windowMs: 10 * 60_000 });

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");

    if (!(file instanceof File)) throw badRequest("No image was sent.");
    if (file.size > MAX_BYTES) {
      throw badRequest("That image is too large. Please choose a smaller one.");
    }

    // The browser's declared type is not trusted: the file's own bytes decide.
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) throw badRequest("That file is not an image we can use. Try a JPG, PNG or WebP.");

    return jsonOk({ url: await storeImage(bytes, type, "uploads") }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
