/**
 * Perplexity Agent API client (POST /v1/agent).
 *
 * Mirrors the OpenAI helper pattern in `openai-client.ts`:
 *   - structured() runs a strict-JSON-schema-validated agent call
 *   - text() runs a plain text agent call (web_search built-in tool enabled)
 *   - deepResearch() routes to sonar-deep-research for multi-step research jobs
 *
 * Two layers of caching + budget control:
 *   1. PerplexityCache table in Postgres (TTL = PERPLEXITY_CACHE_TTL_DAYS, default 7)
 *   2. Daily cost cap (PERPLEXITY_DAILY_BUDGET_USD, default $5.00) — throws if exceeded
 */

import { PrismaClient } from '@gcir/db';
import crypto from 'crypto';

const DEFAULT_MODEL = 'sonar-pro';
const DEFAULT_DEEP_MODEL = 'sonar-deep-research';
const BASE_URL = 'https://api.perplexity.ai';

const CACHE_TTL_DAYS = parseInt(process.env.PERPLEXITY_CACHE_TTL_DAYS ?? '7', 10);
const DAILY_BUDGET_USD = parseFloat(process.env.PERPLEXITY_DAILY_BUDGET_USD ?? '5.00');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityStructuredOptions<T> {
  model?: string;
  messages: PerplexityMessage[];
  schema: object; // JSON Schema object
  schemaName?: string;
  temperature?: number;
  maxTokens?: number;
  bypassCache?: boolean;
}

export interface PerplexityTextOptions {
  model?: string;
  messages: PerplexityMessage[];
  temperature?: number;
  maxTokens?: number;
  bypassCache?: boolean;
  returnCitations?: boolean;
}

export interface PerplexityDeepResearchOptions {
  prompt: string; // single user prompt
  bypassCache?: boolean;
}

export interface PerplexityResponse<T = string> {
  content: T;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  citations?: string[];
  cachedAt?: Date;
}

// ---------------------------------------------------------------------------
// Cost estimation (sonar-pro public pricing as of 2025-Q1)
// ---------------------------------------------------------------------------

const PRICE_PER_1K: Record<string, { input: number; output: number }> = {
  'sonar-pro': { input: 0.003, output: 0.015 },
  'sonar': { input: 0.001, output: 0.001 },
  'sonar-deep-research': { input: 0.002, output: 0.008 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const prices = PRICE_PER_1K[model] ?? PRICE_PER_1K['sonar-pro'];
  return (promptTokens / 1000) * prices.input + (completionTokens / 1000) * prices.output;
}

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

function cacheKey(input: object): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Daily budget check
// ---------------------------------------------------------------------------

async function checkDailyBudget(db: PrismaClient, estimatedCost: number): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const todaySpend = await db.perplexityCache.aggregate({
    where: { createdAt: { gte: startOfDay } },
    _sum: { costUsd: true },
  });

  const spent = todaySpend._sum.costUsd?.toNumber() ?? 0;
  if (spent + estimatedCost > DAILY_BUDGET_USD) {
    throw new Error(
      `Perplexity daily budget exceeded: $${spent.toFixed(4)} spent, ` +
        `$${DAILY_BUDGET_USD.toFixed(2)} cap. Retry tomorrow or raise PERPLEXITY_DAILY_BUDGET_USD.`
    );
  }
}

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

async function perplexityFetch(
  apiKey: string,
  body: object
): Promise<{ content: string; model: string; usage: any; citations?: string[] }> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Perplexity API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const choice = json.choices?.[0];
  if (!choice) throw new Error('Perplexity returned no choices');

  return {
    content: choice.message?.content ?? '',
    model: json.model ?? body['model'],
    usage: json.usage ?? {},
    citations: json.citations,
  };
}

// ---------------------------------------------------------------------------
// Public client factory
// ---------------------------------------------------------------------------

