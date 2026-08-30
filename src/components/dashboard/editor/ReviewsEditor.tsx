"use client";

import { Section, TextArea, TextField } from "@/components/ui/Field";
import type { Review } from "@/lib/domain/business";

type Props = {
  reviews: Review[];
  onChange: (reviews: Review[]) => void;
};

const MAX_REVIEWS = 12;

export function ReviewsEditor({ reviews, onChange }: Props) {
  function update(index: number, patch: Partial<Review>): void {
    onChange(
      reviews.map((review, position) => (position === index ? { ...review, ...patch } : review)),
    );
  }

  function remove(index: number): void {
    onChange(reviews.filter((_, position) => position !== index));
  }

  function add(): void {
    onChange([...reviews, { author: "", rating: 5, text: "" }]);
  }

  return (
    <Section
      title="Reviews"
      description="Quote what real customers have told you. These are shown publicly."
    >
      <ul className="space-y-4">
        {reviews.map((review, index) => (
          <li key={index} className="rounded-xl border border-[color:var(--color-hairline)] p-3">
            <div className="space-y-3">
              <TextField
                label="Customer name"
                value={review.author}
                onChange={(author) => update(index, { author })}
                maxLength={60}
              />

              <div>
                <span className="mb-1 block text-[13px] font-medium">Rating</span>
                <div className="flex gap-1" role="group" aria-label="Star rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => update(index, { rating: star })}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      aria-pressed={review.rating === star}
                      className={`text-xl leading-none ${
                        star <= review.rating
                          ? "brand-text"
                          : "text-[color:var(--color-hairline)]"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <TextArea
                label="What they said"
                value={review.text}
                onChange={(text) => update(index, { text })}
                rows={2}
                maxLength={400}
              />
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              className="mt-3 text-[13px] text-red-600 underline underline-offset-2"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {reviews.length < MAX_REVIEWS ? (
        <button
          type="button"
          onClick={add}
          className="w-full rounded-xl border border-dashed border-[color:var(--color-hairline)] px-4 py-2.5 text-[14px] font-medium"
        >
          Add a review
        </button>
      ) : null}
    </Section>
  );
}
