import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { businessProfileSchema } from "@/lib/domain/business";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";

const STORAGE_KEY = "bizpage:draft:v1";

const profile = businessProfileSchema.parse({
  name: "Iron Fit Gym",
  category: "gym",
  tagline: "Strength training in Thamel",
});

function fakeStorage() {
  const entries = new Map<string, string>();

  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
  };
}

let storage: ReturnType<typeof fakeStorage>;

beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal("window", { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * A draft is the owner's half-finished work. Restoring something malformed is
 * worse than restoring nothing, so every failure path must end in a clean slate.
 */
describe("draft storage", () => {
  const draft = {
    turns: [{ role: "user" as const, content: "I run a gym in Thamel" }],
    profile,
    theme: null,
    importedContext: undefined,
    ready: false,
  };

  it("restores what was saved", () => {
    saveDraft(draft);
    const restored = loadDraft();

    expect(restored?.turns).toEqual(draft.turns);
    expect(restored?.profile?.name).toBe("Iron Fit Gym");
    expect(restored?.ready).toBe(false);
  });

  it("returns null when nothing has been saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("discards a draft older than a week, rather than reopening stale setup", () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, savedAt: eightDaysAgo }));

    expect(loadDraft()).toBeNull();
    expect(storage.entries.has(STORAGE_KEY)).toBe(false);
  });

  it("keeps a draft saved just inside the window", () => {
    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, savedAt: sixDaysAgo }));

    expect(loadDraft()?.profile?.name).toBe("Iron Fit Gym");
  });

  it("discards anything that is not a valid draft", () => {
    for (const stored of [
      "not json at all",
      JSON.stringify({ savedAt: Date.now() }),
      JSON.stringify({ ...draft, savedAt: Date.now(), profile: { name: 123 } }),
      JSON.stringify({ ...draft, savedAt: Date.now(), turns: [{ role: "system", content: "x" }] }),
    ]) {
      storage.setItem(STORAGE_KEY, stored);
      expect(loadDraft(), `should reject: ${stored.slice(0, 40)}`).toBeNull();
    }
  });

  it("clears on request", () => {
    saveDraft(draft);
    clearDraft();

    expect(loadDraft()).toBeNull();
  });

  it("stays silent when storage is unavailable", () => {
    // Private browsing and a full quota both throw on access.
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("storage disabled");
        },
        setItem: () => {
          throw new Error("storage disabled");
        },
        removeItem: () => {
          throw new Error("storage disabled");
        },
      },
    });

    expect(() => saveDraft(draft)).not.toThrow();
    expect(() => clearDraft()).not.toThrow();
    expect(loadDraft()).toBeNull();
  });
});
