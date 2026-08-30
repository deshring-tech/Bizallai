/**
 * MODULE  ai/client
 *
 * Purpose          Single configured Anthropic client and model policy.
 * Responsibilities Lazy client construction, model selection, tool-schema
 *                  generation from the domain's zod schemas.
 * Dependencies     @anthropic-ai/sdk, zod, env.
 * Notes            Tool schemas are derived, never hand-written. The domain
 *                  schema is the one place a field is declared.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

/**
 * Opus 5 for the interview: it holds a multi-turn conversation, follows the
 * "ask two things at a time" instruction reliably, and fills the tool schema
 * accurately from messy real-world input. Cost per page is a few cents against
 * a page that exists for years.
 */
export const MODEL = "claude-opus-5";

let cached: Anthropic | null = null;

export function anthropic(): Anthropic {
  cached ??= new Anthropic({ apiKey: serverEnv().ANTHROPIC_API_KEY });
  return cached;
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
export function toToolSchema(schema: z.ZodType): Anthropic.Tool.InputSchema {
  const generated = z.toJSONSchema(schema, { target: "draft-7", io: "input" }) as JsonSchema;
  const defs = (generated["$defs"] as Record<string, JsonSchema> | undefined) ?? {};
  const inlined = inlineRefs(generated, defs) as JsonSchema;

  return { ...inlined, type: "object" } as Anthropic.Tool.InputSchema;
}

/** Concatenates the text blocks of a response, ignoring tool and thinking blocks. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

/** Returns the input of the first tool call matching `name`, if any. */
export function toolInputOf(message: Anthropic.Message, name: string): unknown {
  const block = message.content.find(
    (item): item is Anthropic.ToolUseBlock => item.type === "tool_use" && item.name === name,
  );
  return block?.input;
}
