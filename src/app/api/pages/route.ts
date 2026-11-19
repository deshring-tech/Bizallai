/**
 * ROUTE  POST /api/pages
 *
 * Creates the page. Signing in is optional here: an anonymous visitor gets a
 * live draft immediately and claims it after signing up, which is what keeps
 * the setup flow under a minute.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { businessProfileSchema, themeSchema } from "@/lib/domain/business";
import { clientKey, jsonError, jsonOk, parseJsonBody } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import * as pages from "@/lib/services/pages";

export const runtime = "nodejs";

const bodySchema = z.object({
  profile: businessProfileSchema,
  theme: themeSchema.optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Loose enough for several owners sharing one mobile address.
    await enforceRateLimit(`pages:create:${clientKey(request)}`, {
      limit: 25,
      windowMs: 60 * 60_000,
    });

    const body = await parseJsonBody(request, bodySchema);
    const user = await currentUser();

    const business = await pages.createDraft({
      ownerId: user?.id ?? null,
      profile: body.profile,
      theme: body.theme,
    });

    return jsonOk({ business }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
