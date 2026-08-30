/**
 * ROUTE  POST /api/pages/[id]/claim
 *
 * Attaches a draft created before sign-up to the account that just signed in.
 */

import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import * as pages from "@/lib/services/pages";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await requireUser();
    const business = await pages.claim(id, user.id);

    return jsonOk({ business });
  } catch (error) {
    return jsonError(error);
  }
}
