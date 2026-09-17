import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatPlanPrice,
  minorUnitDigits,
  normalisePhone,
  slugify,
  toMajor,
  toMinor,
  whatsappLink,
} from "@/lib/format";

describe("money", () => {
  it("uses each currency's real decimal count", () => {
    expect(minorUnitDigits("NPR")).toBe(2);
    expect(minorUnitDigits("USD")).toBe(2);
    expect(minorUnitDigits("JPY")).toBe(0);
  });

  it("round-trips through storage without drift", () => {
    for (const [currency, major] of [
      ["NPR", 3000],
      ["AED", 250],
      ["USD", 15.5],
      ["JPY", 3000],
    ] as const) {
      expect(toMajor(toMinor(major, currency), currency)).toBe(major);
    }
  });

  it("does not inflate a zero-decimal currency", () => {
    // The bug this guards: assuming 100 minor units would store ¥300,000.
    expect(toMinor(3000, "JPY")).toBe(3000);
    expect(formatMoney(3000, "JPY")).toContain("3,000");
  });

  it("stores two-decimal currencies in minor units", () => {
    expect(toMinor(3000, "NPR")).toBe(300_000);
    expect(toMinor(15.5, "USD")).toBe(1550);
    expect(formatMoney(1550, "USD")).toBe("$15.50");
  });

  it("drops the decimals from whole amounts but keeps real fractions", () => {
    // `\s` rather than a space: Intl may separate the symbol with a no-break space.
    expect(formatMoney(350_000, "NPR")).toMatch(/^Rs\s?3,500$/);
    expect(formatMoney(1550, "USD")).toBe("$15.50");
  });

  it("falls back rather than throwing on an unknown currency code", () => {
    expect(formatMoney(1000, "ZZZ")).toContain("ZZZ");
  });

  it("appends the billing period only when there is one", () => {
    const base = { priceMinor: 300_000, highlights: [], featured: false };

    expect(formatPlanPrice({ ...base, name: "Monthly", period: "month" }, "NPR")).toContain(
      "/ month",
    );
    expect(formatPlanPrice({ ...base, name: "Day pass", period: "once" }, "NPR")).not.toContain("/");
  });
});

describe("phone and links", () => {
  it("strips everything a wa.me link cannot carry", () => {
    expect(normalisePhone("+977 (980) 000-0000")).toBe("9779800000000");
  });

  it("builds a wa.me link with an encoded message", () => {
    const link = whatsappLink("+977 9800000000", "Hi there & welcome");

    expect(link).toContain("https://wa.me/9779800000000");
    expect(link).toContain("Hi%20there%20%26%20welcome");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Iron Fit Gym")).toBe("iron-fit-gym");
  });

  it("strips accents rather than dropping the letters", () => {
    expect(slugify("Café Münch")).toBe("cafe-munch");
  });

  it("trims punctuation from the ends", () => {
    expect(slugify("  !!Hello World!!  ")).toBe("hello-world");
  });

  it("collapses characters it cannot represent", () => {
    expect(slugify("योग स्टुडियो")).toBe("");
  });
});
