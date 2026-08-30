import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/env";
import { listPublishedSlugs } from "@/lib/repositories/businesses";

export const revalidate = 3_600;

/**
 * Every published page belongs in the sitemap: local search is how these
 * businesses get found, and it is the distribution channel we own for free.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
  ];

  try {
    const pages = await listPublishedSlugs();
    for (const page of pages) {
      entries.push({
        url: absoluteUrl(`/${page.slug}`),
        lastModified: new Date(page.updatedAt),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    // A database hiccup should degrade the sitemap, not break the deployment.
    console.error("[sitemap] could not list pages", error);
  }

  return entries;
}
