/**
 * Admin / AgentRuns — observability for the Perplexity + OpenAI runtime.
 *
 * Lists the last 100 AgentRun rows with cost, latency, and status. Each row's
 * agent name is namespaced "Perplexity.<name>" or "OpenAI.<name>" so the
 * backend is implicit. Soft-grouped by UTC day for scannability.
 *
 * Pull-channel for budget alerts: a red banner appears at the top of the page
 * when today's UTC-day total spend has crossed BUDGET_ALERT_THRESHOLD (default
 * 0.75 = 75% of PERPLEXITY_DAILY_BUDGET_USD). This is the same threshold the
 * budget-report cron uses for email pushes — email requires RESEND_API_KEY +
 * BUDGET_ALERT_TO_EMAIL to be set, but this banner is unconditional.
 *
 * Read-only: no mutations from this page. Cron + agent code do all writes.
 */

import { prisma } from "@gcir/db";
import { fmtAge, fmtDate, fmtUSD } from "@/lib/format";

export const dynamic = "force-dynamic";

type RunRow = {
  id: string;
  agent: string;
  status: string;
  costUsd: number | null;
  latencyMs: number | null;
  startedAt: Date;
  errorMsg: string | null;
};

const BACKEND_BADGE: Record<string, string> = {
  perplexity: "bg-accent/[0.06] text-accent-ink ring-accent/30",
  openai: "bg-bg-3 text-ink-2 ring-line",
};

const STATUS_BADGE: Record<string, string> = {
  ok: "bg-accent/[0.06] text-accent-ink ring-accent/30",
  running: "bg-warn/[0.06] text-warn ring-warn/30",
  error: "bg-danger/[0.06] text-danger ring-danger/30",
};

const DAILY_CAP = Number(process.env.PERPLEXITY_DAILY_BUDGET_USD ?? "50");
const ALERT_THRESHOLD = Number(process.env.BUDGET_ALERT_THRESHOLD ?? "0.75");

function splitAgent(full: string): { backend: "perplexity" | "openai" | "unknown"; name: string } {
  if (full.startsWith("Perplexity.")) return { backend: "perplexity", name: full.slice(11) };
  if (full.startsWith("OpenAI.")) return { backend: "openai", name: full.slice(7) };
  return { backend: "unknown", name: full };
}

