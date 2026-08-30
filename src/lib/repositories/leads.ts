/**
 * MODULE  repositories/leads
 *
 * Purpose          The only module that reads or writes the leads table.
 * Responsibilities Public capture (privileged), owner listing, status updates.
 * Dependencies     supabase/server, domain/lead, errors.
 * Extension points A lead is the pre-payment shape of a transaction; when
 *                  payments land, `markStatus('won')` becomes the hook that
 *                  records the amount collected.
 */

import "server-only";

import type { Lead, LeadStatus, LeadSubmission } from "@/lib/domain/lead";
import { notFound, upstreamFailed } from "@/lib/errors";
import { serviceClient, sessionClient } from "@/lib/supabase/server";
import type { LeadRow } from "@/lib/supabase/types";

const COLUMNS = "id, business_id, name, phone, message, plan_name, kind, status, created_at";

function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    phone: row.phone,
    message: row.message ?? undefined,
    planName: row.plan_name ?? undefined,
    kind: row.kind,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * Capture runs with the service-role key because visitors are anonymous — RLS
 * would otherwise require a public insert policy, which would also let anyone
 * write leads into any business. The caller must have already resolved the
 * target business from a published slug.
 */
export async function capture(businessId: string, submission: LeadSubmission): Promise<Lead> {
  const db = serviceClient();
  const { data, error } = await db
    .from("leads")
    .insert({
      business_id: businessId,
      name: submission.name,
      phone: submission.phone,
      message: submission.message ?? null,
      plan_name: submission.planName ?? null,
      kind: submission.kind,
    })
    .select(COLUMNS)
    .single();

  if (error || !data) throw upstreamFailed("Could not send your request. Please try again.");
  return toLead(data as LeadRow);
}

export async function listForBusiness(businessId: string, limit = 200): Promise<Lead[]> {
  const db = await sessionClient();
  const { data, error } = await db
    .from("leads")
    .select(COLUMNS)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw upstreamFailed("Could not load your leads.");
  return (data ?? []).map((row) => toLead(row as LeadRow));
}

/** RLS restricts this to leads belonging to a business the caller owns. */
export async function markStatus(leadId: string, status: LeadStatus): Promise<Lead> {
  const db = await sessionClient();
  const { data, error } = await db
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .select(COLUMNS)
    .maybeSingle();

  if (error) throw upstreamFailed("Could not update that lead.");
  if (!data) throw notFound("That lead does not exist.");
  return toLead(data as LeadRow);
}

export type LeadCounts = { total: number; new: number };

export async function countsForBusiness(businessId: string): Promise<LeadCounts> {
  const db = await sessionClient();

  const [total, unread] = await Promise.all([
    db.from("leads").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "new"),
  ]);

  if (total.error || unread.error) throw upstreamFailed("Could not load lead counts.");
  return { total: total.count ?? 0, new: unread.count ?? 0 };
}
