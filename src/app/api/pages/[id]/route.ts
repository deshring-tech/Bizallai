/**
 * ROUTE  PATCH|DELETE /api/pages/[id]
 *
 * One endpoint for every owner-initiated change to a page. The body is a
 * discriminated union so each intent carries exactly the fields it needs and
 * the service layer decides whether it is allowed.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { businessProfileSchema, themeSchema } from "@/lib/domain/business";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/http";
import * as pages from "@/lib/services/pages";

export const runtime = "nodejs";

const patchSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("save"),
    profile: businessProfileSchema.optional(),
    theme: themeSchema.optional(),
  }),
  z.object({ intent: z.literal("publish") }),
  z.object({ intent: z.literal("unpublish") }),
  z.object({ intent: z.literal("rename"), slug: z.string().trim().min(3).max(48) }),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireUser();
    const body = await parseJsonBody(request, patchSchema);

    const business = await applyPatch(id, user.id, body);
    return jsonOk({ business });
  } catch (error) {
    return jsonError(error);
  }
}

function applyPatch(id: string, ownerId: string, body: z.infer<typeof patchSchema>) {
  switch (body.intent) {
    case "save":
      return pages.saveProfile(id, ownerId, { profile: body.profile, theme: body.theme });
    case "publish":
      return pages.publish(id, ownerId);
    case "unpublish":
      return pages.unpublish(id, ownerId);
    case "rename":
      return pages.changeSlug(id, ownerId, body.slug);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireUser();
    await pages.remove(id, user.id);

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
