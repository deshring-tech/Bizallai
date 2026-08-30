/**
 * MODULE  domain/lead
 *
 * Purpose          A customer's intent to transact, captured before payments exist.
 * Responsibilities Define lead shape, submission validation, and status lifecycle.
 * Dependencies     zod only.
 * Extension points When payments land, a lead gains an optional `paymentId` and
 *                  the `won` status becomes the point where money is recorded.
 */

import { z } from "zod";

export const LEAD_KINDS = ["trial", "booking", "enquiry", "renewal"] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export const LEAD_STATUSES = ["new", "contacted", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  won: "Joined",
  lost: "Lost",
};

/** What the public page posts. Deliberately tiny — every extra field costs conversions. */
export const leadSubmissionSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  phone: z
    .string()
    .trim()
    .min(6, "Please enter a valid phone number")
    .max(32)
    .regex(/^[+()\d\s-]+$/, "Phone number can only contain digits and + ( ) -"),
  message: z.string().trim().max(400).optional(),
  planName: z.string().trim().max(60).optional(),
  kind: z.enum(LEAD_KINDS).default("trial"),
});

export type LeadSubmission = z.infer<typeof leadSubmissionSchema>;

export const leadSchema = leadSubmissionSchema.extend({
  id: z.uuid(),
  businessId: z.uuid(),
  status: z.enum(LEAD_STATUSES),
  createdAt: z.iso.datetime(),
});

export type Lead = z.infer<typeof leadSchema>;
