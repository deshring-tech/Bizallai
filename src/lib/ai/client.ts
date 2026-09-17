/**
 * MODULE  ai/client
 *
 * Purpose          Single configured Anthropic client and model policy.
 * Responsibilities Client construction, the model and its request defaults,
 *                  the daily AI budget, and tool schemas derived from the
 *                  domain's zod schemas.
 * Dependencies     @anthropic-ai/sdk, zod, env, rate-limit.
 * Notes            Tool schemas are derived, never hand-written. The domain
 *                  schema is the one place a field is declared.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Opus 5 for both jobs: it holds a multi-turn interview, follows "ask two
 * things at a time" reliably, and fills the tool schema accurately from messy
 * real-world input. A few cents per page, for a page that exists for years.
 */
const MODEL = "claude-opus-5";

/**
 * Opus 5 runs safety classifiers that occasionally decline benign requests.
 * With `fallbacks: "default"` the API re-runs a declined request on Anthropic's
 * recommended fallback model inside the same call, instead of handing a refusal
 * to an owner who was only describing their gym.
 */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const DAY_MS = 24 * 60 * 60 * 1000;

export type Message = Anthropic.Beta.BetaMessage;
export type MessageParam = Anthropic.Beta.BetaMessageParam;
export type Tool = Anthropic.Beta.BetaTool;

type RequestParams = Omit<
  Anthropic.Beta.Messages.MessageCreateParamsNonStreaming,
  "model" | "betas" | "fallbacks"
>;

let cached: Anthropic | null = null;

function anthropic(): Anthropic {
  cached ??= new Anthropic({ apiKey: serverEnv().ANTHROPIC_API_KEY });
  return cached;
}

/** Every model call goes through here, so the model and fallbacks are set once. */
export function createMessage(params: RequestParams): Promise<Message> {
  return anthropic().beta.messages.create({
    ...params,
    model: MODEL,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
  });
}

/**
 * A ceiling on model calls across all visitors per UTC day. Per-visitor limits
 * stop one person hammering setup; this stops many addresses doing it together
 * from running up the bill. Set a matching monthly spend limit in the Anthropic
 * console as the final backstop.
 */
export async function enforceAiBudget(): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);

  await enforceRateLimit(`ai:global:${day}`, {
    limit: serverEnv().AI_DAILY_REQUEST_LIMIT,
    windowMs: DAY_MS,
    message: "Page setup is very busy right now. Please try again a little later.",
  });
}

type JsonSchema = Record<string, unknown>;

/**
 * Inlines `$defs`/`$ref` so the emitted schema is self-contained. Tool schemas
 * are small and shallow here, so inlining costs nothing and avoids depending on
 * reference resolution behaviour.
 */
function inlineRefs(node: unknown, defs: Record<string, JsonSchema>, depth = 0): unknown {
  if (depth > 20 || node === null || typeof node !== "object") return node;

  if (Array.isArray(node)) {
    return node.map((item) => inlineRefs(item, defs, depth + 1));
  }

  const source = node as JsonSchema;
  const ref = source["$ref"];

  if (typeof ref === "string") {
    const key = ref.replace(/^#\/\$defs\//, "");
    const target = defs[key];
    if (target) return inlineRefs(target, defs, depth + 1);
  }

  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === "$defs" || key === "$ref" || key === "$schema") continue;
    result[key] = inlineRefs(value, defs, depth + 1);
  }
  return result;
}

/**
 * Converts a zod object schema into a Claude tool `input_schema`.
 * `io: "input"` matters: fields with defaults are optional for the model to
 * supply, which is exactly the behaviour we want during a partial interview.
 */
export function toToolSchema(schema: z.ZodType): Tool["input_schema"] {
  const generated = z.toJSONSchema(schema, { target: "draft-7", io: "input" }) as JsonSchema;
  const defs = (generated["$defs"] as Record<string, JsonSchema> | undefined) ?? {};
  const inlined = inlineRefs(generated, defs) as JsonSchema;

  return { ...inlined, type: "object" };
}

/** Concatenates the text blocks of a response, ignoring tool, thinking and fallback blocks. */
export function textOf(message: Message): string {
  return message.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

/** Returns the input of the first tool call matching `name`, if any. */
export function toolInputOf(message: Message, name: string): unknown {
  const block = message.content.find(
    (item): item is Anthropic.Beta.BetaToolUseBlock =>
      item.type === "tool_use" && item.name === name,
  );
  return block?.input;
}
