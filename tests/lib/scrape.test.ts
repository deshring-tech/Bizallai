import { describe, expect, it } from "vitest";
import { assertPublicUrl, htmlToText } from "@/lib/scrape";

/**
 * The import feature fetches a URL a stranger typed into a form. These are the
 * tests that keep our server from being used as a proxy into private networks.
 */
describe("assertPublicUrl", () => {
  it("accepts an ordinary public https URL", async () => {
    const url = await assertPublicUrl("https://example.com/gym");
    expect(url.hostname).toBe("example.com");
  });

  it("refuses non-http schemes", async () => {
    for (const bad of ["file:///etc/passwd", "ftp://example.com", "javascript:alert(1)"]) {
      await expect(assertPublicUrl(bad)).rejects.toThrow();
    }
  });

  it("refuses loopback and link-local hosts", async () => {
    for (const bad of ["http://localhost/", "http://app.localhost/", "http://svc.internal/"]) {
      await expect(assertPublicUrl(bad)).rejects.toThrow();
    }
  });

  it("refuses private IPv4 literals", async () => {
    for (const bad of [
      "http://127.0.0.1/",
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "http://172.16.0.1/",
      "http://0.0.0.0/",
    ]) {
      await expect(assertPublicUrl(bad)).rejects.toThrow();
    }
  });

  it("refuses the cloud metadata address", async () => {
    // 169.254.169.254 is the classic SSRF target on AWS, GCP and Azure.
    await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow();
  });

  it("refuses IPv6 loopback and unique-local addresses", async () => {
    for (const bad of ["http://[::1]/", "http://[fd00::1]/", "http://[fe80::1]/"]) {
      await expect(assertPublicUrl(bad)).rejects.toThrow();
    }
  });

  it("refuses IPv4-mapped IPv6 addresses that smuggle private space", async () => {
    await expect(assertPublicUrl("http://[::ffff:127.0.0.1]/")).rejects.toThrow();
  });

  it("accepts a public IPv4 literal", async () => {
    const url = await assertPublicUrl("http://93.184.216.34/");
    expect(url.hostname).toBe("93.184.216.34");
  });
});

describe("htmlToText", () => {
  it("removes scripts and styles entirely", () => {
    const html = "<p>Open daily</p><script>steal()</script><style>.a{color:red}</style>";
    const text = htmlToText(html);

    expect(text).toContain("Open daily");
    expect(text).not.toContain("steal");
    expect(text).not.toContain("color:red");
  });

  it("keeps block structure as line breaks", () => {
    expect(htmlToText("<p>One</p><p>Two</p>")).toBe("One\nTwo");
  });

  it("decodes the common entities", () => {
    expect(htmlToText("<p>Gym &amp; Spa &quot;Iron&quot;</p>")).toBe('Gym & Spa "Iron"');
  });

  it("strips tags without leaving markup behind", () => {
    expect(htmlToText('<div class="x"><span>Hi</span></div>')).toBe("Hi");
  });
});
