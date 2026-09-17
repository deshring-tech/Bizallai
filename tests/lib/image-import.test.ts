import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/image-import";

const padded = (...values: number[]) => new Uint8Array([...values, ...new Array<number>(16).fill(0)]);
const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));

/**
 * Imported files are typed from their own bytes because the remote server's
 * Content-Type header is under a stranger's control.
 */
describe("sniffImageType", () => {
  it("recognises the photo formats we store", () => {
    expect(sniffImageType(padded(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(padded(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(padded(...ascii("GIF89a")))).toBe("image/gif");
    expect(sniffImageType(padded(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toBe("image/webp");
    expect(sniffImageType(padded(0, 0, 0, 0x20, ...ascii("ftypavif")))).toBe("image/avif");
  });

  it("rejects SVG, even though browsers display it as an image", () => {
    // SVG can carry script, so it must never be stored as a public photo.
    expect(sniffImageType(padded(...ascii('<svg xmlns="http://www.w3.org/2000/svg">')))).toBeNull();
  });

  it("rejects HTML that merely claims to be an image", () => {
    expect(sniffImageType(padded(...ascii("<!doctype html><html>")))).toBeNull();
  });

  it("rejects a RIFF container that is not WebP", () => {
    expect(sniffImageType(padded(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")))).toBeNull();
  });

  it("rejects empty and truncated input", () => {
    expect(sniffImageType(new Uint8Array())).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
