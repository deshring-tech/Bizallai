import type { Review } from "@/lib/domain/business";

export function Reviews({ reviews }: { reviews: readonly Review[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="px-5 pt-8">
      <h2 className="text-lg font-semibold">What customers say</h2>

      <ul className="mt-3 space-y-3">
        {reviews.map((review, index) => (
          <li key={`${review.author}-${index}`} className="card p-4">
            <div className="flex items-center gap-2">
              <span className="brand-text text-sm" aria-label={`${review.rating} out of 5`}>
                {"★".repeat(review.rating)}
              </span>
              <span className="text-sm font-medium">{review.author}</span>
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[color:var(--color-muted)]">
              {review.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
