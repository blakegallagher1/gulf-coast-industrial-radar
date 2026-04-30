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
 * raw model string.
 *
 * Override at runtime via PERPLEXITY_DEFAULT_PRESET env var.
 */
export const PRESETS = {
  /** Fast, cheap, good for known-schema lookups. ~$0.002/call */
  fast: "fast-research",
  /** Balanced — 3 reasoning steps, web_search enabled. ~$0.005/call */
  balanced: "pro-search",
  /** Deep multi-step research. ~$0.015–0.03/call */
  deep: "deep-research",
} as const;

export type PresetKey = keyof typeof PRESETS;

/** Returns the preset string, honouring the env override. */
export function resolvePreset(key: PresetKey = "balanced"): string {
  const envOverride = process.env.PERPLEXITY_DEFAULT_PRESET;
  if (envOverride && Object.values(PRESETS).includes(envOverride as string)) {
    return envOverride;
  }
  return PRESETS[key];
}

// ---------------------------------------------------------------------------
// Cost budget guard
// ---------------------------------------------------------------------------

async function checkDailyBudget(): Promise<void> {
  const cap = parseFloat(process.env.PERPLEXITY_DAILY_BUDGET_USD ?? "5.00");
  if (!isFinite(cap) || cap <= 0) return; // budget disabled

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  const agg = await prisma.agentRun.aggregate({
    where: { provider: "perplexity", createdAt: { gte: since } },
    _sum: { costUsd: true },
  });

  const spent = agg._sum.costUsd?.toNumber() ?? 0;
  if (spent >= cap) {
    throw new Error(
      `Perplexity daily budget exhausted: $${spent.toFixed(4)} >= cap $${cap.toFixed(2)}`
    );
  }
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function cacheKey(preset: string, prompt: string): string {
  return createHash("sha256")
    .update(`${preset}:${prompt}`)
    .digest("hex")
    .slice(0, 64);
}

async function fromCache(key: string): Promise<string | null> {
  const ttl = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const row = await prisma.perplexityCache.findFirst({
    where: { key, updatedAt: { gte: ttl } },
  });
  return row?.value ?? null;
}

async function toCache(key: string, value: string): Promise<void> {
  await prisma.perplexityCache.upsert({
    where: { key },
    create: { key, value },
    update: { value, updatedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Core call helper
// ---------------------------------------------------------------------------

interface CallOptions {
  preset?: PresetKey;
  systemPrompt?: string;
  /** If true, skip cache read/write (useful for streaming or one-off calls) */
  noCache?: boolean;
  /** Additional tools to enable beyond the preset defaults */
  tools?: Array<{ type: string; [key: string]: unknown }>;
}

async function call(
  userPrompt: string,
  opts: CallOptions = {}
): Promise<string> {
  await checkDailyBudget();

  const preset = resolvePreset(opts.preset);
  const key = cacheKey(preset, userPrompt);

  if (!opts.noCache) {
    const cached = await fromCache(key);
    if (cached) return cached;
  }

  const start = Date.now();

  const messages: Array<{ role: string; content: string }> = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  // The Agent API uses `preset` (not `model`) to select bundled capabilities.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    preset,
    input: messages,
  };
  if (opts.tools?.length) {
    body.tools = opts.tools;
  }

  const response = await (client as any).responses.create(body);

  const latencyMs = Date.now() - start;
  const text: string =
    (response as any).output_text ??
    (response as any).choices?.[0]?.message?.content ??
    "";
  const costUsd: number =
    (response as any).usage?.cost_usd ??
    (response as any).usage?.total_cost ??
    0;

  // Fire-and-forget telemetry
  void prisma.agentRun
    .create({
      data: {
        provider: "perplexity",
        model: preset,
        costUsd,
        latencyMs,
        promptTokens: (response as any).usage?.prompt_tokens ?? 0,
        completionTokens: (response as any).usage?.completion_tokens ?? 0,
      },
    })
    .catch(() => void 0);

  if (!opts.noCache) {
    void toCache(key, text).catch(() => void 0);
  }

  return text;
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/**
 * Run a structured (JSON) agent call and parse the result with a Zod schema.
 *
 * @example
 * const result = await perplexity.structured(
 *   "List the top 3 Gulf Coast refineries",
 *   z.array(z.object({ name: z.string(), barrels: z.number() }))
 * );
 */
export async function structured<T>(
  prompt: string,
  schema: ZodSchema<T, ZodTypeDef, unknown>,
  opts: CallOptions & { retries?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  const jsonSchema = zodToJsonSchema(schema);

  const systemPrompt =
    opts.systemPrompt ??
    `You are a precise JSON extractor. Respond ONLY with valid JSON matching this schema:\n${JSON.stringify(jsonSchema, null, 2)}`;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const raw = await call(prompt, {
      ...opts,
      systemPrompt,
      // Cache miss on retry so we get a fresh response
      noCache: attempt > 0 ? true : opts.noCache,
    });

    // Strip code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as unknown;
      return schema.parse(parsed);
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(
    `perplexity.structured failed after ${retries + 1} attempts: ${String(lastErr)}`
  );
}

/**
 * Run a plain-text agent call (web_search enabled by default via preset).
 *
 * @example
 * const summary = await perplexity.text(
 *   "What are the current crude oil prices in the Gulf Coast region?"
 * );
 */
export async function text(
  prompt: string,
  opts: CallOptions = {}
): Promise<string> {
  return call(prompt, opts);
}

/**
 * Run a deep-research agent call using the deep-research preset.
 * Suitable for multi-step, multi-source research tasks.
 *
 * @example
 * const report = await perplexity.deepResearch(
 *   "Analyze Q1 2026 Gulf Coast refinery utilisation trends"
 * );
 */
export async function deepResearch(
  prompt: string,
  opts: Omit<CallOptions, "preset"> = {}
): Promise<string> {
  return call(prompt, { ...opts, preset: "deep", noCache: true });
}

/**
 * Estimate cost (USD) for a call without making it.
 * Based on Perplexity April 2026 pricing.
 */
export function estimateCost(preset: PresetKey, promptTokens = 500): number {
  // Approximate USD per 1k tokens (input + output blended) per preset
  const rates: Record<PresetKey, number> = {
    fast: 0.0002,
    balanced: 0.0005,
    deep: 0.003,
  };
  return (rates[preset] * promptTokens) / 1000;
}

// Default export for convenience: { structured, text, deepResearch, estimateCost, PRESETS, resolvePreset }
const perplexity = { structured, text, deepResearch, estimateCost, PRESETS, resolvePreset };
export default perplexity;
