/**
 * ROUTE  POST /api/onboarding
 *
 * Runs one turn of the setup interview. Stateless by design: the client holds
 * the transcript and the profile accumulated so far, so a dropped connection
 * costs a turn rather than the whole session.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { conversationTurnSchema, runOnboardingTurn } from "@/lib/ai/onboarding";
import { businessProfileSchema } from "@/lib/domain/business";
import { clientKey, jsonError, jsonOk, parseJsonBody } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  turns: z.array(conversationTurnSchema).min(1).max(40),
  known: businessProfileSchema.partial().optional(),
  importedContext: z.string().max(24_000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`onboarding:${clientKey(request)}`, { limit: 40, windowMs: 60_000 });

    const body = await parseJsonBody(request, bodySchema);
    const result = await runOnboardingTurn(body);

    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
