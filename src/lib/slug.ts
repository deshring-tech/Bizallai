/**
 * MODULE  slug
 *
 * Purpose          Allocate the public URL a business lives at.
 * Responsibilities Validate slug shape and resolve collisions against storage.
 * Dependencies     format (slugify), a caller-supplied availability check.
 * Notes            The availability check is injected rather than imported so
 *                  this module stays independent of the storage layer.
 */

import { slugify } from "@/lib/format";

/**
 * Slugs that would shadow application routes or read as first-party pages.
 * Kept here because the constraint belongs to slug allocation, not to routing.
 */
const RESERVED_SLUGS = new Set([
  "about",
  "admin",
  "api",
  "app",
  "apple-icon",
  "auth",
  "billing",
  "claim",
  "create",
  "dashboard",
  "demo",
  "docs",
  "help",
  // Next.js serves generated metadata images at these top-level paths.
  "icon",
  "login",
  "logout",
  "new",
  "opengraph-image",
  "pricing",
  "privacy",
  "settings",
  "signup",
  "support",
  "terms",
  "twitter-image",
  "www",
]);

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/;

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !isReservedSlug(slug);
}

export type SlugAvailabilityCheck = (slug: string) => Promise<boolean>;

/**
 * Derives a usable slug from a business name, appending `-2`, `-3`, … until one
 * is free. Falls back to a random suffix if the name yields nothing usable.
 */
export async function allocateSlug(
  name: string,
  isAvailable: SlugAvailabilityCheck,
  maxAttempts = 25,
): Promise<string> {
  const base = slugify(name) || `page-${randomSuffix()}`;
  const seed = isValidSlug(base) ? base : `${base}-${randomSuffix()}`;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = attempt === 0 ? seed : `${seed}-${attempt + 1}`;
    if (isValidSlug(candidate) && (await isAvailable(candidate))) {
      return candidate;
    }
  }

  return `${seed}-${randomSuffix()}`;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}
