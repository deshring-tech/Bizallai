/**
 * ROUTE  POST /api/p/[slug]/leads
 *
 * Public lead capture — the one write path open to anonymous visitors, and the
 * moment the whole product exists for. Keyed by slug so a caller can only ever
 * write into a page that is actually published.
 */

import type { NextRequest } from "next/server";
import { leadSubmissionSchema } from "@/lib/domain/lead";
import { clientKey, jsonError, jsonOk, parseJsonBody } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import * as leads from "@/lib/services/leads";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;

    // Per-page as well as per-client: one abusive visitor cannot lock out a
    // busy gym's real customers, and one page cannot be flooded from many IPs.
    enforceRateLimit(`lead:${clientKey(request)}`, { limit: 6, windowMs: 10 * 60_000 });
    enforceRateLimit(`lead:page:${slug}`, { limit: 120, windowMs: 10 * 60_000 });

    const submission = await parseJsonBody(request, leadSubmissionSchema);
    const result = await leads.captureForSlug(slug, submission);

    return jsonOk({ whatsappUrl: result.whatsappUrl }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
