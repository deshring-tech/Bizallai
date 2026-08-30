/**
 * MODULE  supabase/server
 *
 * Purpose          Supabase clients for server components, route handlers and
 *                  privileged background work.
 * Responsibilities Wire cookie-based auth for the request-scoped client and
 *                  isolate the service-role client behind an explicit call.
 * Dependencies     @supabase/ssr, next/headers, env.
 * Security         `serviceClient()` bypasses Row Level Security. Only use it
 *                  where the caller has already established authorisation.
 */

import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export type Db = SupabaseClient<Database>;

/**
 * A page render must not hang on a slow database. supabase-js has no request
 * timeout of its own, so one is imposed here — an error surfaces as a handled
 * `upstreamFailed` in the repositories, which is far better than a request that
 * never returns.
 */
const REQUEST_TIMEOUT_MS = 8_000;

const boundedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

/**
 * Request-scoped client that carries the signed-in user's session, so every
 * query is subject to RLS. This is the default for anything user-facing.
 */
export async function sessionClient(): Promise<Db> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { fetch: boundedFetch },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          // Server components cannot mutate cookies; the middleware refreshes
          // sessions instead, so a failure here is expected and safe to skip.
          try {
            for (const { name, value, options } of items) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* handled by middleware */
          }
        },
      },
    },
  );
}

let cachedServiceClient: Db | null = null;

/** Privileged client with no session and no RLS. Server-only, by construction. */
export function serviceClient(): Db {
  if (cachedServiceClient) return cachedServiceClient;

  cachedServiceClient = createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: boundedFetch },
    },
  );

  return cachedServiceClient;
}

/** Returns the signed-in user, or null. Never throws on an absent session. */
export async function currentUser(): Promise<{ id: string; email: string | null } | null> {
  const db = await sessionClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
