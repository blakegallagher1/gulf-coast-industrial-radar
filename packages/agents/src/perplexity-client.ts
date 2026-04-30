/**
 * Perplexity Agent API client (POST /v1/agent).
 *
 * Verified against docs.perplexity.ai as of 2026-04-30:
 *   - Endpoint:        POST https://api.perplexity.ai/v1/agent
 *   - OpenAI alias:    POST /v1/responses
 *   - SDK call:        client.responses.create({ model OR preset, input, tools, ... })
 *   - Auth:            PERPLEXITY_API_KEY env var, Bearer token
 *   - There is NO /me / user-info endpoint on the public API. Composio's
 *     `current_user_info` 401 is a non-issue — chat completions and the
 *     agent endpoint authenticate fine with the same key.
 *
 * Mirrors the OpenAI helper pattern in `openai-client.ts`:
 *   - structured() runs a strict-JSON-schema-validated agent call
 *   - text() runs a plain text agent call (web_search built-in tool enabled)
 *   - deepResearch() routes through the deep-research preset (10 reasoning
 *     steps, openai/gpt-5.2, web_search + fetch_url) for multi-step research
 *
 * Two layers of caching + budget control:
 *   1. PerplexityCache table (DB) — keyed by sha256(model + prompt fingerprint)
 *      with 7-day TTL. Hit rate goal: >40% on AssemblyValidator calls.
 *   2. PERPLEXITY_DAILY_BUDGET_USD env cap — enforced at the start of every call.
 *
 * Telemetry: every call writes an AgentRun row with model, costUsd, latencyMs.
 */

import { createHash } from "node:crypto";
import { Perplexity } from "@perplexity-ai/perplexity_ai";
import { z, type ZodSchema, type ZodTypeDef } from "zod";
import { prisma } from "@gcir/db";
import { zodToJsonSchema } from "./openai-client";

const client = new Perplexity({
  apiKey: process.env.PERPLEXITY_API_KEY,
});

/**
 * Preset routing for runtime calls. Each key maps to a Perplexity Agent API
 * preset (NOT a model id). The preset bundles a chosen model + tools +
 * step budget + tuned system prompt — better defaults than picking a
 * raw model.
 */
export const PPLX_PRESETS = {
  /** Fast structured extraction — sonar-pro, no web search, 3 reasoning steps */
  structured: "gcir-structured-extraction",
  /** Live web search with sonar-pro (default text tasks) */
  search: "gcir-web-search",
  /** Deep multi-step research — 10 steps, gpt-5.2, web_search + fetch_url */
  deepResearch: "gcir-deep-research",
} as const;

export type PplxPreset = (typeof PPLX_PRESETS)[keyof typeof PPLX_PRESETS];

// ---------------------------------------------------------------------------
// Budget guard
// ---------------------------------------------------------------------------

async function assertBudget(): Promise<void> {
  const cap = parseFloat(process.env.PERPLEXITY_DAILY_BUDGET_USD ?? "5");
  if (!isFinite(cap) || cap <= 0) return; // no cap configured

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const agg = await prisma.agentRun.aggregate({
    _sum: { costUsd: true },
    where: {
      provider: "perplexity",
      createdAt: { gte: today },
    },
  });

  const spent = agg._sum.costUsd?.toNumber() ?? 0;
  if (spent >= cap) {
    throw new Error(
      `Perplexity daily budget exhausted (spent $${spent.toFixed(4)} of $${cap})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function cacheKey(preset: string, prompt: string): string {
  return createHash("sha256").update(`${preset}\0${prompt}`).digest("hex");
}

async function fromCache(key: string): Promise<string | null> {
  const ttl = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const row = await prisma.perplexityCache.findFirst({
    where: { cacheKey: key, createdAt: { gte: ttl } },
  });
  return row?.response ?? null;
}

async function toCache(key: string, response: string): Promise<void> {
  await prisma.perplexityCache.upsert({
    where: { cacheKey: key },
    create: { cacheKey: key, response },
    update: { response, createdAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Core call
// ---------------------------------------------------------------------------

interface CallOptions {
  preset: PplxPreset;
  systemPrompt?: string;
  userPrompt: string;
  /** If provided the response is validated against this schema */
  schema?: ZodSchema<unknown, ZodTypeDef, unknown>;
  /** Skip DB cache (useful for time-sensitive queries) */
  noCache?: boolean;
}

async function call(opts: CallOptions): Promise<string> {
  await assertBudget();

  const key = cacheKey(opts.preset, opts.userPrompt);
  if (!opts.noCache) {
    const cached = await fromCache(key);
    if (cached) return cached;
  }

  const t0 = Date.now();

  const messages: { role: string; content: string }[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  messages.push({ role: "user", content: opts.userPrompt });

  const reqBody: Record<string, unknown> = {
    preset: opts.preset,
    input: messages,
  };

  if (opts.schema) {
    reqBody.text = {
      format: {
        type: "json_schema",
        json_schema: {
          name: "output",
          strict: true,
          schema: zodToJsonSchema(opts.schema),
        },
      },
    };
  }

  // @ts-expect-error — SDK types lag behind API; preset field is valid
  const resp = await client.responses.create(reqBody);

  const latencyMs = Date.now() - t0;
  const text: string = resp.output_text ?? "";
  const costUsd: number = (resp as Record<string, unknown>).usage
    ? ((resp as Record<string, unknown>).usage as Record<string, number>)
        .total_tokens / 1_000_000
    : 0;

  // Telemetry
  await prisma.agentRun.create({
    data: {
      provider: "perplexity",
      model: opts.preset,
      promptTokens:
        (resp.usage as Record<string, number> | undefined)?.input_tokens ?? 0,
      completionTokens:
        (resp.usage as Record<string, number> | undefined)?.output_tokens ?? 0,
      costUsd,
      latencyMs,
    },
  });

  if (!opts.noCache) await toCache(key, text);

  return text;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a structured (JSON-schema validated) agent call.
 *
 * @throws {z.ZodError} if the response doesn't match the schema
 */
export async function structured<T>(
  schema: ZodSchema<T, ZodTypeDef, unknown>,
  userPrompt: string,
  systemPrompt?: string,
): Promise<T> {
  const raw = await call({
    preset: PPLX_PRESETS.structured,
    userPrompt,
    systemPrompt,
    schema,
  });
  return schema.parse(JSON.parse(raw));
}

/**
 * Run a plain-text agent call with web search enabled.
 */
export async function text(
  userPrompt: string,
  systemPrompt?: string,
): Promise<string> {
  return call({
    preset: PPLX_PRESETS.search,
    userPrompt,
    systemPrompt,
  });
}

/**
 * Run a deep-research agent call (multi-step, 10 reasoning steps).
 */
export async function deepResearch(
  userPrompt: string,
  systemPrompt?: string,
): Promise<string> {
  return call({
    preset: PPLX_PRESETS.deepResearch,
    userPrompt,
    systemPrompt,
    noCache: true, // deep research is always fresh
  });
}
