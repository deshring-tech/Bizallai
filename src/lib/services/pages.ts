/**
 * MODULE  services/pages
 *
 * Purpose          Business rules for creating, editing and publishing a page.
 * Responsibilities Authorisation, publish preconditions, slug changes.
 * Dependencies     repositories/businesses, domain/business, errors.
 * Notes            Route handlers and server actions both call this module, so
 *                  a rule can never be enforced in one entry point and missed
 *                  in the other.
 */

import "server-only";

import {
  businessProfileSchema,
  isPublishable,
  themeSchema,
  type Business,
  type BusinessProfile,
  type Theme,
} from "@/lib/domain/business";
import { clientEnv } from "@/lib/env";
import { badRequest, conflict, forbidden } from "@/lib/errors";
import { keepStoredPhotos } from "@/lib/photo-url";
import * as businesses from "@/lib/repositories/businesses";
import { isValidSlug } from "@/lib/slug";

/**
 * Only photos in our own storage may be saved. The browser sends the whole
 * profile, so a crafted request could otherwise put any image URL on a public
 * page — one that breaks rendering, expires, or tracks visitors.
 */
function withStoredPhotosOnly(profile: BusinessProfile): BusinessProfile {
  return {
    ...profile,
    photos: keepStoredPhotos(profile.photos, clientEnv.NEXT_PUBLIC_SUPABASE_URL),
  };
}

/**
 * Creates the page. `ownerId` is null for the anonymous flow: the visitor gets
 * a live draft before signing up, and claims it afterwards. That ordering is
 * deliberate — asking for an account before showing value loses most owners.
 */
export async function createDraft(input: {
  ownerId: string | null;
  profile: BusinessProfile;
  theme?: Theme;
}): Promise<Business> {
  const profile = withStoredPhotosOnly(businessProfileSchema.parse(input.profile));
  return businesses.create({
    ownerId: input.ownerId,
    profile,
    theme: themeSchema.parse(input.theme ?? {}),
    status: "draft",
  });
}

export async function saveProfile(
  id: string,
  ownerId: string,
  patch: { profile?: BusinessProfile; theme?: Theme },
): Promise<Business> {
  await businesses.findOwned(id, ownerId);

  return businesses.update(id, ownerId, {
    ...(patch.profile
      ? { profile: withStoredPhotosOnly(businessProfileSchema.parse(patch.profile)) }
      : {}),
    ...(patch.theme ? { theme: themeSchema.parse(patch.theme) } : {}),
  });
}

/**
 * Publishing is gated on the page being useful, not on it being complete. A gym
 * with a name and a WhatsApp number converts; one that waits for a full profile
 * never goes live.
 */
export async function publish(id: string, ownerId: string): Promise<Business> {
  const business = await businesses.findOwned(id, ownerId);

  if (!isPublishable(business.profile)) {
    throw badRequest(
      "Add a phone or WhatsApp number, or at least one price, before publishing your page.",
    );
  }

  return businesses.update(id, ownerId, { status: "published" });
}

export async function unpublish(id: string, ownerId: string): Promise<Business> {
  await businesses.findOwned(id, ownerId);
  return businesses.update(id, ownerId, { status: "draft" });
}

export async function changeSlug(id: string, ownerId: string, slug: string): Promise<Business> {
  const normalised = slug.trim().toLowerCase();

  if (!isValidSlug(normalised)) {
    throw badRequest(
      "Use 3 to 48 letters, numbers or hyphens. It cannot start or end with a hyphen.",
    );
  }

  await businesses.findOwned(id, ownerId);

  if (!(await businesses.isSlugAvailable(normalised))) {
    throw conflict("That address is already taken. Try another.");
  }

  return businesses.update(id, ownerId, { slug: normalised });
}

/**
 * Links a draft created before sign-up to the account that just signed in.
 * Only unclaimed drafts are adoptable, so this cannot steal another owner's page.
 */
export async function claim(id: string, ownerId: string): Promise<Business> {
  const claimed = await businesses.claimOwnership(id, ownerId);
  if (claimed) return claimed;

  // Already claimed: succeed if it is this user's page, refuse otherwise.
  return businesses.findOwned(id, ownerId).catch(() => {
    throw forbidden("That page already belongs to another account.");
  });
}

export async function remove(id: string, ownerId: string): Promise<void> {
  await businesses.findOwned(id, ownerId);
  await businesses.remove(id, ownerId);
}
