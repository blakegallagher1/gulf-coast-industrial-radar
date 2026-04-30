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
 * raw model and re-discovering the right tool config.
 *
 * Source: https://docs.perplexity.ai/docs/agent-api/presets (April 2026)
 *
 *   fast-search             → xai/grok-4-1-fast-non-reasoning · 1 step  · web_search
 *   pro-search              → openai/gpt-5.1                  · 3 steps · web_search + fetch_url
 *   deep-research           → openai/gpt-5.2                  · 10 steps · web_search + fetch_url
 *   advanced-deep-research  → anthropic/claude-opus-4-6       · 10 steps · web_search + fetch_url
 */
export const PPLX_PRESETS = {
  /** Cheap, fast — public-announcement check, simple retrieval. */
  fast: "fast-search",
  /** Balanced — most validator calls. Tool access + moderate reasoning. */
  reason: "pro-search",
  /** Multi-step deep research — dev-time source schema mapping. */
  deep: "deep-research",
  /** Institutional-grade research — entity-resolution edge cases. */
  frontier: "advanced-deep-research",
} as const;

export type PplxPresetKey = keyof typeof PPLX_PRESETS;

/**
 * Direct model ids (use only when a preset doesn't fit the use case).
 * Verified against https://docs.perplexity.ai/docs/agent-api/models (April 2026).
 */
export const PPLX_MODELS = {
  perplexity_sonar: "perplexity/sonar",
  gpt5_5: "openai/gpt-5.5",
  gpt5_4: "openai/gpt-5.4",
  gpt5_4_mini: "openai/gpt-5.4-mini",
  gpt5_2: "openai/gpt-5.2",
  gpt5_1: "openai/gpt-5.1",
  claude_opus_4_7: "anthropic/claude-opus-4-7",
  claude_sonnet_4_6: "anthropic/claude-sonnet-4-6",
  gemini_3_1_pro: "google/gemini-3.1-pro-preview",
} as const;

/** Backwards-compat alias for callers using modelKey. Maps to PPLX_PRESETS. */
export type PplxModelKey = PplxPresetKey;

import {
  withRetry,
  checkAgentBudget,
  extractCitations,
  estimateCost,
  type Citation,
  type Usage,
} from "./perplexity-runtime";

export type { Citation } from "./perplexity-runtime";

const FEATURE_FLAG = process.env.FEATURE_PERPLEXITY_VALIDATION === "true";
const DAILY_BUDGET = Number(process.env.PERPLEXITY_DAILY_BUDGET_USD ?? "50");

// ─── public errors ────────────────────────────────────────────────────

export class PerplexityDisabledError extends Error {
  constructor() {
    super("Perplexity validation is disabled (FEATURE_PERPLEXITY_VALIDATION=false)");
    this.name = "PerplexityDisabledError";
  }
}
export class PerplexityBudgetExceededError extends Error {
  spent: number;
  cap: number;
  constructor(spent: number, cap: number) {
    super(`Perplexity daily budget exhausted ($${spent.toFixed(2)} / $${cap.toFixed(2)})`);
    this.name = "PerplexityBudgetExceededError";
    this.spent = spent;
    this.cap = cap;
  }
}

// ─── budget guard ──────────────────────────────────────────────────

async function assertBudget(): Promise<void> {
  if (!FEATURE_FLAG) throw new PerplexityDisabledError();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const today = await prisma.agentRun.aggregate({
    where: { agent: { startsWith: "Perplexity" }, startedAt: { gte: since } },
    _sum: { costUsd: true },
  });
  const spent = today._sum.costUsd ?? 0;
  if (spent >= DAILY_BUDGET) throw new PerplexityBudgetExceededError(spent, DAILY_BUDGET);
}

// ─── caching ─────────────────────────────────────────────────────────────

