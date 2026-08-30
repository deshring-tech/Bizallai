/**
 * MODULE  repositories/businesses
 *
 * Purpose          The only module that reads or writes the businesses table.
 * Responsibilities Row <-> domain mapping, slug allocation, ownership queries.
 * Dependencies     supabase/server, domain/business, slug, errors.
 * Inputs           Domain objects and identifiers.
 * Outputs          Parsed `Business` values, never raw rows.
 * Extension points Payment records and analytics read from here; keep query
 *                  shapes narrow so new callers do not widen existing ones.
 */

import "server-only";

import {
  businessProfileSchema,
  themeSchema,
  type Business,
  type BusinessProfile,
  type BusinessStatus,
  type Theme,
} from "@/lib/domain/business";
import { conflict, notFound, upstreamFailed } from "@/lib/errors";
import { allocateSlug } from "@/lib/slug";
import { serviceClient, sessionClient, type Db } from "@/lib/supabase/server";
import type { BusinessRow } from "@/lib/supabase/types";

const COLUMNS = "id, owner_id, slug, status, profile, theme, created_at, updated_at";

/**
 * Rows predate schema changes, so profile/theme are parsed leniently: a row
 * missing a newly added field still renders rather than crashing the page.
 */
function toBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    status: row.status,
    profile: businessProfileSchema.parse(row.profile ?? {}),
    theme: themeSchema.parse(row.theme ?? {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Postgres unique-violation, surfaced as a domain conflict. */
function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export async function findPublishedBySlug(slug: string): Promise<Business | null> {
  const db = serviceClient();
  const { data, error } = await db
    .from("businesses")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw upstreamFailed("Could not load that page.");
  return data ? toBusiness(data as BusinessRow) : null;
}

/** Published slugs only — used to build the sitemap. */
export async function listPublishedSlugs(limit = 5_000): Promise<Array<{ slug: string; updatedAt: string }>> {
  const db = serviceClient();
  const { data, error } = await db
    .from("businesses")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw upstreamFailed("Could not list pages.");
  return (data ?? []).map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
}

export async function listByOwner(ownerId: string): Promise<Business[]> {
  const db = await sessionClient();
  const { data, error } = await db
    .from("businesses")
    .select(COLUMNS)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw upstreamFailed("Could not load your pages.");
  return (data ?? []).map((row) => toBusiness(row as BusinessRow));
}

/** Loads a business the caller owns, or throws 404 rather than leaking existence. */
export async function findOwned(id: string, ownerId: string): Promise<Business> {
  const db = await sessionClient();
  const { data, error } = await db
    .from("businesses")
    .select(COLUMNS)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw upstreamFailed("Could not load that page.");
  if (!data) throw notFound("That page does not exist.");
  return toBusiness(data as BusinessRow);
}

export async function isSlugAvailable(slug: string, db: Db = serviceClient()): Promise<boolean> {
  const { data, error } = await db.from("businesses").select("id").eq("slug", slug).maybeSingle();
  if (error) throw upstreamFailed("Could not check that address.");
  return data === null;
}

export type CreateBusinessInput = {
  ownerId: string | null;
  profile: BusinessProfile;
  theme: Theme;
  status?: BusinessStatus;
  /** Optional explicit slug; otherwise derived from the business name. */
  slug?: string;
};

export async function create(input: CreateBusinessInput): Promise<Business> {
  const db = serviceClient();
  const slug = input.slug ?? (await allocateSlug(input.profile.name, (s) => isSlugAvailable(s, db)));

  const { data, error } = await db
    .from("businesses")
    .insert({
      owner_id: input.ownerId,
      slug,
      status: input.status ?? "draft",
      profile: input.profile,
      theme: input.theme,
    })
    .select(COLUMNS)
    .single();

  if (isUniqueViolation(error)) throw conflict("That page address is already taken.");
  if (error || !data) throw upstreamFailed("Could not create the page.");
  return toBusiness(data as BusinessRow);
}

export type UpdateBusinessInput = {
  profile?: BusinessProfile;
  theme?: Theme;
  status?: BusinessStatus;
  slug?: string;
};

/** Ownership is enforced by RLS *and* by the explicit owner_id filter. */
export async function update(
  id: string,
  ownerId: string,
  patch: UpdateBusinessInput,
): Promise<Business> {
  const db = await sessionClient();

  const { data, error } = await db
    .from("businesses")
    .update({
      ...(patch.profile ? { profile: patch.profile } : {}),
      ...(patch.theme ? { theme: patch.theme } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.slug ? { slug: patch.slug } : {}),
    })
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select(COLUMNS)
    .maybeSingle();

  if (isUniqueViolation(error)) throw conflict("That page address is already taken.");
  if (error) throw upstreamFailed("Could not save your changes.");
  if (!data) throw notFound("That page does not exist.");
  return toBusiness(data as BusinessRow);
}

/**
 * Attaches an anonymously created draft to the user who just signed up. Only
 * unclaimed drafts can be adopted, which is what makes create-then-sign-in safe.
 */
export async function claimOwnership(id: string, ownerId: string): Promise<Business | null> {
  const db = serviceClient();
  const { data, error } = await db
    .from("businesses")
    .update({ owner_id: ownerId })
    .eq("id", id)
    .is("owner_id", null)
    .select(COLUMNS)
    .maybeSingle();

  if (error) throw upstreamFailed("Could not link that page to your account.");
  return data ? toBusiness(data as BusinessRow) : null;
}

export async function remove(id: string, ownerId: string): Promise<void> {
  const db = await sessionClient();
  const { error } = await db.from("businesses").delete().eq("id", id).eq("owner_id", ownerId);
  if (error) throw upstreamFailed("Could not delete that page.");
}
