/**
 * MODULE  repositories/owners
 *
 * Purpose          Look up page owners' account details.
 * Responsibilities The sign-in email address of a given owner.
 * Dependencies     supabase/server, errors.
 * Security         Auth users are not readable through the public API at all,
 *                  so the service-role key is required. Only call this for the
 *                  owner of a business that server code has already resolved —
 *                  never with an identifier taken from a request.
 */

import "server-only";

import { upstreamFailed } from "@/lib/errors";
import { serviceClient } from "@/lib/supabase/server";

export async function findOwnerEmail(ownerId: string): Promise<string | null> {
  const { data, error } = await serviceClient().auth.admin.getUserById(ownerId);
  if (error) throw upstreamFailed("Could not look up the page owner.");
  return data.user?.email ?? null;
}
