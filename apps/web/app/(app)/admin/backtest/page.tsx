import Link from "next/link";
import type { Route } from "next";
import { prisma } from "@gcir/db";
import { runBacktest } from "@/lib/backtest";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminBacktestPage() {
  const [backtest, latestRun] = await Promise.all([
    Promise.resolve(runBacktest()),
    prisma.backtestRun.findFirst({
      where: { status: "ok" },
      orderBy: { completedAt: "desc" },
      select: { id: true, completedAt: true },
    }),
  ]);

  return (
    <main className="mx-auto max-w-[1180px] flex-1 overflow-y-auto px-10 py-9">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Admin · Backtest
      </div>
      <h1 className="mb-1 text-[36px] font-semibold leading-[1.08] tracking-tighter text-ink">
        Validation backtest metrics
      </h1>
      <p className="max-w-[860px] text-[15px] leading-relaxed text-muted-2">
        This page is the operator view of whether the seeded Gulf Coast reference set would have
        been surfaced ahead of public announcement under the current deterministic scoring path.
      </p>
      <div className="mt-3 font-mono text-[11.5px] text-muted">
        Latest persisted run: {latestRun ? fmtDate(latestRun.completedAt) : "not persisted yet"}
      </div>

      <section className="mt-8 grid grid-cols-4 gap-3">
        <MetricCard label="Average lead time" value={`${backtest.metrics.averageLeadTimeDays}d`} />
        <MetricCard label="Median lead time" value={`${backtest.metrics.medianLeadTimeDays}d`} />
        <MetricCard label="Longest lead" value={`${backtest.metrics.longestLeadDays}d`} />
        <MetricCard label="Shortest lead" value={`${backtest.metrics.shortestLeadDays}d`} />
        <MetricCard label="Precision" value={String(backtest.metrics.precision)} />
        <MetricCard label="Recall" value={String(backtest.metrics.recall)} />
        <MetricCard label="Duplicate rate" value={String(backtest.metrics.duplicateRate)} />
        <MetricCard label="False-positive rate" value={String(backtest.metrics.falsePositiveRate)} />
      </section>

      <section className="mt-8 overflow-hidden rounded-md border border-line bg-white">
        <div className="grid grid-cols-[1.4fr_120px_120px_120px_1fr] border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          <div>Project</div>
          <div>Status</div>
          <div>Lead</div>
          <div>Score</div>
          <div>Action</div>
        </div>
        {backtest.projects.map((project) => (
          <Link
            key={project.projectKey}
            href={(`/proof/${project.projectKey}` as unknown) as Route}
            className="grid grid-cols-[1.4fr_120px_120px_120px_1fr] items-center border-b border-line px-4 py-3 text-[13px] last:border-b-0"
          >
            <div>
              <div className="font-semibold tracking-tight text-ink">{project.projectName}</div>
              <div className="mt-0.5 font-mono text-[11.5px] text-muted">
                public {project.publicAnnouncementDate}
              </div>
            </div>
            <div className="font-mono text-[11.5px] text-muted">{project.status}</div>
            <div className="font-mono text-[12px] text-muted">
              {project.leadTimeDays != null ? `${project.leadTimeDays}d` : "unmet"}
            </div>
            <div className="font-mono text-[14px] font-semibold text-ink">
              {project.formationScoreAtSurface}
            </div>
            <div className="text-muted">{project.recommendedAction}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
      <div className="mt-1 text-[24px] font-semibold tracking-tight text-ink">{value}</div>
    </div>
  );
}
