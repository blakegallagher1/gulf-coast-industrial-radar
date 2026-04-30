/**
 * Perplexity client runtime helpers — retry + per-agent budget bookkeeping.
 *
 * Split from perplexity-client.ts to keep that file under tool-call payload
 * limits when pushing through the GitHub Composio integration. Pure helpers,
 * no behavior change to the calling layer beyond what helpers add.
 */

import { prisma } from "@gcir/db";

// ─── retry ─────────────────────────────────────────────────────────────────

export const MAX_RETRIES = Number(process.env.PERPLEXITY_MAX_RETRIES ?? "3");
export const RETRY_BASE_MS = 1000;

/** True for HTTP 429, HTTP 5xx, and common transient network errors. */
export function isRetriable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const code = (err as { code?: string })?.code;
  if (status === 429) return true;
  if (status != null && status >= 500 && status < 600) return true;
  if (typeof code === "string" && /^(ECONN|ETIMEDOUT|EAI_AGAIN|ENOTFOUND)/.test(code)) return true;
  return false;
}

/** Jittered exponential backoff: baseMs * 2^attempt * (0.5..1.5). */
export async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetriable(err) || attempt === MAX_RETRIES) throw err;
      const delayMs = Math.round(
        RETRY_BASE_MS * Math.pow(2, attempt) * (0.5 + Math.random()),
      );
      const status = (err as { status?: number }).status ?? "?";
      console.warn(
        `[perplexity:${label}] ${status} — retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

// ─── per-agent budgets ───────────────────────────────────────────────────

/**
 * Per-agent soft budget caps (USD/day). Exceeding the cap WARNS but does not
 * throw — total daily spend is gated by PERPLEXITY_DAILY_BUDGET_USD elsewhere.
 *
 * Set via env JSON, e.g.
 *   PERPLEXITY_AGENT_BUDGETS='{"BriefWriter":5,"EntityResolution":3}'
 */
export const PER_AGENT_BUDGETS: Record<string, number> = (() => {
  try {
    return JSON.parse(process.env.PERPLEXITY_AGENT_BUDGETS ?? "{}");
  } catch {
    console.warn("[perplexity] PERPLEXITY_AGENT_BUDGETS is not valid JSON; ignoring.");
    return {};
  }
})();

/** Soft per-agent cap — warns to stdout but does NOT throw. */
export async function checkAgentBudget(agent: string): Promise<void> {
  const cap = PER_AGENT_BUDGETS[agent];
  if (cap == null) return;
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const today = await prisma.agentRun.aggregate({
    where: { agent: `Perplexity.${agent}`, startedAt: { gte: since } },
    _sum: { costUsd: true },
  });
  const spent = today._sum.costUsd ?? 0;
  if (spent >= cap) {
    console.warn(
      `[perplexity-budget] ${agent} $${spent.toFixed(2)} / cap $${cap.toFixed(2)} — soft cap exceeded, continuing.`,
    );
  }
}

// ─── citation extraction ──────────────────────────────────────────────────

export type Citation = {
  url: string;
  title?: string;
  snippet?: string;
};

type AgentResponseShape = {
  output?: unknown[];
};

export function extractCitations(resp: AgentResponseShape): Citation[] {
  const output = resp.output ?? [];
  const cites: Citation[] = [];
  for (const item of output as Array<Record<string, unknown>>) {
    const content = (item as { content?: unknown[] }).content ?? [];
    for (const c of content as Array<Record<string, unknown>>) {
      const annotations = (c as { annotations?: unknown[] }).annotations ?? [];
      for (const a of annotations as Array<{
        type?: string;
        url?: string;
        title?: string;
        quote?: string;
        snippet?: string;
      }>) {
        if (a.url) cites.push({ url: a.url, title: a.title, snippet: a.quote ?? a.snippet });
      }
    }
  }
  return cites;
}

// ─── cost estimation ────────────────────────────────────────────────────

export type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  cost?: { currency?: string; input_cost?: number; output_cost?: number; total_cost?: number };
};

/**
 * Estimate cost when the server doesn't report it (rare — Perplexity normally
 * returns usage.cost.total_cost). Pricing source:
 *   https://docs.perplexity.ai/docs/agent-api/models  (April 2026)
 *
 * $/1M tokens — verify against docs/agent-api/models when adding new models.
 */
const PRICING: Array<[RegExp, { in: number; out: number }]> = [
  [/^perplexity\/sonar/,                 { in: 0.25, out: 2.50 }],
  [/^anthropic\/claude-opus-4(-7|-6|-5)/,{ in: 5,    out: 25   }],
  [/^anthropic\/claude-sonnet-4/,        { in: 3,    out: 15   }],
  [/^anthropic\/claude-haiku-4/,         { in: 1,    out: 5    }],
  [/^openai\/gpt-5\.5/,                  { in: 5,    out: 30   }],
  [/^openai\/gpt-5\.4-mini/,             { in: 0.75, out: 4.50 }],
  [/^openai\/gpt-5\.4-nano/,             { in: 0.20, out: 1.25 }],
  [/^openai\/gpt-5\.4/,                  { in: 2.50, out: 15   }],
  [/^openai\/gpt-5\.2/,                  { in: 1.75, out: 14   }],
  [/^openai\/gpt-5\.1/,                  { in: 1.25, out: 10   }],
  [/^openai\/gpt-5-mini/,                { in: 0.25, out: 2    }],
  [/^google\/gemini-3\.1-pro/,           { in: 2,    out: 12   }],
  [/^google\/gemini-3-flash/,            { in: 0.50, out: 3    }],
  [/^xai\/grok-4-1-fast/,                { in: 0.50, out: 1.50 }],
  [/^xai\/grok-4\.20-reasoning/,         { in: 2,    out: 6    }],
  [/^nvidia\/nemotron/,                  { in: 0.25, out: 2.50 }],
];

export function estimateCost(model: string, usage?: Usage): number {
  if (!usage) return 0;
  if (usage.cost?.total_cost != null) return usage.cost.total_cost;
  const inT = usage.input_tokens ?? 0;
  const outT = usage.output_tokens ?? 0;
  const match = PRICING.find(([re]) => re.test(model));
  const rate = match ? match[1] : { in: 1, out: 3 };
  return (inT * rate.in + outT * rate.out) / 1_000_000;
}
