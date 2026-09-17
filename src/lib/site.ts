/**
 * MODULE  site
 *
 * Purpose          Product identity, declared once.
 * Responsibilities Name, tagline, description and brand colour used by page
 *                  metadata, icons, share images and marketing copy.
 * Notes            Pure constants with no environment access, so icon and
 *                  share-image routes can import them without triggering
 *                  configuration validation. Renaming the product is a change
 *                  to this file alone.
 */

export const SITE_NAME = "BizPage";

export const SITE_TAGLINE = "One page where customers can actually book";

export const SITE_DESCRIPTION =
  "Describe your business, get a live page in under a minute. Prices, reviews, bookings and WhatsApp in one link.";

export const BRAND_COLOR = "#1d9e75";
