/**
 * budget-report.ts — daily cost rollup of AgentRun rows.
 *
 * Runs every 4 hours (per scheduler in apps/worker/src/index.ts). For each
 * tick:
 *   1. Aggregate today's spend (UTC day) per agent. Agents are namespaced
 *      "Perplexity.<name>" or "OpenAI.<name>" — split out by backend.
 *   2. Compare today's total against PERPLEXITY_DAILY_BUDGET_USD.
 *   3. Log a markdown-friendly table to stdout (analyst-readable).
 *   4. If SLACK_BUDGET_WEBHOOK_URL is set AND total > 75% of cap, post a
 *      single condensed alert. Re-runs in the same UTC day are deduped via
 *      an in-memory `lastSlackPostedDay` flag so we don't spam.
 *
 * Idempotent + side-effect-light: this job only reads + logs + (optionally)
 * fires one webhook per UTC day. No DB writes.
 */

import { prisma } from "@gcir/db";

const DAILY_CAP = Number(process.env.PERPLEXITY_DAILY_BUDGET_USD ?? "50");
const ALERT_THRESHOLD = Number(process.env.BUDGET_ALERT_THRESHOLD ?? "0.75");
const SLACK_URL = process.env.SLACK_BUDGET_WEBHOOK_URL ?? "";

let lastSlackPostedDay: string | null = null;

export type BudgetRow = {
  agent: string;
  backend: "perplexity" | "openai";
  runs: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  errors: number;
};

export type BudgetReport = {
  windowStart: Date;
  totalUsd: number;
  capUsd: number;
  pctOfCap: number;
  rows: BudgetRow[];
};

export async function buildBudgetReport(): Promise<BudgetReport> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  const grouped = await prisma.agentRun.groupBy({
    by: ["agent"],
    where: { startedAt: { gte: since } },
    _sum: { costUsd: true, latencyMs: true },
    _count: { _all: true },
  });

  const errorCounts = await prisma.agentRun.groupBy({
    by: ["agent"],
    where: { startedAt: { gte: since }, status: "error" },
    _count: { _all: true },
  });
  const errorBy = new Map(errorCounts.map((e) => [e.agent, e._count._all]));

  const rows: BudgetRow[] = grouped
    .map((g): BudgetRow => {
      const isPplx = g.agent.startsWith("Perplexity.");
      const isOpenAI = g.agent.startsWith("OpenAI.");
      const backend: "perplexity" | "openai" = isOpenAI ? "openai" : "perplexity";
      const runs = g._count._all;
      const totalLat = g._sum.latencyMs ?? 0;
      return {
        agent: g.agent.replace(/^(Perplexity|OpenAI)\./, ""),
        backend,
        runs,
        totalCostUsd: g._sum.costUsd ?? 0,
        avgLatencyMs: runs > 0 ? totalLat / runs : 0,
        errors: errorBy.get(g.agent) ?? 0,
      };
    })
    .filter((r) => r.runs > 0)
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd);

  const totalUsd = rows.reduce((s, r) => s + r.totalCostUsd, 0);

  return {
    windowStart: since,
    totalUsd,
    capUsd: DAILY_CAP,
    pctOfCap: DAILY_CAP > 0 ? totalUsd / DAILY_CAP : 0,
    rows,
  };
}

export async function tickBudgetReport(): Promise<void> {
  const report = await buildBudgetReport();
  const dayKey = report.windowStart.toISOString().slice(0, 10);

  // ── stdout: markdown-style table for ops grepability
  const header = `[budget] ${dayKey} · $${report.totalUsd.toFixed(2)} / $${report.capUsd.toFixed(2)} (${(report.pctOfCap * 100).toFixed(0)}%)`;
  console.log(header);
  if (report.rows.length === 0) {
    console.log("  (no AgentRun rows yet today)");
    return;
  }
  console.log("  agent                         backend     runs   $       avg ms   errors");
  for (const r of report.rows) {
    const line = [
      `  ${r.agent.padEnd(30)}`,
      `${r.backend.padEnd(10)}`,
      `${String(r.runs).padStart(5)}`,
      `$${r.totalCostUsd.toFixed(3).padStart(7)}`,
      `${Math.round(r.avgLatencyMs).toString().padStart(7)}`,
      `${r.errors > 0 ? `\x1b[33m${r.errors}\x1b[0m` : "0"}`,
    ].join("  ");
    console.log(line);
  }

  // ── Slack alert at >= 75% of cap, deduped per UTC day
  if (
    SLACK_URL &&
    report.pctOfCap >= ALERT_THRESHOLD &&
    lastSlackPostedDay !== dayKey
  ) {
    try {
      await postSlackAlert(report);
      lastSlackPostedDay = dayKey;
    } catch (err) {
      console.warn("[budget] Slack post failed:", (err as Error).message);
    }
  }
}

async function postSlackAlert(report: BudgetReport): Promise<void> {
  const dayKey = report.windowStart.toISOString().slice(0, 10);
  const top = report.rows
    .slice(0, 5)
    .map((r) => `• \`${r.agent}\` (${r.backend}) — $${r.totalCostUsd.toFixed(2)} · ${r.runs} runs`)
    .join("\n");

  const text = [
    `:warning: GCIR Perplexity spend at ${(report.pctOfCap * 100).toFixed(0)}% of daily cap`,
    `*${dayKey} UTC* — \`$${report.totalUsd.toFixed(2)} / $${report.capUsd.toFixed(2)}\``,
    "",
    "Top contributors:",
    top || "(none)",
  ].join("\n");

  const res = await fetch(SLACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`Slack ${res.status} ${res.statusText}`);
  }
}
