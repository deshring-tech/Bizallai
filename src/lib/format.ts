/**
 * MODULE  format
 *
 * Purpose          Presentation helpers shared by server and client components.
 * Responsibilities Money, phone, slug and share-link formatting.
 * Dependencies     domain/business (types only).
 * Notes            Pure functions, no I/O — safe in both runtimes.
 */

import { PLAN_PERIOD_LABELS, type Plan } from "@/lib/domain/business";

/**
 * How many minor units make one major unit for this currency: 2 for NPR and
 * AED, 0 for JPY and KRW. Asking Intl rather than assuming 100 keeps the
 * conversion correct as the product moves between markets.
 */
export function minorUnitDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/** Editor input (3000) to stored value (300000). */
export function toMinor(majorAmount: number, currency: string): number {
  return Math.round(majorAmount * 10 ** minorUnitDigits(currency));
}

/** Stored value (300000) to editor input (3000). */
export function toMajor(minorAmount: number, currency: string): number {
  return minorAmount / 10 ** minorUnitDigits(currency);
}

/** Money is stored in minor units; Intl places the decimal point per currency. */
export function formatMoney(minorAmount: number, currency: string, locale = "en"): string {
  const major = toMajor(minorAmount, currency);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      // "Rs 3,500" reads better than "Rs 3,500.00"; a real fraction keeps its digits.
      minimumFractionDigits: Number.isInteger(major) ? 0 : minorUnitDigits(currency),
    }).format(major);
  } catch {
    return `${currency} ${major.toLocaleString(locale)}`;
  }
}

export function formatPlanPrice(plan: Plan, currency: string): string {
  const amount = formatMoney(plan.priceMinor, currency);
  const period = PLAN_PERIOD_LABELS[plan.period];
  return period ? `${amount} ${period}` : amount;
}

/** Strips everything a `wa.me` link cannot carry. */
export function normalisePhone(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export function whatsappLink(number: string, message?: string): string {
  const digits = normalisePhone(number);
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}

export function telLink(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, "")}`;
}

/** Turns a business name into a URL-safe slug candidate. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function formatRelativeDate(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
