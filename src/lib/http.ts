/**
 * MODULE  http
 *
 * Purpose          Consistent request parsing and JSON responses for route handlers.
 * Responsibilities Body validation, error serialisation, client identification.
 * Dependencies     zod, errors.
 */

import { NextResponse } from "next/server";
import type { z } from "zod";
import { AppError, badRequest, toAppError } from "@/lib/errors";

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown): NextResponse {
  const appError = toAppError(error);

  if (!(error instanceof AppError)) {
    console.error("[unhandled]", error);
  }

  return NextResponse.json(
    { error: { code: appError.code, message: appError.message, details: appError.details } },
    { status: appError.status },
  );
}

/** Parse and validate a JSON body, converting schema failures into 400s. */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest("Expected a JSON request body.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw badRequest("Some fields need fixing.", flattenIssues(parsed.error));
  }
  return parsed.data;
}

export function flattenIssues(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

/**
 * Best-effort client identifier for rate limiting. Proxy headers are spoofable,
 * so this throttles honest traffic and raises the cost of casual abuse — it is
 * not a security control.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "anonymous";
}
