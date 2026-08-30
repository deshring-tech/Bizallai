/**
 * MODULE  domain/business
 *
 * Purpose          Canonical definition of what a business page *is*.
 * Responsibilities Declare the profile schema, derive types, expose invariants.
 * Dependencies     zod only. This module must stay free of I/O, React and
 *                  storage concerns so it can be imported from any layer.
 * Inputs           Untrusted objects (AI output, API bodies, database rows).
 * Outputs          Parsed, validated domain objects.
 * Extension points New page sections are added as optional fields here; every
 *                  other layer (AI extraction, persistence, rendering) picks
 *                  them up from this one declaration.
 */

import { z } from "zod";

export const BUSINESS_CATEGORIES = [
  "gym",
  "salon",
  "clinic",
  "restaurant",
  "tutoring",
  "studio",
  "freelancer",
  "retail",
  "services",
  "other",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

/** Human labels used in UI copy and AI prompts. Keyed exhaustively. */
export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  gym: "Gym / fitness",
  salon: "Salon / spa",
  clinic: "Clinic / healthcare",
  restaurant: "Restaurant / cafe",
  tutoring: "Tuition / coaching",
  studio: "Dance / martial arts studio",
  freelancer: "Freelancer / consultant",
  retail: "Shop / retail",
  services: "Home / trade services",
  other: "Other",
};

/**
 * Billing period for a plan. `once` covers one-off services (a haircut, a
 * consultation); the recurring periods are what make a business worth keeping.
 */
export const PLAN_PERIODS = ["once", "session", "day", "week", "month", "quarter", "year"] as const;
export type PlanPeriod = (typeof PLAN_PERIODS)[number];

export const PLAN_PERIOD_LABELS: Record<PlanPeriod, string> = {
  once: "",
  session: "/ session",
  day: "/ day",
  week: "/ week",
  month: "/ month",
  quarter: "/ 3 months",
  year: "/ year",
};

const trimmed = (max: number) => z.string().trim().max(max);

export const planSchema = z.object({
  name: trimmed(60).describe("Short plan name, e.g. 'Monthly membership'"),
  /** Minor units (paisa/cents) to keep money in integers end to end. */
  priceMinor: z
    .int()
    .min(0)
    .max(1_000_000_00)
    .describe("Price in the smallest currency unit, e.g. 3000 rupees is 300000"),
  period: z.enum(PLAN_PERIODS).describe("How often the customer pays"),
  description: trimmed(160).optional().describe("One line on what the plan includes"),
  highlights: z.array(trimmed(60)).max(6).default([]).describe("Up to 6 short bullet points"),
  featured: z.boolean().default(false).describe("Marks the plan the business wants to sell most"),
});

export const photoSchema = z.object({
  url: z.url().describe("Publicly reachable image URL"),
  alt: trimmed(120).optional().describe("Accessible description of the image"),
});

export const reviewSchema = z.object({
  author: trimmed(60).describe("Reviewer's display name"),
  rating: z.int().min(1).max(5).describe("Star rating from 1 to 5"),
  text: trimmed(400).describe("The review body"),
});

export const hoursSchema = z.object({
  /** Free text beats a rigid weekday matrix here: owners write "5am–9pm, closed Sat". */
  summary: trimmed(120).describe("Opening hours in plain words, e.g. '5 am - 9 pm, daily'"),
});

export const contactSchema = z.object({
  phone: trimmed(32).optional().describe("Primary phone number in local format"),
  whatsapp: trimmed(32).optional().describe("WhatsApp number, digits and country code only"),
  email: z.email().optional().describe("Contact email address"),
  addressLine: trimmed(160).optional().describe("Street address shown on the page"),
  city: trimmed(60).optional().describe("City or locality"),
  mapUrl: z.url().optional().describe("Google Maps or equivalent link to the location"),
});

/**
 * The profile is the entire editable surface of a page. The AI writes it, the
 * owner edits it, the public page renders it. One shape, three consumers.
 */
export const businessProfileSchema = z.object({
  name: trimmed(80).min(1).describe("The business name as customers know it"),
  category: z.enum(BUSINESS_CATEGORIES).describe("Closest matching business type"),
  tagline: trimmed(120).describe("One short line that says what the business offers"),
  about: trimmed(600).optional().describe("Two or three sentences about the business"),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Expected a 3-letter currency code")
    .default("NPR")
    .describe("ISO 4217 currency code, e.g. NPR, INR, AED, USD"),
  contact: contactSchema.default({}),
  hours: hoursSchema.optional(),
  plans: z.array(planSchema).max(8).default([]),
  photos: z.array(photoSchema).max(24).default([]),
  reviews: z.array(reviewSchema).max(12).default([]),
  /** Single call-to-action label; the button itself is always the trial/booking form. */
  primaryActionLabel: trimmed(32).default("Book a free trial"),
});

export const themeSchema = z.object({
  /** Hex brand colour used for buttons, accents and the featured plan border. */
  brand: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a 6-digit hex colour")
    .default("#1d9e75"),
  mode: z.enum(["light", "dark"]).default("light"),
});

export const BUSINESS_STATUSES = ["draft", "published"] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

/** A persisted page: identity and lifecycle around the profile. */
export const businessSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid().nullable(),
  slug: z.string(),
  status: z.enum(BUSINESS_STATUSES),
  profile: businessProfileSchema,
  theme: themeSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Plan = z.infer<typeof planSchema>;
export type Photo = z.infer<typeof photoSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Business = z.infer<typeof businessSchema>;

/** Input accepted from AI or an editor before defaults are applied. */
export type BusinessProfileInput = z.input<typeof businessProfileSchema>;

/**
 * A page is publishable once a customer could actually act on it: it needs a
 * name, and at least one way to reach the business or something to buy.
 */
export function isPublishable(profile: BusinessProfile): boolean {
  const { contact, plans } = profile;
  const reachable = Boolean(contact.whatsapp || contact.phone || contact.email);
  return profile.name.length > 0 && (reachable || plans.length > 0);
}

export function averageRating(reviews: readonly Review[]): number | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

export function featuredPlan(plans: readonly Plan[]): Plan | null {
  return plans.find((plan) => plan.featured) ?? plans[0] ?? null;
}
