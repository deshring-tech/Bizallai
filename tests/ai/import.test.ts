import { describe, expect, it } from "vitest";
import { unsupportedSourceMessage } from "@/lib/ai/import";

/**
 * Social networks send automated visitors to a login page, so an import from
 * them can only fail. Owners should hear that immediately, and be told what
 * works instead.
 */
describe("unsupportedSourceMessage", () => {
  it.each([
    ["https://www.instagram.com/ironfit_ktm/", "Instagram"],
    ["https://instagram.com/ironfit_ktm", "Instagram"],
    ["instagram.com/ironfit_ktm", "Instagram"],
    ["https://m.facebook.com/ironfit", "Facebook"],
    ["https://fb.com/ironfit", "Facebook"],
    ["https://www.tiktok.com/@ironfit", "TikTok"],
  ])("refuses %s and names %s", (url, platform) => {
    expect(unsupportedSourceMessage(url)).toContain(platform);
  });

  it("points the owner at what does work", () => {
    const message = unsupportedSourceMessage("https://instagram.com/x") ?? "";

    expect(message).toContain("website");
    expect(message).toContain("describe");
  });

  it.each([
    "https://ironfit.com.np",
    "ironfit.com.np",
    "https://sites.google.com/view/ironfit",
    // Only the real domains are refused, not names that contain them.
    "https://notinstagram.com/gym",
    "https://instagram.com.example.org/gym",
  ])("allows %s", (url) => {
    expect(unsupportedSourceMessage(url)).toBeNull();
  });

  it("leaves unparseable input to the normal URL validation", () => {
    expect(unsupportedSourceMessage("http://")).toBeNull();
  });
});
