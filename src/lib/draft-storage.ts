/**
 * MODULE  draft-storage
 *
 * Purpose          Survive a reload in the middle of setting up a page.
 * Responsibilities Save, restore and clear the browser's copy of a draft.
 * Dependencies     domain schemas, for validation only.
 * Notes            Setup happens on a phone, where a call, a low-memory tab
 *                  eviction or a stray back gesture reloads the page. Without
 *                  this the owner answers every question again, which is where
 *                  people give up. Nothing is stored that the owner has not
 *                  already typed, and it never leaves their browser.
 */

"use client";

import { z } from "zod";
import { businessProfileSchema, themeSchema } from "@/lib/domain/business";
import { conversationTurnSchema } from "@/lib/domain/conversation";

const STORAGE_KEY = "bizpage:draft:v1";

/** Older than this and the owner has moved on; a stale draft is confusing. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const draftSchema = z.object({
  savedAt: z.number(),
  turns: z.array(conversationTurnSchema).max(60),
  profile: businessProfileSchema.nullable(),
  theme: themeSchema.nullable(),
  importedContext: z.string().max(24_000).optional(),
  ready: z.boolean(),
});

export type Draft = z.infer<typeof draftSchema>;

/**
 * Every call is wrapped: storage throws outright in private browsing and when
 * the quota is full. A draft is a convenience, so a failure is silent — it must
 * never break the setup the owner is in the middle of.
 */
export function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = draftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || Date.now() - parsed.data.savedAt > MAX_AGE_MS) {
      clearDraft();
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<Draft, "savedAt">): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    /* private browsing, or storage is full */
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
