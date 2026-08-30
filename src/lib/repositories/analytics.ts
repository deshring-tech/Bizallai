/**
 * MODULE  repositories/analytics
 *
 * Purpose          The only module that reads or writes page traffic.
 * Responsibilities Record a view, aggregate a business's recent traffic.
 * Dependencies     supabase/server, errors.
 * Notes            Storage is aggregate-only — a per-business daily counter,
 *                  with no visitor identifier of any kind. That is what keeps
 *                  the public page free of cookies and consent obligations.
 * Extension points When payments land, view counts become the denominator of
 *                  the conversion funnel: views to enquiries to money.
 */

import "server-only";

import { upstreamFailed } from "@/lib/errors";
import { serviceClient, sessionClient } from "@/lib/supabase/server";

/**
 * Increment runs through a security-definer function so an anonymous visitor
 * can add to a counter without being granted any table privilege.
 */
export async function recordView(businessId: string): Promise<void> {
  const db = serviceClient();
  const { error } = await db.rpc("record_page_view", { target_business_id: businessId });

  // Traffic counting must never break the visitor's experience, so a failure
  // here is logged and swallowed rather than surfaced.
  if (error) console.error("[analytics] could not record view", error);
}

export type TrafficPoint = { day: string; views: number };

export type Traffic = {
  points: TrafficPoint[];
  total: number;
};

/** Daily view counts for the last `days` days, oldest first. */
export async function trafficForBusiness(businessId: string, days = 30): Promise<Traffic> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const sinceDay = since.toISOString().slice(0, 10);

  const db = await sessionClient();
  const { data, error } = await db
    .from("page_view_days")
    .select("day, views")
    .eq("business_id", businessId)
    .gte("day", sinceDay)
    .order("day", { ascending: true });

  if (error) throw upstreamFailed("Could not load your page traffic.");

  const points = (data ?? []).map((row) => ({ day: row.day, views: row.views }));
  return { points, total: points.reduce((sum, point) => sum + point.views, 0) };
}
