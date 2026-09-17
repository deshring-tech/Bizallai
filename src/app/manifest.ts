import type { MetadataRoute } from "next";
import { BRAND_COLOR, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * Makes the site installable to a phone's home screen.
 *
 * `start_url` is deliberately omitted so it defaults to the page the install
 * happened on: an owner installing from the dashboard gets the dashboard, and a
 * gym member installing from their gym's page gets that page — not our homepage.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND_COLOR,
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
