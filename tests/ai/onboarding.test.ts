import { describe, expect, it } from "vitest";
import { mergeProfile } from "@/lib/ai/onboarding";
import type { BusinessProfile } from "@/lib/domain/business";

/**
 * `mergeProfile` is the safety net of the whole interview: the model resends
 * the full profile every turn, and any turn where it forgets a field must not
 * erase what the owner already told us.
 */
describe("mergeProfile", () => {
  const known: Partial<BusinessProfile> = {
    name: "Iron Fit Gym",
    category: "gym",
    tagline: "Strength training in Thamel",
    contact: { whatsapp: "+9779800000000", city: "Kathmandu" },
    plans: [{ name: "Monthly", priceMinor: 300000, period: "month", highlights: [], featured: true }],
  };

  it("keeps existing answers when a turn returns nothing", () => {
    const result = mergeProfile(known, {});

    expect(result.name).toBe("Iron Fit Gym");
    expect(result.contact.whatsapp).toBe("+9779800000000");
    expect(result.plans).toHaveLength(1);
  });

  it("lets a later answer overwrite an earlier one", () => {
    const result = mergeProfile(known, { tagline: "Open 5am to 9pm daily" });

    expect(result.tagline).toBe("Open 5am to 9pm daily");
    expect(result.name).toBe("Iron Fit Gym");
  });

  it("ignores empty strings so a blank field never wipes a real value", () => {
    const result = mergeProfile(known, { name: "", tagline: "   " });

    expect(result.name).toBe("Iron Fit Gym");
    expect(result.tagline).toBe("Strength training in Thamel");
  });

  it("ignores empty arrays so a forgotten plan list is not destructive", () => {
    const result = mergeProfile(known, { plans: [] });

    expect(result.plans).toHaveLength(1);
    expect(result.plans[0]?.name).toBe("Monthly");
  });

  it("merges contact fields instead of replacing the whole object", () => {
    const result = mergeProfile(known, { contact: { phone: "01-4444444" } });

    // The new phone lands without losing the WhatsApp number and city.
    expect(result.contact.phone).toBe("01-4444444");
    expect(result.contact.whatsapp).toBe("+9779800000000");
    expect(result.contact.city).toBe("Kathmandu");
  });

  it("replaces a non-empty plan list", () => {
    const result = mergeProfile(known, {
      plans: [
        { name: "Yearly", priceMinor: 2800000, period: "year", highlights: [], featured: false },
      ],
    });

    expect(result.plans).toHaveLength(1);
    expect(result.plans[0]?.name).toBe("Yearly");
  });

  it("always returns a value that satisfies the domain schema", () => {
    const result = mergeProfile({}, {});

    expect(result.currency).toBe("NPR");
    expect(result.primaryActionLabel).toBe("Book a free trial");
    expect(result.plans).toEqual([]);
    expect(result.photos).toEqual([]);
  });

  it("drops undefined and null without touching the base", () => {
    const result = mergeProfile(known, {
      about: undefined,
      tagline: null as unknown as string,
    });

    expect(result.tagline).toBe("Strength training in Thamel");
  });
});