function cacheKey(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

async function readCache<T>(key: string): Promise<T | null> {
  const row = await prisma.perplexityCache.findUnique({ where: { cacheKey: key } });
  if (!row) return null;
  if (row.expiresAt < new Date()) return null;
  return row.response as T;
}

async function writeCache(key: string, model: string, response: unknown, ttlDays = 7) {
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await prisma.perplexityCache.upsert({
    where: { cacheKey: key },
    update: { response: response as never, model, expiresAt },
    create: { cacheKey: key, response: response as never, model, expiresAt },
  });
}

// ─── core helpers ──────────────────────────────────────────────────

export type PplxStructuredArgs<T> = {
  agent: string;                       // e.g. "AssemblyValidator.publicCheck"
  systemPrompt: string;
  user: string;
  schema: ZodSchema<T, ZodTypeDef, unknown>;
  schemaName: string;
  modelKey?: PplxModelKey;
  /**
   * Raw model id — bypasses preset routing entirely. Use for cheap structured
   * extraction over local data where web search is unnecessary. When set,
   * `modelKey` and `tools` are ignored; the model receives only the system+user
   * messages and produces strict JSON.
   *
   * Accepts either a key from PPLX_MODELS or a literal model id string.
   */
  rawModel?: keyof typeof PPLX_MODELS | (string & {});
  /** Built-in tools the agent may use. Ignored when `rawModel` is set. */
  tools?: ("web_search" | "url_fetch")[];
  /** 0..1 temperature. */
  temperature?: number;
  /** Override 7-day cache TTL. */
  cacheTtlDays?: number;
};

export type PplxResult<T> = {
  data: T;
  citations: Citation[];
  costUsd: number;
  latencyMs: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
};

/** Strict-JSON structured agent call.
 *
 * Routing modes:
 *   - Default: uses the pro-search preset (openai/gpt-5.1 + web_search + fetch_url, 3 steps)
 *   - `modelKey: "fast" | "reason" | "deep" | "frontier"` selects a different preset
 *   - `rawModel: "openai/gpt-5.4-mini"` (or other PPLX_MODELS key) bypasses presets
 *     entirely — no tools, single-turn, cheapest path. Use when you don't need
 *     web search or multi-step reasoning. */
export async function structured<T>(args: PplxStructuredArgs<T>): Promise<PplxResult<T>> {
  const start = Date.now();
  const usingRawModel = args.rawModel != null;
  const preset = usingRawModel
    ? undefined
    : PPLX_PRESETS[args.modelKey ?? "reason"];
  const rawModelId = usingRawModel
    ? (PPLX_MODELS[args.rawModel as keyof typeof PPLX_MODELS] ?? args.rawModel) as string
    : undefined;
  const routingKey = preset ?? rawModelId ?? "unknown";

  const key = cacheKey([routingKey, args.schemaName, args.systemPrompt, args.user]);
  const hit = await readCache<{ data: unknown; citations: Citation[]; usage: unknown; model: string }>(key);
  if (hit) {
    const parsed = args.schema.safeParse(hit.data);
    if (parsed.success) {
      return {
        data: parsed.data,
        citations: hit.citations ?? [],
        costUsd: 0,
        latencyMs: Date.now() - start,
        model: hit.model,
        inputTokens: 0,
        outputTokens: 0,
        cached: true,
      };
    }
  }

  await assertBudget();
  await checkAgentBudget(args.agent.split(".")[0] ?? args.agent);

  // The Agent API "fast-search" preset does NOT support fetch_url; only
  // web_search. Other presets support both. Filter accordingly. Raw-model
  // calls skip tools entirely — they're for pure structured extraction.
  let tools: { type: string }[];
  if (usingRawModel) {
    tools = [];
  } else {
    const allowsFetchUrl = preset !== "fast-search";
    const requestedTools = args.tools ?? ["web_search"];
    tools = requestedTools
      .filter((t) => allowsFetchUrl || t !== "url_fetch")
      .map((t) => ({ type: t === "url_fetch" ? "fetch_url" : t }));
  }

  const resp = await callAgent({
    ...(preset ? { preset } : {}),
    ...(rawModelId ? { model: rawModelId } : {}),
    input: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: args.user },
    ],
    tools,
    temperature: args.temperature ?? 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: args.schemaName,
        schema: zodToJsonSchema(args.schema as ZodSchema),
        strict: true,
      },
    },
  });

  const text = resp.output_text?.trim();
  if (!text) throw new Error(`Perplexity ${args.agent}: empty response`);
  const parsed = args.schema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`Perplexity ${args.agent}: schema mismatch — ${parsed.error.message}`);
  }

  const citations = extractCitations(resp);
  const respModel = (resp.model ?? routingKey) as string;
  const costUsd = resp.cost_usd ?? estimateCost(respModel, resp.usage);
  const latencyMs = Date.now() - start;

  await writeCache(key, respModel, { data: parsed.data, citations, usage: resp.usage, model: respModel }, args.cacheTtlDays ?? 7);
  await prisma.agentRun.create({
    data: {
      agent: `Perplexity.${args.agent}`,
      startedAt: new Date(start),
      finishedAt: new Date(),
      status: "ok",
      outputJson: { citations, routing: usingRawModel ? { rawModel: rawModelId } : { preset } } as never,
      costUsd,
      latencyMs,
    },
  });

  return {
    data: parsed.data,
    citations,
    costUsd,
    latencyMs,
    model: respModel,
    inputTokens: resp.usage?.input_tokens ?? 0,
    outputTokens: resp.usage?.output_tokens ?? 0,
    cached: false,
  };
}

