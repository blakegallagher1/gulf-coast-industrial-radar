/**
 * Agent backend selector with graceful fallback.
 *
 * Each agent declares its preferred Perplexity routing (preset or rawModel).
 * Two failure modes trigger automatic fallback to OpenAI direct:
 *   1. PerplexityDisabledError (FEATURE_PERPLEXITY_VALIDATION=false)
 *   2. PerplexityBudgetExceededError (daily cap hit)
 *
 * Hard override: setting AGENT_BACKEND_<NAME>=openai (case-insensitive) routes
 * directly to OpenAI without trying Perplexity. Use for agent-specific rollback
 * without redeploying.
 *
 * Telemetry: every call writes an AgentRun row, even when the OpenAI fallback
 * is taken. Distinguishes via the `agent` prefix: "Perplexity.<name>" or
 * "OpenAI.<name>".
 */

import type { ZodSchema, ZodTypeDef } from "zod";
import { prisma } from "@gcir/db";
import * as pplx from "./perplexity-client";
import * as openai from "./openai-client";

export type PerplexityRouting =
  | { preset: pplx.PplxPresetKey; tools?: ("web_search" | "url_fetch")[] }
  | { rawModel: keyof typeof pplx.PPLX_MODELS };

export type BackendArgs<T> = {
  /** Logical agent name, e.g. "DocumentExtraction". */
  agent: string;
  systemPrompt: string;
  user: string;
  schema: ZodSchema<T, ZodTypeDef, unknown>;
  schemaName: string;
  perplexity: PerplexityRouting;
  /** Optional OpenAI model override for fallback. Defaults to AGENT_MODEL_ID. */
  openaiModel?: string;
  temperature?: number;
};

export type BackendResult<T> = {
  data: T;
  costUsd: number;
  latencyMs: number;
  model: string;
  backend: "perplexity" | "openai";
  cached: boolean;
  citations?: pplx.Citation[];
};

/** Hardcoded check for AGENT_BACKEND_<NAME> override. */
function forcedBackend(agent: string): "perplexity" | "openai" | undefined {
  const v = process.env[`AGENT_BACKEND_${agent.toUpperCase()}`]?.toLowerCase();
  if (v === "perplexity" || v === "openai") return v;
  return undefined;
}

export async function callBackend<T>(args: BackendArgs<T>): Promise<BackendResult<T>> {
  const force = forcedBackend(args.agent);
  if (force === "openai") return runOpenAI(args);

  try {
    return await runPerplexity(args);
  } catch (err) {
    // Auto-fall back on disabled or budget-exceeded — these are operational,
    // not bugs. Schema/network errors throw to surface real problems.
    if (
      err instanceof pplx.PerplexityDisabledError ||
      err instanceof pplx.PerplexityBudgetExceededError
    ) {
      console.warn(
        `[backend] ${args.agent} → OpenAI fallback: ${(err as Error).message}`,
      );
      return runOpenAI(args);
    }
    throw err;
  }
}

async function runPerplexity<T>(args: BackendArgs<T>): Promise<BackendResult<T>> {
  const common = {
    agent: args.agent,
    systemPrompt: args.systemPrompt,
    user: args.user,
    schema: args.schema,
    schemaName: args.schemaName,
    temperature: args.temperature,
  };

  if ("preset" in args.perplexity) {
    const r = await pplx.structured({
      ...common,
      modelKey: args.perplexity.preset,
      tools: args.perplexity.tools ?? ["web_search"],
    });
    return {
      data: r.data,
      costUsd: r.costUsd,
      latencyMs: r.latencyMs,
      model: r.model,
      backend: "perplexity",
      cached: r.cached,
      citations: r.citations,
    };
  }

  const r = await pplx.structured({
    ...common,
    rawModel: args.perplexity.rawModel,
  });
  return {
    data: r.data,
    costUsd: r.costUsd,
    latencyMs: r.latencyMs,
    model: r.model,
    backend: "perplexity",
    cached: r.cached,
    citations: r.citations,
  };
}

/** OpenAI fallback path — wraps openai.structured() with AgentRun telemetry
 *  so cost/latency are visible in the same dashboard as Perplexity calls. */
async function runOpenAI<T>(args: BackendArgs<T>): Promise<BackendResult<T>> {
  const start = Date.now();
  try {
    const r = await openai.structured({
      agent: args.agent,
      systemPrompt: args.systemPrompt,
      user: args.user,
      schema: args.schema,
      schemaName: args.schemaName,
      temperature: args.temperature,
      model: args.openaiModel,
    });
    await prisma.agentRun.create({
      data: {
        agent: `OpenAI.${args.agent}`,
        startedAt: new Date(start),
        finishedAt: new Date(),
        status: "ok",
        outputJson: { backend: "openai", model: r.model } as never,
        costUsd: r.costUsd,
        latencyMs: r.latencyMs,
      },
    });
    return {
      data: r.data,
      costUsd: r.costUsd,
      latencyMs: r.latencyMs,
      model: r.model,
      backend: "openai",
      cached: false,
    };
  } catch (err) {
    await prisma.agentRun.create({
      data: {
        agent: `OpenAI.${args.agent}`,
        startedAt: new Date(start),
        finishedAt: new Date(),
        status: "error",
        errorMsg: (err as Error).message,
      },
    });
    throw err;
  }
}
