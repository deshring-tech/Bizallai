import { ImageResponse } from "next/og";
import { averageRating, CATEGORY_LABELS, featuredPlan } from "@/lib/domain/business";
import { formatPlanPrice } from "@/lib/format";
import { findPublishedBySlug } from "@/lib/repositories/businesses";
import { SITE_NAME } from "@/lib/site";
import { isValidSlug } from "@/lib/slug";
import { brandColor, contrastColor } from "@/lib/theme";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Business page preview";
export const revalidate = 3600;

const INK = "#16171a";
const MUTED = "#64666e";

/**
 * The preview WhatsApp and Facebook show when a page link is shared — which is
 * how most customers first meet a business here. A legible card with the name,
 * price and rating is used instead of the cover photo on purpose: previews
 * render small, and a photo cannot say what the business charges.
 */
export default async function BusinessShareImage({ params }: { params: { slug: string } }) {
  const slug = params.slug.toLowerCase();
  const business = isValidSlug(slug) ? await findPublishedBySlug(slug).catch(() => null) : null;

  if (!business) return fallbackCard();

  const { profile } = business;
  const brand = brandColor(business.theme);
  const plan = featuredPlan(profile.plans);
  const rating = averageRating(profile.reviews);

  const details = [
    rating !== null ? `${rating.toFixed(1)} rating (${profile.reviews.length})` : null,
    profile.contact.city ?? null,
    profile.hours?.summary ?? null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff" }}>
        <div style={{ width: 28, height: "100%", background: brand }} />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 600,
                color: brand,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {CATEGORY_LABELS[profile.category]}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontSize: 84,
                fontWeight: 700,
                color: INK,
                lineHeight: 1.05,
                letterSpacing: -2,
              }}
            >
              {truncate(profile.name, 40)}
            </div>
            {profile.tagline ? (
              <div style={{ display: "flex", marginTop: 20, fontSize: 36, color: MUTED }}>
                {truncate(profile.tagline, 80)}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {plan ? (
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: INK }}>
                  {formatPlanPrice(plan, profile.currency)}
                </div>
              ) : null}
              {details ? (
                <div style={{ display: "flex", marginTop: 10, fontSize: 28, color: MUTED }}>
                  {truncate(details, 60)}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                padding: "14px 26px",
                borderRadius: 16,
                background: brand,
                color: contrastColor(brand),
                fontSize: 30,
                fontWeight: 600,
              }}
            >
              {profile.primaryActionLabel}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

/** Unknown or unpublished slug: a neutral card rather than an error image. */
function fallbackCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: INK,
          fontSize: 64,
          fontWeight: 700,
        }}
      >
        {SITE_NAME}
      </div>
    ),
    size,
  );
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