export type PplxTextArgs = Omit<PplxStructuredArgs<string>, "schema" | "schemaName">;

/** Plain-text agent call. Returns markdown + citations. */
export async function text(args: PplxTextArgs): Promise<{
  text: string;
  citations: Citation[];
  costUsd: number;
  latencyMs: number;
  model: string;
  cached: boolean;
}> {
  const start = Date.now();
  const preset = PPLX_PRESETS[args.modelKey ?? "reason"];
  const key = cacheKey([preset, "text", args.systemPrompt, args.user]);
  const hit = await readCache<{ text: string; citations: Citation[]; model: string }>(key);
  if (hit) {
    return { ...hit, costUsd: 0, latencyMs: Date.now() - start, cached: true };
  }
  await assertBudget();

  const allowsFetchUrl = preset !== "fast-search";
  const requestedTools = args.tools ?? ["web_search"];
  const tools = requestedTools
    .filter((t) => allowsFetchUrl || t !== "url_fetch")
    .map((t) => ({ type: t === "url_fetch" ? "fetch_url" : t }));

  const resp = await callAgent({
    preset,
    input: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: args.user },
    ],
    tools,
    temperature: args.temperature ?? 0.3,
  });

  const out = resp.output_text?.trim() ?? "";
  const citations = extractCitations(resp);
  const respModel = (resp.model ?? preset) as string;
  const costUsd = resp.cost_usd ?? estimateCost(respModel, resp.usage);
  const latencyMs = Date.now() - start;

  await writeCache(key, respModel, { text: out, citations, model: respModel }, args.cacheTtlDays ?? 7);
  await prisma.agentRun.create({
    data: {
      agent: `Perplexity.${args.agent}`,
      startedAt: new Date(start),
      finishedAt: new Date(),
      status: "ok",
      outputJson: { citations, preset } as never,
      costUsd,
      latencyMs,
    },
  });

  return { text: out, citations, costUsd, latencyMs: latencyMs, model: respModel, cached: false };
}

/** Convenience for dev-time deep-research jobs (deep-research preset). */
export async function deepResearch(args: Omit<PplxTextArgs, "modelKey">): Promise<ReturnType<typeof text>> {
  return text({ ...args, modelKey: "deep", temperature: 0.2, tools: args.tools ?? ["web_search", "url_fetch"] });
}

// ─── transport ─────────────────────────────────────────────────────────────

/**
 * Agent API request shape. Either `model` OR `preset` must be present;
 * presets bundle a model + tools + step budget per the docs.
 */
type AgentInput = {
  model?: string;
  preset?: string;
  input: { role: "system" | "user"; content: string }[];
  tools?: { type: string }[];
  temperature?: number;
  response_format?: unknown;
};

type AgentResponse = {
  id: string;
  model?: string;
  output_text?: string;
  output?: unknown[];
  usage?: Usage;
  cost_usd?: number;
};

async function callAgent(args: AgentInput): Promise<AgentResponse> {
  // Agent API accepts EITHER model or preset (or both, with preset providing
  // defaults that explicit fields override). https://docs.perplexity.ai/docs/agent-api/presets
  //
  // Wrapped in withRetry so 429/5xx + network blips back off instead of
  // failing the cron tick. The hard daily budget cap remains the safety net.
  const label = args.preset ?? args.model ?? "agent";
  return withRetry(
    async () => (await client.responses.create(args as never)) as unknown as AgentResponse,
    label,
  );
}

export const _z = z; // re-export for callers
