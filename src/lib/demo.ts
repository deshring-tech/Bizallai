/**
 * MODULE  demo
 *
 * Purpose          A fictional business for the public /demo page.
 * Responsibilities Show prospects what a finished page looks like before they
 *                  commit to building one.
 * Notes            Parsed through the real domain schema, so the example can
 *                  never drift out of step with what the product can render.
 *                  It deliberately has no phone or WhatsApp number: a demo must
 *                  not ship a dialable number that could belong to a real
 *                  person. The reviews are invented, so the page using this
 *                  must label itself clearly as an example.
 */

import { businessProfileSchema, themeSchema, type Business } from "@/lib/domain/business";

export const DEMO_SLUG = "demo";

export const demoBusiness: Business = {
  id: "00000000-0000-4000-8000-000000000001",
  ownerId: null,
  slug: DEMO_SLUG,
  status: "published",
  profile: businessProfileSchema.parse({
    name: "Summit Strength Gym",
    category: "gym",
    tagline: "Strength and conditioning coaching in Thamel",
    about:
      "A small, coach-led gym for people who want to get genuinely stronger. Every membership includes a technique session in your first week, and our coaches are on the floor at every opening hour.",
    currency: "NPR",
    contact: { addressLine: "Thamel Marg", city: "Kathmandu" },
    hours: { summary: "5 am – 9 pm, closed Saturdays" },
    primaryActionLabel: "Book a free trial",
    plans: [
      {
        name: "Monthly",
        priceMinor: 350_000,
        period: "month",
        description: "Full gym access, any time we are open",
        highlights: ["Coach on the floor", "Locker included"],
      },
      {
        name: "Three months",
        priceMinor: 950_000,
        period: "quarter",
        description: "Our most popular plan",
        highlights: ["Everything in Monthly", "Two personal sessions", "Save Rs 1,000"],
        featured: true,
      },
      {
        name: "Yearly",
        priceMinor: 3_200_000,
        period: "year",
        description: "Best value for committed members",
        highlights: ["Everything in Three months", "Nutrition check-in each quarter"],
      },
    ],
    reviews: [
      {
        author: "Anisha",
        rating: 5,
        text: "The coaches actually fix your form instead of just watching. I deadlift more after four months here than I did in two years elsewhere.",
      },
      {
        author: "Rohan",
        rating: 5,
        text: "Clean, never overcrowded at 6 am, and the trial session made it easy to decide.",
      },
      {
        author: "Prakash",
        rating: 4,
        text: "Great equipment and friendly staff. Wish it opened on Saturdays too.",
      },
    ],
  }),
  theme: themeSchema.parse({ brand: "#c2410c" }),
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
