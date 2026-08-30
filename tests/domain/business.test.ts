import { describe, expect, it } from "vitest";
import {
  averageRating,
  businessProfileSchema,
  featuredPlan,
  isPublishable,
} from "@/lib/domain/business";

const base = { name: "Iron Fit Gym", category: "gym", tagline: "Train hard" };

describe("businessProfileSchema", () => {
  it("fills the defaults every consumer relies on", () => {
    const profile = businessProfileSchema.parse(base);

    expect(profile.currency).toBe("NPR");
    expect(profile.primaryActionLabel).toBe("Book a free trial");
    expect(profile.plans).toEqual([]);
    expect(profile.contact).toEqual({});
  });

  it("defaults a plan's optional fields", () => {
    const profile = businessProfileSchema.parse({
      ...base,
      plans: [{ name: "Monthly", priceMinor: 300_000, period: "month" }],
    });

    expect(profile.plans[0]?.highlights).toEqual([]);
    expect(profile.plans[0]?.featured).toBe(false);
  });

  it("rejects a price that is not an integer minor amount", () => {
    const result = businessProfileSchema.safeParse({
      ...base,
      plans: [{ name: "Monthly", priceMinor: 3000.5, period: "month" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unknown category rather than silently coercing it", () => {
    expect(businessProfileSchema.safeParse({ ...base, category: "spaceship" }).success).toBe(false);
  });

  it("rejects a malformed currency code", () => {
    expect(businessProfileSchema.safeParse({ ...base, currency: "RUPEES" }).success).toBe(false);
  });

  it("rejects a review rating outside 1 to 5", () => {
    const result = businessProfileSchema.safeParse({
      ...base,
      reviews: [{ author: "Sunita", rating: 9, text: "Great" }],
    });

    expect(result.success).toBe(false);
  });
});

describe("isPublishable", () => {
  it("allows a page a customer could act on via contact", () => {
    const profile = businessProfileSchema.parse({
      ...base,
      contact: { whatsapp: "+9779800000000" },
    });

    expect(isPublishable(profile)).toBe(true);
  });

  it("allows a page with something to buy", () => {
    const profile = businessProfileSchema.parse({
      ...base,
      plans: [{ name: "Monthly", priceMinor: 300_000, period: "month" }],
    });

    expect(isPublishable(profile)).toBe(true);
  });

  it("blocks a page with no way to act at all", () => {
    expect(isPublishable(businessProfileSchema.parse(base))).toBe(false);
  });
});

describe("averageRating", () => {
  it("is null when there is nothing to average", () => {
    expect(averageRating([])).toBeNull();
  });

  it("rounds to one decimal place", () => {
    const reviews = [4, 5, 5].map((rating) => ({ author: "A", rating, text: "t" }));
    expect(averageRating(reviews)).toBe(4.7);
  });
});

describe("featuredPlan", () => {
  const monthly = { name: "Monthly", priceMinor: 1, period: "month" as const, highlights: [], featured: false };
  const yearly = { name: "Yearly", priceMinor: 2, period: "year" as const, highlights: [], featured: true };

  it("prefers the explicitly featured plan", () => {
    expect(featuredPlan([monthly, yearly])?.name).toBe("Yearly");
  });

  it("falls back to the first plan", () => {
    expect(featuredPlan([monthly])?.name).toBe("Monthly");
  });

  it("is null with no plans", () => {
    expect(featuredPlan([])).toBeNull();
  });
});
