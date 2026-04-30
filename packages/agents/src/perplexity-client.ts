/**
 * Perplexity Agent API client (POST /v1/agent).
 *
 * Mirrors the OpenAI helper pattern in `openai-client.ts`:
 *   - structured() runs a strict-JSON-schema-validated agent call
 *   - text() runs a plain text agent call (web_search built-in tool enabled)
 *   - deepResearch() routes to sonar-deep-research for multi-step research jobs
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

/** Default model routing. Override per-call. */
export const PPLX_MODELS = {
  /** Cheap, fast — public-announcement check, simple retrieval. */
  fast: "perplexity/sonar-pro",
  /** Reasoning-heavy — entity research, conflict detection. */
  reason: "perplexity/sonar-reasoning-pro",
  /** Multi-step deep research — dev-time source schema mapping. 1-3 min latency. */
  deep: "perplexity/sonar-deep-research",
  /** Frontier external models routed through the unified API. */
  gpt5: "openai/gpt-5.4",
  claude: "anthropic/claude-opus-4.7",
} as const;

export type PplxModelKey = keyof typeof PPLX_MODELS;

const FEATURE_FLAG = process.env.FEATURE_PERPLEXITY_VALIDATION === "true";
const DAILY_BUDGET = Number(process.env.PERPLEXITY_DAILY_BUDGET_USD ?? "25");

// ─── public errors ─────────────────────────────────────────────────────────

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

// ─── budget guard ──────────────────────────────────────────────────────────

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

// ─── caching ───────────────────────────────────────────────────────────────

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

// ─── core helpers ──────────────────────────────────────────────────────────

export type PplxStructuredArgs<T> = {
  agent: string;                       // e.g. "AssemblyValidator.publicCheck"
  systemPrompt: string;
  user: string;
  schema: ZodSchema<T, ZodTypeDef, unknown>;
  schemaName: string;
  modelKey?: PplxModelKey;
  /** Built-in tools the agent may use. */
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

export type Citation = {
  url: string;
  title?: string;
  snippet?: string;
};

/** Strict-JSON structured agent call with web_search enabled by default. */
export async function structured<T>(args: PplxStructuredArgs<T>): Promise<PplxResult<T>> {
  const start = Date.now();
  const model = PPLX_MODELS[args.modelKey ?? "fast"];

  const key = cacheKey([model, args.schemaName, args.systemPrompt, args.user]);
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

  const tools = (args.tools ?? ["web_search"]).map((t) => ({ type: t }));

  const resp = await callAgent({
    model,
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
  const costUsd = resp.cost_usd ?? estimateCost(model, resp.usage);
  const latencyMs = Date.now() - start;

  await writeCache(key, model, { data: parsed.data, citations, usage: resp.usage, model }, args.cacheTtlDays ?? 7);
  await prisma.agentRun.create({
    data: {
      agent: `Perplexity.${args.agent}`,
      startedAt: new Date(start),
      finishedAt: new Date(),
      status: "ok",
      outputJson: { citations } as never,
      costUsd,
      latencyMs,
    },
  });

  return {
    data: parsed.data,
    citations,
    costUsd,
    latencyMs,
    model,
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
  const model = PPLX_MODELS[args.modelKey ?? "fast"];
  const key = cacheKey([model, "text", args.systemPrompt, args.user]);
  const hit = await readCache<{ text: string; citations: Citation[]; model: string }>(key);
  if (hit) {
    return { ...hit, costUsd: 0, latencyMs: Date.now() - start, cached: true };
  }
  await assertBudget();

  const resp = await callAgent({
    model,
    input: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: args.user },
    ],
    tools: (args.tools ?? ["web_search"]).map((t) => ({ type: t })),
    temperature: args.temperature ?? 0.3,
  });

  const out = resp.output_text?.trim() ?? "";
  const citations = extractCitations(resp);
  const costUsd = resp.cost_usd ?? estimateCost(model, resp.usage);
  const latencyMs = Date.now() - start;

  await writeCache(key, model, { text: out, citations, model }, args.cacheTtlDays ?? 7);
  await prisma.agentRun.create({
    data: {
      agent: `Perplexity.${args.agent}`,
      startedAt: new Date(start),
      finishedAt: new Date(),
      status: "ok",
      outputJson: { citations } as never,
      costUsd,
      latencyMs,
    },
  });

  return { text: out, citations, costUsd, latencyMs, model, cached: false };
}

/** Convenience for dev-time deep-research jobs. */
export async function deepResearch(args: Omit<PplxTextArgs, "modelKey">): Promise<ReturnType<typeof text>> {
  return text({ ...args, modelKey: "deep", temperature: 0.2 });
}

// ─── transport ─────────────────────────────────────────────────────────────

type AgentInput = {
  model: string;
  input: { role: "system" | "user"; content: string }[];
  tools?: { type: string }[];
  temperature?: number;
  response_format?: unknown;
};

type AgentResponse = {
  id: string;
  output_text?: string;
  output?: unknown[];
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  cost_usd?: number;
};

async function callAgent(args: AgentInput): Promise<AgentResponse> {
  // The SDK exposes responses.create() identical to OpenAI's shape — see
  // https://docs.perplexity.ai/docs/agent-api/quickstart
  return (await client.responses.create(args as never)) as unknown as AgentResponse;
}

function extractCitations(resp: AgentResponse): Citation[] {
  const output = resp.output ?? [];
  const cites: Citation[] = [];
  for (const item of output as Array<Record<string, unknown>>) {
    const content = (item as { content?: unknown[] }).content ?? [];
    for (const c of content as Array<Record<string, unknown>>) {
      const annotations = (c as { annotations?: unknown[] }).annotations ?? [];
      for (const a of annotations as Array<{ type?: string; url?: string; title?: string; quote?: string }>) {
        if (a.url) cites.push({ url: a.url, title: a.title, snippet: a.quote });
      }
    }
  }
  return cites;
}

function estimateCost(
  model: string,
  usage?: { input_tokens?: number; output_tokens?: number },
): number {
  if (!usage) return 0;
  const inT = usage.input_tokens ?? 0;
  const outT = usage.output_tokens ?? 0;
  // Approximate Perplexity Agent API pricing (verify with response.cost_usd when available).
  const rate = model.includes("deep-research")
    ? { in: 5, out: 25, search: 0.01 }
    : model.includes("reasoning-pro")
      ? { in: 2, out: 8, search: 0.005 }
      : model.includes("sonar-pro")
        ? { in: 1, out: 5, search: 0.005 }
        : model.startsWith("openai/")
          ? { in: 2.5, out: 10, search: 0 }
          : model.startsWith("anthropic/")
            ? { in: 3, out: 15, search: 0 }
            : { in: 1, out: 3, search: 0.005 };
  return (inT * rate.in + outT * rate.out) / 1_000_000 + rate.search;
}

export const _z = z; // re-export for callers
