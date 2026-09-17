import { ImageResponse } from "next/og";
import { BRAND_COLOR, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;

/** Share card for the marketing site. Business pages generate their own. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#ffffff",
          color: "#16171a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: BRAND_COLOR,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            {SITE_NAME.charAt(0)}
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 600 }}>{SITE_NAME}</div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 980,
          }}
        >
          {SITE_TAGLINE}
        </div>

        <div style={{ display: "flex", fontSize: 30, color: "#64666e" }}>
          Prices, reviews and bookings in one link.
        </div>
      </div>
    ),
    size,
  );
}
