/**
 * MODULE  env
 *
 * Purpose          Fail fast and loudly on misconfiguration, at the boundary.
 * Responsibilities Validate and expose environment variables with real types.
 * Dependencies     zod.
 * Notes            `NEXT_PUBLIC_*` variables are referenced by their literal
 *                  names so the Next.js compiler can inline them into client
 *                  bundles. Dynamic lookup (`process.env[key]`) would silently
 *                  yield undefined in the browser.
 */

import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_CONTACT_EMAIL: z.email().optional(),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  // Optional pair: without both, owners are not emailed about new enquiries.
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  /** Most model calls allowed per UTC day, across all visitors. */
  AI_DAILY_REQUEST_LIMIT: z.coerce.number().int().positive().default(1500),
});

function describe(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

const clientParsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  // A blank value in a .env file means "unset", not "invalid email".
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined,
});

if (!clientParsed.success) {
  throw new Error(
    `Missing or invalid public environment variables.\n${describe(clientParsed.error)}\n` +
      `Copy .env.example to .env.local and fill it in.`,
  );
}

export const clientEnv = clientParsed.data;

let cachedServerEnv: z.infer<typeof serverEnvSchema> | null = null;

/**
 * Server-only configuration. Read lazily so that importing a shared module from
 * a client component never trips the server-secret validation.
 */
export function serverEnv(): z.infer<typeof serverEnvSchema> {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    // Blank values in a .env file mean "unset".
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    AI_DAILY_REQUEST_LIMIT: process.env.AI_DAILY_REQUEST_LIMIT || undefined,
  });

  if (!parsed.success) {
    throw new Error(
      `Missing or invalid server environment variables.\n${describe(parsed.error)}`,
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
