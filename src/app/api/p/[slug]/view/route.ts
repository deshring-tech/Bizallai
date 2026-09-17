/**
 * ROUTE  POST /api/p/[slug]/view
 *
 * Records that a published page was opened. Keyed by slug so a caller can only
 * ever increment a page that actually exists and is live.
 *
 * Stores no visitor identifier — see `repositories/analytics`. The response is
 * 204 with no body because the browser sends this via `sendBeacon` and cannot
 * read a reply anyway.
 */

import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { clientKey } from "@/lib/http";
import { enforceLocalRateLimit } from "@/lib/rate-limit";
import { recordView } from "@/lib/repositories/analytics";
import { findPublishedBySlug } from "@/lib/repositories/businesses";

export const runtime = "nodejs";

/** Always 204: counting traffic must never surface an error to a visitor. */
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;

    // Blunt-instrument throttle: without it a refresh loop could inflate a
    // count to meaninglessness. Generous enough not to undercount a family
    // sharing one connection. Deliberately the in-process limiter: this runs on
    // every page view, and a view count is not worth a database round trip.
    enforceLocalRateLimit(`view:${clientKey(request)}:${slug}`, { limit: 20, windowMs: 60_000 });

    const business = await findPublishedBySlug(slug);
    if (business) await recordView(business.id);
  } catch (error) {
    if (!(error instanceof AppError)) console.error("[view] beacon failed", error);
  }

  return new Response(null, { status: 204 });
}
