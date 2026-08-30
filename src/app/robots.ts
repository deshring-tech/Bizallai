import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/create", "/login", "/auth/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
