import { describe, expect, it } from "vitest";
import { isStoredPhotoUrl, keepStoredPhotos, photoPathFromUrl } from "@/lib/photo-url";

const SUPABASE = "https://abc.supabase.co";
const BUCKET_PATH = "/storage/v1/object/public/business-photos";
const OWN = `${SUPABASE}${BUCKET_PATH}/user-1/biz-1/photo.jpg`;

/**
 * This check decides which images may appear on a public page. A false
 * positive either crashes rendering or lets a page embed a tracker.
 */
describe("isStoredPhotoUrl", () => {
  it("accepts a photo in our bucket", () => {
    expect(isStoredPhotoUrl(OWN, SUPABASE)).toBe(true);
  });

  it("rejects third-party images", () => {
    for (const url of [
      "https://scontent.cdninstagram.com/v/t51/photo.jpg",
      "https://ironfit.com.np/images/hero.jpg",
    ]) {
      expect(isStoredPhotoUrl(url, SUPABASE)).toBe(false);
    }
  });

  it("rejects hosts and URLs that only look like ours", () => {
    for (const url of [
      `https://abc.supabase.co.evil.com${BUCKET_PATH}/x.jpg`,
      `https://evil.com/?next=${SUPABASE}${BUCKET_PATH}/x.jpg`,
      `https://evil.com${BUCKET_PATH}/x.jpg`,
      `http://abc.supabase.co${BUCKET_PATH}/x.jpg`,
    ]) {
      expect(isStoredPhotoUrl(url, SUPABASE)).toBe(false);
    }
  });

  it("rejects another bucket in the same project", () => {
    expect(isStoredPhotoUrl(`${SUPABASE}/storage/v1/object/public/private-docs/x.jpg`, SUPABASE)).toBe(
      false,
    );
  });

  it("rejects paths that climb out of the bucket", () => {
    for (const url of [
      `${SUPABASE}${BUCKET_PATH}/%2e%2e/secret.jpg`,
      `${SUPABASE}${BUCKET_PATH}/..%2Fsecret.jpg`,
      `${SUPABASE}${BUCKET_PATH}/`,
    ]) {
      expect(isStoredPhotoUrl(url, SUPABASE)).toBe(false);
    }
  });

  it("rejects malformed input rather than throwing", () => {
    expect(isStoredPhotoUrl("not a url", SUPABASE)).toBe(false);
    expect(isStoredPhotoUrl(`${SUPABASE}${BUCKET_PATH}/%E0%A4%A.jpg`, SUPABASE)).toBe(false);
  });
});

describe("photoPathFromUrl", () => {
  it("returns the object path inside the bucket", () => {
    expect(photoPathFromUrl(OWN, SUPABASE)).toBe("user-1/biz-1/photo.jpg");
  });

  it("decodes encoded characters in the path", () => {
    expect(photoPathFromUrl(`${SUPABASE}${BUCKET_PATH}/imported/my%20photo.jpg`, SUPABASE)).toBe(
      "imported/my photo.jpg",
    );
  });
});

describe("keepStoredPhotos", () => {
  it("drops foreign photos and keeps the order of ours", () => {
    const second = `${SUPABASE}${BUCKET_PATH}/imported/b.png`;
    const photos = [{ url: OWN }, { url: "https://example.com/x.jpg" }, { url: second }];

    expect(keepStoredPhotos(photos, SUPABASE).map((photo) => photo.url)).toEqual([OWN, second]);
  });
});
