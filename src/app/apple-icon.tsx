import { ImageResponse } from "next/og";
import { BRAND_COLOR, SITE_NAME } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Square with no rounding: iOS applies its own corner mask to home-screen icons. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLOR,
          color: "#ffffff",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        {SITE_NAME.charAt(0)}
      </div>
    ),
    size,
  );
}
