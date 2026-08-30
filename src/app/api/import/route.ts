/**
 * ROUTE  POST /api/import
 *
 * Builds a draft profile from an existing website or social page. Rate limited
 * harder than the chat endpoint because each call makes an outbound fetch.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { importFromUrl } from "@/lib/ai/import";
import { clientKey, jsonError, jsonOk, parseJsonBody } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().trim().min(4).max(2_000),
});

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`import:${clientKey(request)}`, { limit: 8, windowMs: 60_000 });

    const { url } = await parseJsonBody(request, bodySchema);
    const result = await importFromUrl(withProtocol(url));

    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

/** Owners paste "ironfit.com.np" far more often than a full URL. */
function withProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
