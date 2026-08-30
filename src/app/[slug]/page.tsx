/**
 * ROUTE  /[slug] — the published business page.
 *
 * Server-rendered and cached at the edge for a minute: a gym's page changes
 * rarely but may be opened by hundreds of members at once.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BusinessPageView } from "@/components/page/BusinessPageView";
import { ViewBeacon } from "@/components/page/ViewBeacon";
import { averageRating, type Business } from "@/lib/domain/business";
import { absoluteUrl } from "@/lib/env";
import { findPublishedBySlug } from "@/lib/repositories/businesses";
import { isValidSlug } from "@/lib/slug";

export const revalidate = 60;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

async function load(slugParam: string): Promise<Business | null> {
  const slug = slugParam.toLowerCase();
  if (!isValidSlug(slug)) return null;
  return findPublishedBySlug(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await load(slug);

  if (!business) return { title: "Page not found", robots: { index: false, follow: false } };

  const { profile } = business;
  const title = `${profile.name} — ${profile.tagline || profile.contact.city || "Book now"}`;
  const description =
    profile.about ??
    profile.tagline ??
    `Prices, reviews and booking for ${profile.name}${profile.contact.city ? ` in ${profile.contact.city}` : ""}.`;
  const cover = profile.photos[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/${business.slug}`) },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(`/${business.slug}`),
      images: cover ? [{ url: cover }] : undefined,
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params;
  const business = await load(slug);

  if (!business) notFound();

  return (
    <main>
      <StructuredData business={business} />
      <ViewBeacon slug={business.slug} />
      <BusinessPageView business={business} />
    </main>
  );
}

/**
 * LocalBusiness markup so the page can surface in Google's local results —
 * the channel these customers actually arrive through.
 */
function StructuredData({ business }: { business: Business }) {
  const { profile } = business;
  const rating = averageRating(profile.reviews);

  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.name,
    description: profile.about ?? profile.tagline,
    url: absoluteUrl(`/${business.slug}`),
    image: profile.photos.map((photo) => photo.url).slice(0, 5),
    telephone: profile.contact.phone,
    email: profile.contact.email,
    address: profile.contact.addressLine
      ? {
          "@type": "PostalAddress",
          streetAddress: profile.contact.addressLine,
          addressLocality: profile.contact.city,
        }
      : undefined,
    openingHours: profile.hours?.summary,
    aggregateRating:
      rating !== null
        ? {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: profile.reviews.length,
          }
        : undefined,
    makesOffer: profile.plans.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: (plan.priceMinor / 100).toFixed(2),
      priceCurrency: profile.currency,
    })),
  };

  return (
    <script
      type="application/ld+json"
      // `<` is escaped so no field value can close the script element early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
