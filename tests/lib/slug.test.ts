import { describe, expect, it } from "vitest";
import { allocateSlug, isReservedSlug, isValidSlug } from "@/lib/slug";

describe("isValidSlug", () => {
  it("accepts ordinary business slugs", () => {
    expect(isValidSlug("ironfit")).toBe(true);
    expect(isValidSlug("iron-fit-gym")).toBe(true);
    expect(isValidSlug("gym2")).toBe(true);
  });

  it("rejects shapes that would look broken in a URL", () => {
    expect(isValidSlug("-leading")).toBe(false);
    expect(isValidSlug("trailing-")).toBe(false);
    expect(isValidSlug("UPPER")).toBe(false);
    expect(isValidSlug("with space")).toBe(false);
    expect(isValidSlug("ab")).toBe(false);
  });

  it("rejects slugs that would shadow an application route", () => {
    // The danger: /dashboard resolving to a business page instead of the app.
    expect(isReservedSlug("dashboard")).toBe(true);
    expect(isValidSlug("dashboard")).toBe(false);
    expect(isValidSlug("login")).toBe(false);
    expect(isValidSlug("api")).toBe(false);
  });
});

describe("allocateSlug", () => {
  const freeAlways = async () => true;

  it("derives the slug from the business name", async () => {
    expect(await allocateSlug("Iron Fit Gym", freeAlways)).toBe("iron-fit-gym");
  });

  it("appends a counter when the name is taken", async () => {
    const taken = new Set(["iron-fit-gym", "iron-fit-gym-2"]);
    const slug = await allocateSlug("Iron Fit Gym", async (s) => !taken.has(s));

    expect(slug).toBe("iron-fit-gym-3");
  });

  it("never hands out a reserved slug", async () => {
    const slug = await allocateSlug("Dashboard", freeAlways);

    expect(isReservedSlug(slug)).toBe(false);
    expect(slug.startsWith("dashboard-")).toBe(true);
  });

  it("still produces a usable slug from a name with no latin characters", async () => {
    const slug = await allocateSlug("योग स्टुडियो", freeAlways);

    expect(isValidSlug(slug)).toBe(true);
  });

  it("gives up gracefully rather than looping forever", async () => {
    const slug = await allocateSlug("Iron Fit", async () => false, 3);

    expect(slug.startsWith("iron-fit")).toBe(true);
    expect(isValidSlug(slug)).toBe(true);
  });
});