export function createPerplexityClient(db: PrismaClient) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY is not set');

  // -------------------------------------------------------------------------
  // structured() — JSON-schema-constrained response
  // -------------------------------------------------------------------------
  async function structured<T>(opts: PerplexityStructuredOptions<T>): Promise<PerplexityResponse<T>> {
    const model = opts.model ?? DEFAULT_MODEL;
    const key = cacheKey({ structured: true, model, messages: opts.messages, schema: opts.schema });

    if (!opts.bypassCache) {
      const hit = await db.perplexityCache.findUnique({ where: { cacheKey: key } });
      if (hit && hit.expiresAt > new Date()) {
        return {
          content: hit.responseJson as T,
          model: hit.model,
          usage: {
            promptTokens: hit.promptTokens,
            completionTokens: hit.completionTokens,
            totalTokens: hit.promptTokens + hit.completionTokens,
            estimatedCostUsd: 0,
          },
          cachedAt: hit.createdAt,
        };
      }
    }

    const raw = await perplexityFetch(apiKey, {
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 4096,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: opts.schemaName ?? 'response',
          strict: true,
          schema: opts.schema,
        },
      },
    });

    const parsed: T = JSON.parse(raw.content);
    const cost = estimateCost(model, raw.usage.prompt_tokens ?? 0, raw.usage.completion_tokens ?? 0);
    await checkDailyBudget(db, cost);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await db.perplexityCache.upsert({
      where: { cacheKey: key },
      create: {
        cacheKey: key,
        model,
        requestJson: { messages: opts.messages, schema: opts.schema },
        responseJson: parsed as object,
        promptTokens: raw.usage.prompt_tokens ?? 0,
        completionTokens: raw.usage.completion_tokens ?? 0,
        costUsd: cost,
        expiresAt,
      },
      update: {
        responseJson: parsed as object,
        promptTokens: raw.usage.prompt_tokens ?? 0,
        completionTokens: raw.usage.completion_tokens ?? 0,
        costUsd: cost,
        expiresAt,
      },
    });

    return {
      content: parsed,
      model: raw.model,
      usage: {
        promptTokens: raw.usage.prompt_tokens ?? 0,
        completionTokens: raw.usage.completion_tokens ?? 0,
        totalTokens: (raw.usage.prompt_tokens ?? 0) + (raw.usage.completion_tokens ?? 0),
        estimatedCostUsd: cost,
      },
    };
  }

  // -------------------------------------------------------------------------
  // text() — plain text response with optional citations
  // -------------------------------------------------------------------------
  async function text(opts: PerplexityTextOptions): Promise<PerplexityResponse<string>> {
    const model = opts.model ?? DEFAULT_MODEL;
    const key = cacheKey({ text: true, model, messages: opts.messages });

    if (!opts.bypassCache) {
      const hit = await db.perplexityCache.findUnique({ where: { cacheKey: key } });
      if (hit && hit.expiresAt > new Date()) {
        return {
          content: String(hit.responseJson),
          model: hit.model,
          usage: {
            promptTokens: hit.promptTokens,
            completionTokens: hit.completionTokens,
            totalTokens: hit.promptTokens + hit.completionTokens,
            estimatedCostUsd: 0,
          },
          cachedAt: hit.createdAt,
        };
      }
    }

    const raw = await perplexityFetch(apiKey, {
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 4096,
      ...(opts.returnCitations ? { web_search_options: { search_recency_filter: 'month' } } : {}),
    });

    const cost = estimateCost(model, raw.usage.prompt_tokens ?? 0, raw.usage.completion_tokens ?? 0);
    await checkDailyBudget(db, cost);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await db.perplexityCache.upsert({
      where: { cacheKey: key },
      create: {
        cacheKey: key,
        model,
        requestJson: { messages: opts.messages },
        responseJson: raw.content,
        promptTokens: raw.usage.prompt_tokens ?? 0,
        completionTokens: raw.usage.completion_tokens ?? 0,
        costUsd: cost,
        expiresAt,
      },
      update: {
        responseJson: raw.content,
        promptTokens: raw.usage.prompt_tokens ?? 0,
        completionTokens: raw.usage.completion_tokens ?? 0,
        costUsd: cost,
        expiresAt,
      },
    });

    return {
      content: raw.content,
      model: raw.model,
      usage: {
        promptTokens: raw.usage.prompt_tokens ?? 0,
        completionTokens: raw.usage.completion_tokens ?? 0,
        totalTokens: (raw.usage.prompt_tokens ?? 0) + (raw.usage.completion_tokens ?? 0),
        estimatedCostUsd: cost,
      },
      citations: raw.citations,
    };
  }

  // -------------------------------------------------------------------------
  // deepResearch() — sonar-deep-research, single user prompt
  // -------------------------------------------------------------------------
  async function deepResearch(opts: PerplexityDeepResearchOptions): Promise<PerplexityResponse<string>> {
    const model = DEFAULT_DEEP_MODEL;
    const key = cacheKey({ deep: true, prompt: opts.prompt });

    if (!opts.bypassCache) {
      const hit = await db.perplexityCache.findUnique({ where: { cacheKey: key } });
      if (hit && hit.expiresAt > new Date()) {
        return {
          content: String(hit.responseJson),
          model: hit.model,
          usage: {
            promptTokens: hit.promptTokens,
            completionTokens: hit.completionTokens,
            totalTokens: hit.promptTokens + hit.completionTokens,
            estimatedCostUsd: 0,
          },
          cachedAt: hit.createdAt,
        };
      }
    }

    const raw = await perplexityFetch(apiKey, {
      model,
      messages: [{ role: 'user', content: opts.prompt }],
      temperature: 0.2,
      max_tokens: 8192,
    });

    const cost = estimateCost(model, raw.usage.prompt_tokens ?? 0, raw.usage.completion_tokens ?? 0);
    await checkDailyBudget(db, cost);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await db.perplexityCache.upsert({
      where: { cacheKey: key },
      create: {
        cacheKey: key,
        model,
        requestJson: { prompt: opts.prompt },
        responseJson: raw.content,
        promptTokens: raw.usage.prompt_tokens ?? 0,
        completionTokens: raw.usage.completion_tokens ?? 0,
        costUsd: cost,
        expiresAt,
      },
      update: {
        responseJson: raw.content,
        promptTokens: raw.usage.prompt_tokens ?? 0,
        completionTokens: raw.usage.completion_tokens ?? 0,
        costUsd: cost,
        expiresAt,
      },
    });

    return {
      content: raw.content,
      model: raw.model,
      usage: {
        promptTokens: raw.usage.prompt_tokens ?? 0,
        completionTokens: raw.usage.completion_tokens ?? 0,
        totalTokens: (raw.usage.prompt_tokens ?? 0) + (raw.usage.completion_tokens ?? 0),
        estimatedCostUsd: cost,
      },
      citations: raw.citations,
    };
  }

  return { structured, text, deepResearch };
}

export type PerplexityClient = ReturnType<typeof createPerplexityClient>;
