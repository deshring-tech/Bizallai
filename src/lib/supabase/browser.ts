/**
 * MODULE  supabase/browser
 *
 * Purpose          Supabase client for client components (auth flows, uploads).
 * Responsibilities Provide a single shared browser client instance.
 * Dependencies     @supabase/ssr, env.
 */

"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

let cached: SupabaseClient<Database> | null = null;

export function browserClient(): SupabaseClient<Database> {
  cached ??= createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return cached;
}
