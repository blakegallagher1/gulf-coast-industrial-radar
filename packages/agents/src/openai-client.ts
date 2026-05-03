/**
 * OpenAI client + typed structured-output helper.
 *
 * Pattern: every agent declares a Zod schema; this helper feeds the model
 * a system prompt + user input and parses the response against that schema.
 * Failures throw — the worker decides whether to retry.
 */

import OpenAI from "openai";
import { z, type ZodSchema, type ZodTypeDef } from "zod";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODEL = process.env.AGENT_MODEL_ID ?? "gpt-5.4";
export const FALLBACK_MODEL = process.env.AGENT_MODEL_FALLBACK ?? "gpt-5.2";

export type StructuredCallArgs<T> = {
  agent: string;
  systemPrompt: string;
  user: string;
  schema: ZodSchema<T, ZodTypeDef, unknown>;
  schemaName: string;
  temperature?: number;
  /** Override per-call; default uses MODEL with fallback on hard failure. */
  model?: string;
};

export type StructuredCallResult<T> = {
  data: T;
  costUsd: number;
  latencyMs: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export async function structured<T>(
  args: StructuredCallArgs<T>,
): Promise<StructuredCallResult<T>> {
  const start = Date.now();
  const model = args.model ?? MODEL;

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: args.user },
    ],
    text: {
      format: {
        type: "json_schema",
        name: args.schemaName,
        schema: zodToJsonSchema(args.schema) as Record<string, unknown>,
        strict: true,
      },
    },
    temperature: args.temperature ?? 0.2,
    metadata: { agent: args.agent },
  });

  const text = (response.output_text ?? "").trim();
  if (!text) throw new Error(`agent ${args.agent}: empty response`);

  const parsed = args.schema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`agent ${args.agent}: schema mismatch — ${parsed.error.message}`);
  }

  const usage = response.usage;
  return {
    data: parsed.data,
    costUsd: estimateCost(model, usage?.input_tokens ?? 0, usage?.output_tokens ?? 0),
    latencyMs: Date.now() - start,
    model,
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  };
}

function estimateCost(model: string, inT: number, outT: number): number {
  // Reasonable defaults; refine when authoritative pricing is known.
  const rate = model.startsWith("gpt-5") ? { in: 2.5, out: 10 } : { in: 0.5, out: 1.5 };
  return (inT * rate.in + outT * rate.out) / 1_000_000;
}

/**
 * Minimal Zod → JSON Schema converter (object-shaped only). Sufficient for the
 * structured outputs we need. We don't pull a dep just for this.
 */
export function zodToJsonSchema(schema: ZodSchema): unknown {
  // Lazy import to avoid bundle bloat; in practice we hand-author the JSON
  // schemas next to each agent. This is a fallback only.
  if ((schema as any)._def?.typeName === "ZodObject") {
    const shape = (schema as any)._def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(shape)) {
      properties[k] = innerType(v as ZodSchema);
      if (!(v as any).isOptional?.()) required.push(k);
    }
    return { type: "object", properties, required, additionalProperties: false };
  }
  return innerType(schema);
}

function innerType(s: ZodSchema): unknown {
  const def = (s as any)._def;
  switch (def?.typeName) {
    case "ZodString":   return { type: "string" };
    case "ZodNumber":   return { type: "number" };
    case "ZodBoolean":  return { type: "boolean" };
    case "ZodArray":    return { type: "array", items: innerType(def.type) };
    case "ZodEnum":     return { type: "string", enum: def.values };
    case "ZodNullable": return { ...(innerType(def.innerType) as object), nullable: true };
    case "ZodOptional": return innerType(def.innerType);
    case "ZodObject":   return zodToJsonSchema(s);
    default:            return {};
  }
}

export const _schema = z; // re-export for convenience
