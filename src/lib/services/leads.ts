/**
 * MODULE  services/leads
 *
 * Purpose          Capture and triage customer intent.
 * Responsibilities Resolve the target page, record the lead, tell the owner,
 *                  and build the visitor's follow-up link.
 * Dependencies     repositories, domain, email, format, errors.
 * Extension points This is where a payment link or the renewal-reminder
 *                  engine hooks in once those exist.
 */

import "server-only";

import { after } from "next/server";
import type { Business } from "@/lib/domain/business";
import type { Lead, LeadSubmission } from "@/lib/domain/lead";
import { oneLine, sendEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/env";
import { notFound } from "@/lib/errors";
import { whatsappLink } from "@/lib/format";
import * as businesses from "@/lib/repositories/businesses";
import * as leads from "@/lib/repositories/leads";
import { findOwnerEmail } from "@/lib/repositories/owners";

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

  // An unclaimed page has nobody to tell. Otherwise the email goes out after the
  // response, so a slow or failing provider never delays or breaks the enquiry.
  const { ownerId } = business;
  if (ownerId) after(() => notifyOwner(ownerId, business, lead));

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

/** Never throws: a missed notification must not surface as a failed enquiry. */
async function notifyOwner(ownerId: string, business: Business, lead: Lead): Promise<void> {
  try {
    const to = await findOwnerEmail(ownerId);
    if (!to) return;

    const lines = [
      `New enquiry for ${business.profile.name}`,
      "",
      `Name: ${lead.name}`,
      `Phone: ${lead.phone}`,
      lead.planName ? `Interested in: ${lead.planName}` : null,
      lead.message ? `Message: ${lead.message}` : null,
      "",
      `Reply on WhatsApp: ${whatsappLink(lead.phone, `Hi ${lead.name},`)}`,
      `All enquiries: ${absoluteUrl(`/dashboard/${business.id}`)}`,
    ];

    await sendEmail({
      to,
      subject: `New enquiry from ${oneLine(lead.name)} — ${oneLine(business.profile.name)}`,
      text: lines.filter((line) => line !== null).join("\n"),
    });
  } catch (error) {
    console.error("[leads] owner notification failed", error);
  }
}

export async function listForOwnedBusiness(businessId: string, ownerId: string): Promise<Lead[]> {
  await businesses.findOwned(businessId, ownerId);
  return leads.listForBusiness(businessId);
}

export { markStatus } from "@/lib/repositories/leads";
