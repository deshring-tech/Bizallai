"use client";

import type { Plan } from "@/lib/domain/business";
import { formatPlanPrice } from "@/lib/format";

type Props = {
  plans: readonly Plan[];
  currency: string;
  /** Selecting a plan pre-fills the enquiry form, so intent is never lost. */
  onSelect: (plan: Plan) => void;
  actionLabel: string;
};

export function PlanList({ plans, currency, onSelect, actionLabel }: Props) {
  if (plans.length === 0) return null;

  return (
    <section id="plans" className="px-5 pt-8">
      <h2 className="text-lg font-semibold">Pricing</h2>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {plans.map((plan, index) => (
          <li
            key={`${plan.name}-${index}`}
            className={`card p-4 ${plan.featured ? "brand-border border-2" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{plan.name}</p>
                {plan.description ? (
                  <p className="mt-0.5 text-[13px] text-[color:var(--color-muted)]">
                    {plan.description}
                  </p>
                ) : null}
              </div>
              {plan.featured ? (
                <span className="brand-tint brand-text shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">
                  Popular
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-xl font-semibold">{formatPlanPrice(plan, currency)}</p>

            {plan.highlights.length > 0 ? (
              <ul className="mt-2 space-y-1 text-[13px] text-[color:var(--color-muted)]">
                {plan.highlights.map((highlight, position) => (
                  <li key={position}>· {highlight}</li>
                ))}
              </ul>
            ) : null}

            <button
              type="button"
              onClick={() => onSelect(plan)}
              className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 ${
                plan.featured ? "brand-bg" : "border border-[color:var(--color-hairline)]"
              }`}
            >
              {actionLabel}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
