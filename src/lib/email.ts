/**
 * MODULE  email
 *
 * Purpose          Send transactional email.
 * Responsibilities One provider call with a timeout, and a clear no-op when
 *                  email is not configured.
 * Dependencies     env.
 * Notes            Resend's HTTP API is called directly: one POST does not
 *                  justify an SDK, and changing provider is a change to this
 *                  file alone. Messages are plain text only — their contents
 *                  come from strangers' form submissions, and plain text cannot
 *                  carry injected markup.
 */

import "server-only";

import { serverEnv } from "@/lib/env";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 8_000;

let warnedUnconfigured = false;

export type Email = { to: string; subject: string; text: string };

/** Returns false, without throwing, when email is not configured. */
export async function sendEmail(email: Email): Promise<boolean> {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv();

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    if (!warnedUnconfigured) {
      console.warn("[email] RESEND_API_KEY or EMAIL_FROM is not set; emails are not being sent.");
      warnedUnconfigured = true;
    }
    return false;
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return true;
}

/** Collapses line breaks so a submitted name cannot add lines to a subject. */
export function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}
