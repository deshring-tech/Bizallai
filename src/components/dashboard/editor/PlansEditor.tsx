"use client";

import { NumberField, Section, SelectField, TextField } from "@/components/ui/Field";
import { PLAN_PERIODS, PLAN_PERIOD_LABELS, type Plan, type PlanPeriod } from "@/lib/domain/business";
import { toMajor, toMinor } from "@/lib/format";

const PERIOD_OPTIONS = PLAN_PERIODS.map((period) => ({
  value: period,
  label: period === "once" ? "One-off payment" : `Per ${period}`,
}));

type Props = {
  plans: Plan[];
  currency: string;
  onChange: (plans: Plan[]) => void;
};

/**
 * Prices are the reason a visitor stays on the page, so this is the section
 * owners edit most. Money is held in minor units in the profile and converted
 * only at this boundary.
 */
export function PlansEditor({ plans, currency, onChange }: Props) {
  function update(index: number, patch: Partial<Plan>): void {
    onChange(plans.map((plan, position) => (position === index ? { ...plan, ...patch } : plan)));
  }

  function remove(index: number): void {
    onChange(plans.filter((_, position) => position !== index));
  }

  /** Only one plan can be the featured one, so setting it clears the others. */
  function setFeatured(index: number): void {
    onChange(plans.map((plan, position) => ({ ...plan, featured: position === index })));
  }

  function add(): void {
    onChange([
      ...plans,
      { name: "", priceMinor: 0, period: "month", highlights: [], featured: plans.length === 0 },
    ]);
  }

  return (
    <Section title="Prices" description="What customers pay for, and how much.">
      {plans.length === 0 ? (
        <p className="text-[13px] text-[color:var(--color-muted)]">
          No prices yet. Pages with prices get far more enquiries than pages without.
        </p>
      ) : null}

      <ul className="space-y-4">
        {plans.map((plan, index) => (
          <li key={index} className="rounded-xl border border-[color:var(--color-hairline)] p-3">
            <div className="space-y-3">
              <TextField
                label="Plan name"
                value={plan.name}
                onChange={(name) => update(index, { name })}
                placeholder="Monthly membership"
                maxLength={60}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="Price"
                  prefix={currency}
                  min={0}
                  step={1}
                  value={toMajor(plan.priceMinor, currency)}
                  onChange={(amount) => update(index, { priceMinor: toMinor(amount, currency) })}
                />

                <SelectField<PlanPeriod>
                  label="Billing"
                  value={plan.period}
                  onChange={(period) => update(index, { period })}
                  options={PERIOD_OPTIONS}
                />
              </div>

              <TextField
                label="Description"
                hint="Optional. One line on what is included."
                value={plan.description ?? ""}
                onChange={(description) => update(index, { description: description || undefined })}
                maxLength={160}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="radio"
                  name="featured-plan"
                  checked={plan.featured}
                  onChange={() => setFeatured(index)}
                />
                Highlight as most popular
              </label>

              <button
                type="button"
                onClick={() => remove(index)}
                className="text-[13px] text-red-600 underline underline-offset-2"
              >
                Remove
              </button>
            </div>

            <p className="mt-2 text-[12px] text-[color:var(--color-muted)]">
              Shows as {formatPreview(plan, currency)}
            </p>
          </li>
        ))}
      </ul>

      {plans.length < 8 ? (
        <button
          type="button"
          onClick={add}
          className="w-full rounded-xl border border-dashed border-[color:var(--color-hairline)] px-4 py-2.5 text-[14px] font-medium"
        >
          Add a price
        </button>
      ) : null}
    </Section>
  );
}

function formatPreview(plan: Plan, currency: string): string {
  const period = PLAN_PERIOD_LABELS[plan.period];
  const amount = `${currency} ${toMajor(plan.priceMinor, currency).toLocaleString()}`;
  return period ? `${amount} ${period}` : amount;
}
