/**
 * MODULE  services/leads
 *
 * Purpose          Capture and triage customer intent.
 * Responsibilities Resolve the target page, record the lead, build the owner's
 *                  follow-up link.
 * Dependencies     repositories/{businesses,leads}, domain, format, errors.
 * Extension points This is where a payment link, an SMS notification, or the
 *                  renewal-reminder engine hooks in once those exist.
 */

import "server-only";

import type { Lead, LeadSubmission } from "@/lib/domain/lead";
import { notFound } from "@/lib/errors";
import { whatsappLink } from "@/lib/format";
import * as businesses from "@/lib/repositories/businesses";
import * as leads from "@/lib/repositories/leads";

export type CaptureResult = {
  lead: Lead;
  /**
   * Deep link the visitor is offered so the conversation continues where the
   * owner actually reads it. Null when the business has no WhatsApp number.
   */
  whatsappUrl: string | null;
};

/** Capture is keyed by public slug: the caller never supplies a business id. */
export async function captureForSlug(
  slug: string,
  submission: LeadSubmission,
): Promise<CaptureResult> {
  const business = await businesses.findPublishedBySlug(slug);
  if (!business) throw notFound("That page is no longer available.");

  const lead = await leads.capture(business.id, submission);

  const whatsapp = business.profile.contact.whatsapp;
  const whatsappUrl = whatsapp
    ? whatsappLink(
        whatsapp,
        `Hi ${business.profile.name}, I'm ${submission.name}.` +
          (submission.planName ? ` I'm interested in ${submission.planName}.` : ""),
      )
    : null;

  return { lead, whatsappUrl };
}

export async function listForOwnedBusiness(businessId: string, ownerId: string): Promise<Lead[]> {
  await businesses.findOwned(businessId, ownerId);
  return leads.listForBusiness(businessId);
}

export { markStatus } from "@/lib/repositories/leads";
