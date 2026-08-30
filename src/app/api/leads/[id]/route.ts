/**
 * ROUTE  PATCH /api/leads/[id]
 *
 * Moves a lead through the owner's follow-up pipeline. Authorisation is
 * enforced by Row Level Security on the leads table.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { LEAD_STATUSES } from "@/lib/domain/lead";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http";
import * as leads from "@/lib/services/leads";

export const runtime = "nodejs";

const bodySchema = z.object({ status: z.enum(LEAD_STATUSES) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireUser();

    const { status } = await parseJsonBody(request, bodySchema);
    const lead = await leads.markStatus(id, status);

    return jsonOk({ lead });
  } catch (error) {
    return jsonError(error);
  }
}
