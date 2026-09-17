/**
 * ROUTE  POST /api/p/[slug]/leads
 *
 * Public lead capture — the one write path open to anonymous visitors, and the
 * moment the whole product exists for. Keyed by slug so a caller can only ever
 * write into a page that is actually published.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { leadSubmissionSchema } from "@/lib/domain/lead";
import { clientKey, jsonError, jsonOk, parseJsonBody } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import * as leads from "@/lib/services/leads";

export const runtime = "nodejs";

/** `website` is the form's honeypot: invisible to people, tempting to form-filling bots. */
const requestSchema = leadSubmissionSchema.extend({
  website: z.string().max(200).optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const client = clientKey(request);

    // Per-page as well as per-client: one abusive visitor cannot lock out a
    // busy gym's real customers, and one page cannot be flooded from many IPs.
    await enforceRateLimit(`lead:${client}`, { limit: 6, windowMs: 10 * 60_000 });
    await enforceRateLimit(`lead:page:${slug}`, { limit: 120, windowMs: 10 * 60_000 });

    const { website, ...submission } = await parseJsonBody(request, requestSchema);

    // Answer exactly as for a real enquiry, so the bot learns nothing — but store nothing.
    if (website) {
      console.warn(JSON.stringify({ event: "lead_honeypot", slug }));
      return jsonOk({ whatsappUrl: null }, { status: 201 });
    }

    const result = await leads.captureForSlug(slug, submission);
    return jsonOk({ whatsappUrl: result.whatsappUrl }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
