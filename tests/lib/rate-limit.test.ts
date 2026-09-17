import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/rate-limits", () => ({ hitRateLimit: vi.fn() }));

import { enforceLocalRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import { hitRateLimit } from "@/lib/repositories/rate-limits";

const hit = vi.mocked(hitRateLimit);

// The local limiter is module state shared across tests, so every test uses fresh keys.
let sequence = 0;
const freshKey = () => `test:${(sequence += 1)}`;

beforeEach(() => {
  hit.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("enforceRateLimit", () => {
  it("lets a request through when the shared store allows it", async () => {
    hit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });

    await expect(enforceRateLimit(freshKey(), { limit: 5, windowMs: 60_000 })).resolves.toBeUndefined();
  });

  it("passes the window to the store in whole seconds", async () => {
    hit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    const key = freshKey();

    await enforceRateLimit(key, { limit: 5, windowMs: 90_500 });

    expect(hit).toHaveBeenCalledWith(key, 5, 91);
  });

  it("refuses with the store's retry time", async () => {
    hit.mockResolvedValue({ allowed: false, retryAfterSeconds: 42 });

    await expect(enforceRateLimit(freshKey(), { limit: 5, windowMs: 60_000 })).rejects.toMatchObject({
      code: "rate_limited",
      message: expect.stringContaining("42s"),
    });
  });

  it("uses a caller's own message when given one", async () => {
    hit.mockResolvedValue({ allowed: false, retryAfterSeconds: 42 });

    await expect(
      enforceRateLimit(freshKey(), { limit: 5, windowMs: 60_000, message: "Setup is busy." }),
    ).rejects.toMatchObject({ message: "Setup is busy." });
  });

  it("keeps limiting when the shared store is down", async () => {
    // The failure mode that matters: a database outage must not switch limiting off.
    hit.mockRejectedValue(new Error("database unreachable"));
    const key = freshKey();
    const options = { limit: 2, windowMs: 60_000 };

    await expect(enforceRateLimit(key, options)).resolves.toBeUndefined();
    await expect(enforceRateLimit(key, options)).resolves.toBeUndefined();
    await expect(enforceRateLimit(key, options)).rejects.toMatchObject({ code: "rate_limited" });
  });
});

describe("enforceLocalRateLimit", () => {
  it("refuses once the limit is passed, then allows again after the window", () => {
    vi.useFakeTimers();
    const key = freshKey();
    const options = { limit: 1, windowMs: 1_000 };

    enforceLocalRateLimit(key, options);
    expect(() => enforceLocalRateLimit(key, options)).toThrow(/Too many requests/);

    vi.advanceTimersByTime(1_001);
    expect(() => enforceLocalRateLimit(key, options)).not.toThrow();
  });

  it("counts each key separately", () => {
    const options = { limit: 1, windowMs: 60_000 };

    enforceLocalRateLimit(freshKey(), options);
    expect(() => enforceLocalRateLimit(freshKey(), options)).not.toThrow();
  });
});
