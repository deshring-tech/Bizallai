/**
 * ROUTE  GET /auth/callback
 *
 * Completes the email-link sign-in by exchanging the one-time code for a
 * session, then returns the owner to wherever they were headed.
 */

import { NextResponse, type NextRequest } from "next/server";
import { sessionClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const db = await sessionClient();
  const { error } = await db.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=expired_link", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

/** Relative same-site paths only — an attacker-supplied `next` must not leave the site. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
