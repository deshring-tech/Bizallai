/**
 * MODULE  auth
 *
 * Purpose          Express "this action needs a signed-in owner" once.
 * Dependencies     supabase/server, errors.
 */

import "server-only";

import { unauthorized } from "@/lib/errors";
import { currentUser } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null };

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw unauthorized();
  return user;
}

export { currentUser };
