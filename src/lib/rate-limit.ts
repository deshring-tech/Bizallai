/**
 * MODULE  rate-limit
 *
 * Purpose          Throttle public endpoints.
 * Responsibilities Durable fixed-window limits shared by every server instance,
 *                  with an in-process limiter as fallback and for hot paths.
 * Dependencies     repositories/rate-limits, errors.
 * Notes            On serverless hosting each instance has its own memory and
 *                  instances come and go, so an in-memory counter on its own
 *                  barely limits anything. The database counter is shared. If
 *                  the database cannot answer quickly, the local counter still
 *                  applies: limiting degrades, it never switches off.
 */

import "server-only";

import { rateLimited } from "@/lib/errors";
import { hitRateLimit } from "@/lib/repositories/rate-limits";

export type RateLimitOptions = {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Shown instead of the default "try again in Ns" message. */
  message?: string;
};

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

function refusal(options: RateLimitOptions, retryAfterSeconds: number) {
  return rateLimited(
    options.message ?? `Too many requests. Please try again in ${retryAfterSeconds}s.`,
  );
}

/**
 * In-process limit for this server instance only. Use it directly only where a
 * database round trip is not worth it, such as counting page views.
 */
export function enforceLocalRateLimit(key: string, options: RateLimitOptions): void {
  const now = Date.now();

  if (windows.size > MAX_TRACKED_KEYS) sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > options.limit) {
    throw refusal(options, Math.ceil((existing.resetAt - now) / 1000));
  }
}

/** Records a hit against the shared limit and throws a 429 once it is exceeded. */
export async function enforceRateLimit(key: string, options: RateLimitOptions): Promise<void> {
  let result;
  try {
    result = await hitRateLimit(key, options.limit, Math.ceil(options.windowMs / 1000));
  } catch (error) {
    // One line, no stack: during an outage this fires on every request.
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[rate-limit] shared store unavailable, using the local limit: ${reason}`);
    enforceLocalRateLimit(key, options);
    return;
  }

  if (!result.allowed) throw refusal(options, result.retryAfterSeconds);
}
