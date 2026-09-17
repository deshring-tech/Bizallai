import Image from "next/image";
import { averageRating, type BusinessProfile } from "@/lib/domain/business";
import { CATEGORY_LABELS } from "@/lib/domain/business";

type Props = { profile: BusinessProfile };

export function Hero({ profile }: Props) {
  const cover = profile.photos[0];
  const rating = averageRating(profile.reviews);
  const location = [profile.contact.city, profile.contact.addressLine]
    .filter(Boolean)
    .join(" · ");

  return (
    <header>
      {cover ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[21/9]">
          <Image
            src={cover.url}
            alt={cover.alt ?? `${profile.name}`}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
          />
        </div>
      ) : (
        // Without a photo, a thin stripe keeps the brand colour without spending
        // the top of a phone screen on an empty block.
        <div className="brand-bg h-2 w-full" aria-hidden="true" />
      )}

      <div className="px-5 pt-5">
        <p className="brand-text text-xs font-medium tracking-wide uppercase">
          {CATEGORY_LABELS[profile.category]}
        </p>

        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{profile.name}</h1>

        {profile.tagline ? (
          <p className="mt-1.5 text-[15px] text-[color:var(--color-muted)]">{profile.tagline}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[color:var(--color-muted)]">
          {rating !== null ? (
            <span className="flex items-center gap-1">
              <Stars rating={rating} />
              <span className="font-medium text-[color:var(--color-ink)]">{rating.toFixed(1)}</span>
              <span>({profile.reviews.length})</span>
            </span>
          ) : null}
          {location ? <span>{location}</span> : null}
          {profile.hours?.summary ? <span>{profile.hours.summary}</span> : null}
        </div>
      </div>
    </header>
  );
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span aria-hidden="true" className="brand-text tracking-tight">
      {"★".repeat(rounded)}
      <span className="text-[color:var(--color-hairline)]">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}
