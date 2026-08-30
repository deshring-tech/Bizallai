/**
 * MODULE  rate-limit
 *
 * Purpose          Cheap in-process throttling for public write endpoints.
 * Responsibilities Fixed-window counting per key, with bounded memory.
 * Dependencies     errors.
 * Limitation       State is per server instance, so a horizontally scaled
 *                  deployment enforces the limit per instance. That is enough
 *                  to blunt form-spam; swap the backing store for Redis when
 *                  traffic justifies it — the call site does not change.
 */

import { rateLimited } from "@/lib/errors";

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitOptions = {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

/** Records a hit and throws a 429 once the caller exceeds the window's limit. */
export function enforceRateLimit(key: string, options: RateLimitOptions): void {
  const now = Date.now();

  if (windows.size > MAX_TRACKED_KEYS) sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > options.limit) {
    const seconds = Math.ceil((existing.resetAt - now) / 1000);
    throw rateLimited(`Too many requests. Please try again in ${seconds}s.`);
  }
}
