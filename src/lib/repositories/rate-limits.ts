/**
 * MODULE  repositories/rate-limits
 *
 * Purpose          The shared counter behind durable rate limiting.
 * Responsibilities One atomic fixed-window increment per call.
 * Dependencies     supabase/server.
 * Security         Uses the service-role key: `hit_rate_limit` is not
 *                  executable by the anon or authenticated roles, so visitors
 *                  cannot reset or inflate counters through the public API.
 *                  Any client identifier inside a key is already a keyed hash.
 */

import "server-only";

import { serviceClient } from "@/lib/supabase/server";

/**
 * Short on purpose: this call sits in front of every protected request, and a
 * slow database should hand over to the in-process limiter quickly rather than
 * stall the visitor.
 */
const TIMEOUT_MS = 1_500;

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export async function hitRateLimit(
  key: string,
  maxHits: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const { data, error } = await serviceClient()
    .rpc("hit_rate_limit", {
      bucket_key: key,
      max_hits: maxHits,
      window_seconds: windowSeconds,
    })
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS))
    .single();

  if (error || !data) {
    throw new Error(`rate limit store failed: ${error?.message ?? "no result"}`);
  }

  return { allowed: data.allowed, retryAfterSeconds: data.retry_after_seconds };
}
