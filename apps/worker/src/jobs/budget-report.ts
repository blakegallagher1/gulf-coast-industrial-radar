/**
 * budget-report.ts — daily cost rollup of AgentRun rows.
 *
 * Runs every 4 hours (per scheduler in apps/worker/src/index.ts). For each
 * tick:
 *   1. Aggregate today's spend (UTC day) per agent. Agents are namespaced
 *      "Perplexity.<name>" or "OpenAI.<name>" — split out by backend.
 *   2. Compare today's total against PERPLEXITY_DAILY_BUDGET_USD.
 *   3. Log a markdown-friendly table to stdout (analyst-readable).
 *   4. If RESEND_API_KEY + BUDGET_ALERT_TO_EMAIL are set AND total >=
 *      BUDGET_ALERT_THRESHOLD (default 0.75 = 75% of cap), send a single
 *      condensed email per UTC day. Re-runs in the same day are deduped
 *      via an in-memory `lastEmailedDay` flag so we don't spam.
 *
 * Push channel: email is the right tool for budget alerts — they're
 * "I should be aware" signals, not "drop everything" pages. Once-a-day
 * cadence keeps the inbox clean. The /admin/runs page surfaces the same
 * info as a pull channel (red banner at top when the day is over cap).
 *
 * Idempotent + side-effect-light: this job only reads + logs + (optionally)
 * sends one email per UTC day. No DB writes.
 */

import { prisma } from "@gcir/db";

const DAILY_CAP = Number(process.env.PERPLEXITY_DAILY_BUDGET_USD ?? "50");
const ALERT_THRESHOLD = Number(process.env.BUDGET_ALERT_THRESHOLD ?? "0.75");
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const ALERT_TO_EMAIL = process.env.BUDGET_ALERT_TO_EMAIL ?? "";
const ALERT_FROM_EMAIL = process.env.BRIEF_FROM_EMAIL ??
  "Gulf Coast Industrial Radar <radar@gallagherpropco.com>";

let lastEmailedDay: string | null = null;

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

  // ── Email alert at >= 75% of cap, deduped per UTC day
  const canEmail = RESEND_API_KEY && ALERT_TO_EMAIL;
  if (canEmail && report.pctOfCap >= ALERT_THRESHOLD && lastEmailedDay !== dayKey) {
    try {
      await postEmailAlert(report);
      lastEmailedDay = dayKey;
    } catch (err) {
      console.warn("[budget] email send failed:", (err as Error).message);
    }
  }
}

/**
 * Send a budget-alert email via the Resend HTTP API. Direct fetch (no SDK
 * dep) — same lightweight pattern as the worker's other transport-style calls.
 *
 * One email per UTC day, capped by `lastEmailedDay`. Subject carries the
 * percentage so it's scannable in an inbox; HTML body has the table of top
 * contributors so you can decide whether to act without opening /admin/runs.
 */
async function postEmailAlert(report: BudgetReport): Promise<void> {
  const dayKey = report.windowStart.toISOString().slice(0, 10);
  const pct = (report.pctOfCap * 100).toFixed(0);
  const subject = `[GCIR] Perplexity spend at ${pct}% of daily cap (${dayKey} UTC)`;

  const topRows = report.rows
    .slice(0, 5)
    .map((r) => {
      const cost = `$${r.totalCostUsd.toFixed(2)}`;
      const backendLabel = r.backend === "perplexity" ? "Perplexity" : "OpenAI";
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;font-family:monospace">${escapeHtml(r.agent)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;color:#666">${backendLabel}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${cost}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#666">${r.runs} runs</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#fff5e6;border:1px solid #f5a623;border-radius:6px;padding:16px;margin-bottom:18px">
    <div style="font-size:14px;color:#666;letter-spacing:0.04em;text-transform:uppercase;font-weight:600">Daily budget alert</div>
    <div style="font-size:24px;font-weight:600;margin-top:4px">$${report.totalUsd.toFixed(2)} / $${report.capUsd.toFixed(2)} (${pct}%)</div>
    <div style="font-size:13px;color:#666;margin-top:4px">${dayKey} UTC · Gulf Coast Industrial Radar</div>
  </div>
  <p style="margin:0 0 6px 0;font-size:13px;color:#666;letter-spacing:0.04em;text-transform:uppercase;font-weight:600">Top contributors today</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
    <thead><tr>
      <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #ddd;font-weight:600">Agent</th>
      <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #ddd;font-weight:600">Backend</th>
      <th style="text-align:right;padding:6px 12px;border-bottom:2px solid #ddd;font-weight:600">Cost</th>
      <th style="text-align:right;padding:6px 12px;border-bottom:2px solid #ddd;font-weight:600">Runs</th>
    </tr></thead>
    <tbody>${topRows || `<tr><td colspan="4" style="padding:6px 12px;color:#999">No contributors yet</td></tr>`}</tbody>
  </table>
  <p style="font-size:12px;color:#888;line-height:1.5;border-top:1px solid #eee;padding-top:12px">
    Threshold via <code>BUDGET_ALERT_THRESHOLD</code> (currently ${(ALERT_THRESHOLD * 100).toFixed(0)}%).
    Hard cap via <code>PERPLEXITY_DAILY_BUDGET_USD</code>. Per-agent rollback via
    <code>AGENT_BACKEND_&lt;NAME&gt;=openai</code>. Full table at <code>/admin/runs</code>.
  </p>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: ALERT_FROM_EMAIL,
      to: [ALERT_TO_EMAIL],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`);
  }
}

/** Minimal HTML escaper for agent names (defensive — they're already
 *  trusted strings, but email body shouldn't break on a future "&"). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
