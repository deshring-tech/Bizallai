/**
 * MODULE  domain/conversation
 *
 * Purpose          The shape of a setup-interview turn.
 * Responsibilities Declare it once for the server and the browser.
 * Dependencies     zod only.
 * Notes            It lives here rather than in `ai/onboarding` because that
 *                  module is server-only, and the browser needs the same
 *                  definition to validate a draft restored from storage.
 */

import { z } from "zod";

export const conversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4_000),
});

export type ConversationTurn = z.infer<typeof conversationTurnSchema>;
