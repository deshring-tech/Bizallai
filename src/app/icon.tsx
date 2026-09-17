import { ImageResponse } from "next/og";
import { BRAND_COLOR, SITE_NAME } from "@/lib/site";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Generated rather than committed, so the favicon follows `lib/site` on a rename. */
export default function Icon() {
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
          borderRadius: 7,
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        {SITE_NAME.charAt(0)}
      </div>
    ),
    size,
  );
}