export default async function AdminRunsPage() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sinceUtcDay = new Date();
  sinceUtcDay.setUTCHours(0, 0, 0, 0);

  const [runs, todayAgg, errorAgg, utcDayAgg] = await Promise.all([
    prisma.agentRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 100,
      select: {
        id: true,
        agent: true,
        status: true,
        costUsd: true,
        latencyMs: true,
        startedAt: true,
        errorMsg: true,
      },
    }),
    prisma.agentRun.aggregate({
      where: { startedAt: { gte: since24h } },
      _sum: { costUsd: true },
      _count: { _all: true },
    }),
    prisma.agentRun.count({
      where: { startedAt: { gte: since24h }, status: "error" },
    }),
    prisma.agentRun.aggregate({
      where: { startedAt: { gte: sinceUtcDay } },
      _sum: { costUsd: true },
    }),
  ]);

  const todayTotal = todayAgg._sum.costUsd ?? 0;
  const todayRuns = todayAgg._count._all;
  const todayErrors = errorAgg;
  const errorRate = todayRuns > 0 ? todayErrors / todayRuns : 0;

  // ── Banner: same UTC-day window the budget-report cron uses for email pushes
  const utcDayTotal = utcDayAgg._sum.costUsd ?? 0;
  const pctOfCap = DAILY_CAP > 0 ? utcDayTotal / DAILY_CAP : 0;
  const overAlertThreshold = pctOfCap >= ALERT_THRESHOLD;

  return (
    <main className="mx-auto max-w-[1280px] flex-1 overflow-y-auto px-10 py-9">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Admin · AgentRuns
      </div>
      <h1 className="mb-1 text-[36px] font-semibold leading-[1.1] tracking-tighter">
        Last 100 agent invocations
      </h1>
      <p className="mb-6 text-[15.5px] text-muted-2">
        Every Perplexity call and every OpenAI fallback writes a row here. Backend, model, cost,
        and latency are recorded from the agent runtime — there&rsquo;s no other source of truth.
      </p>

      {/* ── Budget alert (UTC-day spend ≥ 75% of cap) ─────────────────────── */}
      {overAlertThreshold && (
        <div className="mb-5 rounded-md border border-danger/30 bg-danger/[0.06] p-4 text-danger">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em]">
                Daily budget alert
              </div>
              <div className="mt-1 text-[20px] font-semibold tracking-tight">
                {fmtUSD(utcDayTotal)} / {fmtUSD(DAILY_CAP)}
                <span className="ml-2 text-[15px] font-normal opacity-70">
                  ({(pctOfCap * 100).toFixed(0)}% of cap, UTC day)
                </span>
              </div>
            </div>
            <div className="max-w-[420px] text-[12px] leading-relaxed opacity-80">
              Threshold via <code className="font-mono">BUDGET_ALERT_THRESHOLD</code>
              {" "}({(ALERT_THRESHOLD * 100).toFixed(0)}%). Hard cap via{" "}
              <code className="font-mono">PERPLEXITY_DAILY_BUDGET_USD</code>. Per-agent rollback
              via <code className="font-mono">AGENT_BACKEND_&lt;NAME&gt;=openai</code>.
            </div>
          </div>
        </div>
      )}

      {/* ── 24h scoreboard ─────────────────────────────────────────────────── */}
      <div className="mb-7 grid grid-cols-3 gap-3">
        <Stat label="24h total" value={fmtUSD(todayTotal)} />
        <Stat label="24h runs" value={todayRuns.toLocaleString()} />
        <Stat
          label="24h error rate"
          value={`${(errorRate * 100).toFixed(1)}%`}
          tone={errorRate > 0.05 ? "warn" : errorRate > 0.15 ? "danger" : "ok"}
        />
      </div>

      <table className="mt-2 w-full border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr>
            {["Started", "Backend", "Agent", "Status", "Cost", "Latency"].map((h) => (
              <th
                key={h}
                className="border-b border-line bg-bg-2 px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((r: RunRow) => {
            const { backend, name } = splitAgent(r.agent);
            return (
              <tr key={r.id} className="hover:bg-bg-2">
                <td className="border-b border-line-2 px-2.5 py-2.5 align-top">
                  <div className="font-mono text-[11.5px] text-ink-2">{fmtAge(r.startedAt)}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-muted">
                    {fmtDate(r.startedAt)}
                  </div>
                </td>
                <td className="border-b border-line-2 px-2.5 py-2.5 align-top">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11.5px] ring-1 ${BACKEND_BADGE[backend] ?? "bg-bg-3 text-muted ring-line"}`}
                  >
                    {backend}
                  </span>
                </td>
                <td className="border-b border-line-2 px-2.5 py-2.5 align-top">
                  <div className="font-semibold text-ink">{name}</div>
                  {r.errorMsg && (
                    <div className="mt-0.5 max-w-[420px] truncate font-mono text-[10.5px] text-danger">
                      {r.errorMsg}
                    </div>
                  )}
                </td>
                <td className="border-b border-line-2 px-2.5 py-2.5 align-top">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11.5px] ring-1 ${STATUS_BADGE[r.status] ?? "bg-bg-3 text-muted ring-line"}`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "currentColor" }}
                    />
                    {r.status}
                  </span>
                </td>
                <td className="border-b border-line-2 px-2.5 py-2.5 align-top text-right font-mono text-[11.5px] text-ink-2">
                  {r.costUsd != null ? `$${r.costUsd.toFixed(4)}` : "—"}
                </td>
                <td className="border-b border-line-2 px-2.5 py-2.5 align-top text-right font-mono text-[11.5px] text-muted-2">
                  {r.latencyMs != null ? `${r.latencyMs.toLocaleString()} ms` : "—"}
                </td>
              </tr>
            );
          })}
          {runs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2.5 py-12 text-center text-muted-2">
                No AgentRun rows yet. Set <code className="font-mono">WORKER_CRON_ENABLED=true</code> and run the worker.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <aside className="mt-8 rounded-md border border-line bg-bg-2 p-4 text-[13px] leading-relaxed text-ink-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          How this is wired
        </div>
        Every <code className="font-mono">callBackend()</code> invocation writes one row before
        returning, marking <code className="font-mono">Perplexity.&lt;agent&gt;</code> on success
        and <code className="font-mono">OpenAI.&lt;agent&gt;</code> on graceful fallback (when
        <code className="font-mono"> FEATURE_PERPLEXITY_VALIDATION=false</code> or the daily cap
        is exhausted). Cost is taken from server-reported usage where available, else estimated
        from the published per-model pricing in <code className="font-mono">perplexity-runtime.ts</code>.
      </aside>
    </main>
  );
}

function Stat({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-danger"
      : tone === "warn"
        ? "text-warn"
        : "text-ink";
  return (
    <div className="rounded-md border border-line bg-bg-2 p-4">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
      <div className={`mt-1 text-[24px] font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
