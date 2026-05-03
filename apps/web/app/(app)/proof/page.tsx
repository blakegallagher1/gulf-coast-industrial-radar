import Link from "next/link";
import { prisma } from "@gcir/db";

const seededProjects: any[] = [];
import { fmtDate } from "@/lib/format";
import { UsageEventTracker } from "@/components/usage-event-tracker";
import { RecoveryActions } from "./recovery-actions";

export const dynamic = "force-dynamic";

function daysBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function freshnessBucket(lastOkAt: Date | null): "fresh" | "stale" | "offline" {
  if (!lastOkAt) return "offline";
  const ageHours = (Date.now() - lastOkAt.getTime()) / 3600000;
  if (ageHours <= 24) return "fresh";
  if (ageHours <= 72) return "stale";
  return "offline";
}

function checklistStatus(passed: boolean): { label: string; className: string } {
  if (passed) {
    return {
      label: "met",
      className: "bg-accent/[0.06] text-accent-ink ring-accent/30",
    };
  }
  return {
    label: "gap",
    className: "bg-warn/[0.06] text-warn ring-warn/30",
  };
}

const CANDIDATE_STAGE: Record<string, string> = {
  ENVIRONMENTAL_PERMIT: "PERMIT_SURFACED",
  PUBLIC_COMPANY: "FINANCING_SURFACED",
};

export default async function ProofPage() {
  const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const validationProjects = seededProjects.filter((project) => project.publicAnnouncedAt);
  const validationLeadDays = validationProjects
    .map((project) =>
      daysBetween(new Date(project.firstSignalAt), new Date(project.publicAnnouncedAt ?? project.firstSignalAt)),
    )
    .filter((value): value is number => value != null);
  const validationAverageLeadDays =
    validationLeadDays.length > 0
      ? Math.round(validationLeadDays.reduce((sum, value) => sum + value, 0) / validationLeadDays.length)
      : null;
  const validationMaxLeadDays =
    validationLeadDays.length > 0 ? Math.max(...validationLeadDays) : null;

  const runtimeFlags = {
    workerCronEnabled: process.env.WORKER_CRON_ENABLED === "true",
    qladLiveEnabled: process.env.FEATURE_QLAD_LIVE_ALERTING === "true",
    perplexityValidationEnabled: process.env.FEATURE_PERPLEXITY_VALIDATION === "true",
  };

  const [sources, projects, briefs, recentWatchlists, recentRecipients, candidateSignals, usageEvents, usageEventRows, pipeline, recentGraphGrowth] = await Promise.all([
    prisma.source.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            signals: true,
            rawDocuments: true,
          },
        },
        runs: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: {
            recordsSeen: true,
            recordsNew: true,
            finishedAt: true,
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { publicId: { not: "PRJ-2026-08114" } },
      orderBy: { publicId: "asc" },
      select: {
        id: true,
        publicId: true,
        name: true,
        parishCounty: true,
        stage: true,
        score: true,
        firstSignalAt: true,
        publicAnnouncedAt: true,
        _count: {
          select: {
            signals: true,
            actions: true,
          },
        },
      },
    }),
    prisma.brief.findMany({
      orderBy: { issueNumber: "desc" },
      take: 5,
      select: {
        id: true,
        issueNumber: true,
        title: true,
        publishedAt: true,
        createdAt: true,
      },
    }),
    prisma.watchlist.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        isShared: true,
        createdAt: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),
    prisma.briefRecipient.findMany({
      orderBy: { sentAt: "desc" },
      take: 5,
      select: {
        id: true,
        email: true,
        sentAt: true,
        brief: {
          select: {
            id: true,
            issueNumber: true,
            title: true,
          },
        },
      },
    }),
    prisma.signal.findMany({
      where: {
        family: {
          in: ["ENVIRONMENTAL_PERMIT", "PUBLIC_COMPANY"],
        },
      },
      orderBy: [{ observedAt: "desc" }],
      take: 250,
      select: {
        family: true,
        subjectLabel: true,
        observedAt: true,
        payload: true,
      },
    }),
    prisma.usageEvent.groupBy({
      by: ["surface", "eventType"],
      _count: { _all: true },
    }),
    prisma.usageEvent.findMany({
      where: {
        eventType: {
          in: [
            "watchlist_create",
            "watchlist_follow_update",
            "brief_publish",
            "share_link",
            "open_radar",
            "candidate_promote",
            "candidate_promote_batch",
          ],
        },
      },
      select: {
        eventType: true,
        targetId: true,
        createdAt: true,
      },
    }),
    prisma.$transaction([
      prisma.rawDocument.count(),
      prisma.signal.count(),
      prisma.project.count(),
      prisma.alert.count(),
      prisma.recommendedAction.count(),
      prisma.watchlist.count(),
      prisma.briefRecipient.count(),
    ]).then(
      ([
        rawDocuments,
        signals,
        projectCount,
        alertCount,
        actionCount,
        watchlistCount,
        recipientCount,
      ]) => ({
        rawDocuments,
        signals,
        projectCount,
        alertCount,
        actionCount,
        watchlistCount,
        recipientCount,
      }),
    ),
    prisma.$transaction([
      prisma.project.count({ where: { createdAt: { gte: recentSince } } }),
      prisma.alert.count({ where: { createdAt: { gte: recentSince } } }),
      prisma.recommendedAction.count({ where: { createdAt: { gte: recentSince } } }),
      prisma.watchlist.count({ where: { createdAt: { gte: recentSince } } }),
      prisma.briefRecipient.count({ where: { sentAt: { gte: recentSince } } }),
    ]).then(([projects24h, alerts24h, actions24h, watchlists24h, recipients24h]) => ({
      projects24h,
      alerts24h,
      actions24h,
      watchlists24h,
      recipients24h,
    })),
  ]);

  const sourceCounts = sources.reduce(
    (acc, source) => {
      acc[source.status] = (acc[source.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const wiredSources = sources.filter(
    (source) => source._count.signals > 0 || (source.runs[0]?.recordsSeen ?? 0) > 0,
  ).length;
  const sourcesWithDocs = sources.filter((source) => source._count.rawDocuments > 0).length;
  const totalSignals = sources.reduce((sum, source) => sum + source._count.signals, 0);

  const corridorCounts = projects.reduce((acc, project) => {
    const key = project.parishCounty ?? "Unknown geography";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const freshnessCounts = sources.reduce(
    (acc, source) => {
      const bucket = freshnessBucket(source.lastOkAt);
      acc[bucket] += 1;
      return acc;
    },
    { fresh: 0, stale: 0, offline: 0 },
  );

  const projectsWithSignals = projects.filter((project) => project._count.signals > 0).length;
  const projectsWithActions = projects.filter((project) => project._count.actions > 0).length;
  const projectsWithPublicDate = projects.filter((project) => project.publicAnnouncedAt != null).length;
  const freshScheduledSources = sources.filter((source) => freshnessBucket(source.lastOkAt) === "fresh").length;
  const candidateQueue = Array.from(
    candidateSignals.reduce((acc, signal) => {
      const payload = (signal.payload ?? {}) as {
        applicant?: string;
        company?: string;
        companyName?: string;
        facilityName?: string;
        form?: string;
        permitNo?: string;
      };
      const label =
        payload.applicant ??
        payload.company ??
        payload.companyName ??
        signal.subjectLabel.split("·")[0]?.trim() ??
        signal.subjectLabel;
      const summary =
        signal.family === "ENVIRONMENTAL_PERMIT"
          ? payload.facilityName
            ? `${payload.facilityName} · permit ${payload.permitNo ?? "pending"}`
            : signal.subjectLabel
          : payload.form
            ? `${payload.form} filing`
            : signal.subjectLabel;
      const key = `${signal.family}:${label}`;
      const existing = acc.get(key);
      if (existing) {
        existing.count += 1;
        if (signal.observedAt > existing.observedAt) {
          existing.observedAt = signal.observedAt;
          existing.summary = summary;
        }
        return acc;
      }
      acc.set(key, {
        family: signal.family,
        label,
        summary,
        count: 1,
        observedAt: signal.observedAt,
      });
      return acc;
    }, new Map<string, { family: string; label: string; summary: string; count: number; observedAt: Date }>()),
  )
    .map(([, candidate]) => candidate)
    .map((candidate) => ({
      ...candidate,
      existingProject:
        projects.find(
          (project) =>
            project.name === candidate.label &&
            project.stage === (CANDIDATE_STAGE[candidate.family] ?? "WATCH"),
        ) ?? null,
    }))
    .sort(
      (a, b) =>
        Number(Boolean(b.existingProject)) - Number(Boolean(a.existingProject)) ||
        b.count - a.count ||
        b.observedAt.getTime() - a.observedAt.getTime(),
    )
    .slice(0, 8);
  const trackedCandidateQueueCount = candidateQueue.filter((candidate) => candidate.existingProject).length;
  const promotableCandidateQueueCount = candidateQueue.length - trackedCandidateQueueCount;
  const usageCounts = usageEvents.reduce<Record<string, number>>((acc, row) => {
    acc[`${row.surface}:${row.eventType}`] = row._count._all;
    return acc;
  }, {});
  const alertsViews = usageCounts["alerts:page_view"] ?? 0;
  const radarViews = usageCounts["radar:page_view"] ?? 0;
  const alertOpenRadar = usageCounts["alerts:open_radar"] ?? 0;
  const watchlistCreates = usageCounts["alerts:watchlist_create"] ?? 0;
  const followUpdates = usageCounts["watchlist:watchlist_follow_update"] ?? 0;
  const briefPublishes = usageCounts["brief:brief_publish"] ?? 0;
  const createdWatchlistIds = new Set(
    usageEventRows
      .filter((row) => row.eventType === "watchlist_create" && row.targetId)
      .map((row) => row.targetId as string),
  );
  const followedWatchlistIds = new Set(
    usageEventRows
      .filter((row) => row.eventType === "watchlist_follow_update" && row.targetId)
      .map((row) => row.targetId as string),
  );
  const publishedBriefIds = new Set(
    usageEventRows
      .filter((row) => row.eventType === "brief_publish" && row.targetId)
      .map((row) => row.targetId as string),
  );
  const now = Date.now();
  const last24hRows = usageEventRows.filter(
    (row) => now - row.createdAt.getTime() <= 24 * 60 * 60 * 1000,
  );
  const recentCounts = last24hRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.eventType] = (acc[row.eventType] ?? 0) + 1;
    return acc;
  }, {});
  const recentUniqueTargets = new Set(
    last24hRows
      .map((row) => row.targetId)
      .filter((value): value is string => Boolean(value)),
  ).size;
  const uniqueWatchlistCreates = createdWatchlistIds.size;
  const uniqueFollowUpdates = followedWatchlistIds.size;
  const uniqueBriefPublishes = publishedBriefIds.size;
  const shareCount =
    (usageCounts["alerts:share_link"] ?? 0) +
    (usageCounts["brief:share_link"] ?? 0) +
    (usageCounts["watchlist:share_link"] ?? 0) +
    (usageCounts["proof:share_link"] ?? 0);
  const investigateRate = alertsViews > 0 ? Math.round((alertOpenRadar / alertsViews) * 100) : 0;
  const createRate = alertsViews > 0 ? Math.round((uniqueWatchlistCreates / alertsViews) * 100) : 0;
  const followRate = uniqueWatchlistCreates > 0 ? Math.round((uniqueFollowUpdates / uniqueWatchlistCreates) * 100) : 0;
  const publishRate = uniqueWatchlistCreates > 0 ? Math.round((uniqueBriefPublishes / uniqueWatchlistCreates) * 100) : 0;
  const shareRate = alertsViews > 0 ? Math.round((shareCount / alertsViews) * 100) : 0;
  const formationGap =
    pipeline.signals > 0 &&
    pipeline.projectCount === 0 &&
    pipeline.alertCount === 0;
  const showQladRecovery = formationGap;

  const checklist = [
    {
      criterion: "Backtest report shows lead-time performance across at least 5 known projects",
      evidence: `${validationProjects.length} seeded validation projects with public announcement dates · avg lead ${validationAverageLeadDays ?? "—"}d`,
      passed: validationProjects.length >= 5 && validationAverageLeadDays != null,
    },
    {
      criterion: "At least 6 public-source lanes are ingested on a schedule",
      evidence: `${freshScheduledSources} lanes refreshed in last 24h · ${wiredSources} signal-bearing lanes`,
      passed: freshScheduledSources >= 6,
    },
    {
      criterion: "Every signal links back to raw source evidence",
      evidence: `${totalSignals.toLocaleString()} signals stored · ${sourcesWithDocs}/${sources.length} sources have archived raw documents`,
      passed: totalSignals > 0 && sourcesWithDocs >= 1,
    },
    {
      criterion: "Every live triggered project has recommended actions",
      evidence: `${projectsWithActions}/${projects.length} live projects have persisted recommended actions`,
      passed: projects.length > 0 && projectsWithActions === projects.length,
    },
    {
      criterion: "Weekly investor brief can be generated and queued for distribution",
      evidence: `${briefs.length} recent brief rows · ${pipeline.recipientCount} queued recipients`,
      passed: briefs.length > 0 && pipeline.recipientCount > 0,
    },
    {
      criterion: "Alerts can turn into recurring shared watchlists",
      evidence: `${pipeline.watchlistCount} live watchlists · ${recentWatchlists.length} recent rows visible`,
      passed: pipeline.watchlistCount > 0,
    },
  ];

  return (
    <main className="mx-auto max-w-[1180px] flex-1 overflow-y-auto px-10 py-10">
      <UsageEventTracker
        eventType="page_view"
        surface="proof"
        metadata={{
          projectCount: pipeline.projectCount,
          alertCount: pipeline.alertCount,
        }}
      />
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Trust proof
      </div>
      <h1 className="mb-2 text-[38px] font-semibold leading-[1.05] tracking-tighter text-ink">
        Launch-readiness evidence
      </h1>
      <p className="max-w-[860px] text-[15.5px] leading-relaxed text-muted-2">
        This page maps the product promise to current evidence in the database. It is
        not a marketing surface. It is the operating proof for whether the radar is
        actually ready to earn trust with investors, developers, and adjacent project teams.
      </p>

      <section className="mt-8 grid grid-cols-4 gap-3">
        <MetricCard
          label="Tracked live projects"
          value={String(projects.length)}
          note="current downstream project objects in the live database"
        />
        <MetricCard
          label="Average lead time"
          value={validationAverageLeadDays != null ? `${validationAverageLeadDays}d` : "—"}
          note="seeded backtest first signal to public announcement"
        />
        <MetricCard
          label="Longest lead"
          value={validationMaxLeadDays != null ? `${validationMaxLeadDays}d` : "—"}
          note="best historical head start in seeded backtest"
        />
        <MetricCard
          label="Fresh lanes"
          value={String(freshScheduledSources)}
          note={`${sourceCounts.ACTIVE ?? 0} marked active · ${sources.length} registry rows`}
        />
      </section>

      <section className="mt-10 rounded-md border border-line bg-white">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Acceptance checklist against current evidence
        </div>
        <div className="divide-y divide-line">
          {checklist.map((item) => {
            const status = checklistStatus(item.passed);
            return (
              <div key={item.criterion} className="grid grid-cols-[1.3fr_1fr_90px] gap-4 px-4 py-3.5 text-[13px]">
                <div>
                  <div className="font-semibold tracking-tight text-ink">{item.criterion}</div>
                </div>
                <div className="text-muted">{item.evidence}</div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11.5px] ring-1 ${status.className}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="rounded-md border border-line bg-white">
          <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Corridor and parish coverage
          </div>
          <div className="px-4 py-4">
            <div className="mb-3 text-[13px] leading-snug text-muted">
              Current reference coverage is still weighted toward the Louisiana launch wedge,
              which matches the product strategy. Expansion beyond this should follow proof,
              not precede it.
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(corridorCounts).map(([name, count]) => (
                <div
                  key={name}
                  className="rounded-full border border-line bg-bg-2 px-3 py-1.5 text-[12px] text-ink-2"
                >
                  <span className="font-semibold text-ink">{name}</span>{" "}
                  <span className="font-mono text-[11.5px] text-muted">· {count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-line bg-white">
          <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Source freshness bands
          </div>
          <div className="grid grid-cols-3 gap-3 px-4 py-4">
            <MetricMini label="Fresh <24h" value={String(freshnessCounts.fresh)} tone="text-emerald-700" />
            <MetricMini label="Stale <72h" value={String(freshnessCounts.stale)} tone="text-amber-700" />
            <MetricMini label="Offline >72h" value={String(freshnessCounts.offline)} tone="text-red-700" />
          </div>
          <div className="px-4 pb-4 text-[12px] leading-snug text-muted">
            Freshness uses `lastOkAt`, not product copy, so the team can separate real uptime from stated intent.
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-md border border-line bg-white">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Pipeline state
        </div>
        <div className="grid grid-cols-7 gap-3 px-4 py-4">
          <MetricMini label="Raw docs" value={String(pipeline.rawDocuments)} tone="text-ink" />
          <MetricMini label="Signals" value={String(pipeline.signals)} tone="text-ink" />
          <MetricMini label="Projects" value={String(pipeline.projectCount)} tone="text-ink" />
          <MetricMini label="Alerts" value={String(pipeline.alertCount)} tone="text-ink" />
          <MetricMini label="Actions" value={String(pipeline.actionCount)} tone="text-ink" />
          <MetricMini label="Watchlists" value={String(pipeline.watchlistCount)} tone="text-ink" />
          <MetricMini label="Recipients" value={String(pipeline.recipientCount)} tone="text-ink" />
        </div>
        <div className="border-t border-line px-4 py-4">
          {formationGap ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-900">
              Evidence ingestion is live, but investor-facing formation objects are not materializing yet. Signals exist without downstream projects or alerts, which usually means the live formation worker path is disabled or stalled.
            </div>
          ) : (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-[13px] leading-snug text-emerald-900">
              Downstream formation objects are present. The live pipeline is producing investor-facing entities beyond raw evidence.
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-line bg-white">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Runtime gate diagnostics
        </div>
        <div className="grid grid-cols-3 gap-3 px-4 py-4">
          <MetricMini
            label="Worker cron"
            value={runtimeFlags.workerCronEnabled ? "on" : "off"}
            tone={runtimeFlags.workerCronEnabled ? "text-emerald-700" : "text-red-700"}
          />
          <MetricMini
            label="QLAD live"
            value={runtimeFlags.qladLiveEnabled ? "on" : "off"}
            tone={runtimeFlags.qladLiveEnabled ? "text-emerald-700" : "text-red-700"}
          />
          <MetricMini
            label="PPLX validate"
            value={runtimeFlags.perplexityValidationEnabled ? "on" : "off"}
            tone={runtimeFlags.perplexityValidationEnabled ? "text-emerald-700" : "text-amber-700"}
          />
        </div>
        <div className="border-t border-line px-4 py-4 text-[12px] leading-snug text-muted">
          The worker defaults these gates to off when unset. If raw evidence exists but projects and alerts stay at zero, this panel should be checked before assuming scoring or extraction logic is broken.
        </div>
      </section>

      <section className="mt-6 rounded-md border border-line bg-white">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Candidate queue state
        </div>
        <div className="grid grid-cols-3 gap-3 px-4 py-4">
          <MetricMini label="Visible queue" value={String(candidateQueue.length)} tone="text-ink" />
          <MetricMini label="Tracked" value={String(trackedCandidateQueueCount)} tone="text-emerald-700" />
          <MetricMini label="Promotable" value={String(promotableCandidateQueueCount)} tone="text-amber-700" />
        </div>
        <div className="border-t border-line px-4 py-4 text-[12px] leading-snug text-muted">
          This reflects the current non-QLAD emerging-candidate window. A high promotable count means the operator can still widen tracked-project breadth without waiting for a new quiet-assembly cluster.
        </div>
      </section>

      <section className="mt-6 rounded-md border border-line bg-white">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Usage telemetry snapshot
        </div>
        <div className="grid grid-cols-11 gap-3 px-4 py-4">
          <MetricMini label="Alerts views" value={String(alertsViews)} tone="text-ink" />
          <MetricMini label="Radar views" value={String(radarViews)} tone="text-ink" />
          <MetricMini label="Proof views" value={String(usageCounts["proof:page_view"] ?? 0)} tone="text-ink" />
          <MetricMini label="Brief views" value={String(usageCounts["brief:page_view"] ?? 0)} tone="text-ink" />
          <MetricMini label="Shares" value={String(shareCount)} tone="text-ink" />
          <MetricMini label="Single promotes" value={String(usageCounts["alerts:candidate_promote"] ?? 0)} tone="text-ink" />
          <MetricMini label="Manual batch" value={String(usageCounts["alerts:candidate_promote_batch"] ?? 0)} tone="text-ink" />
          <MetricMini label="Scheduled batch" value={String(usageCounts["cron:candidate_promote_batch"] ?? 0)} tone="text-ink" />
          <MetricMini label="Watchlist creates" value={String(watchlistCreates)} tone="text-ink" />
          <MetricMini label="Follow updates" value={String(followUpdates)} tone="text-ink" />
          <MetricMini label="Brief publishes" value={String(briefPublishes)} tone="text-ink" />
        </div>
        <div className="border-t border-line px-4 py-4 text-[12px] leading-snug text-muted">
          This is lightweight product instrumentation, not external analytics. It exists to show whether the core surfaces are actually being opened over time instead of only growing object counts in the background.
        </div>
      </section>

      <section className="mt-6 rounded-md border border-line bg-white">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Recent activity window
        </div>
        <div className="grid grid-cols-6 gap-3 px-4 py-4">
          <MetricMini label="24h total" value={String(last24hRows.length)} tone="text-ink" />
          <MetricMini label="Unique targets" value={String(recentUniqueTargets)} tone="text-ink" />
          <MetricMini label="Radar opens" value={String(recentCounts.open_radar ?? 0)} tone="text-ink" />
          <MetricMini label="Shares" value={String(recentCounts.share_link ?? 0)} tone="text-ink" />
          <MetricMini label="Watchlists" value={String(recentCounts.watchlist_create ?? 0)} tone="text-ink" />
          <MetricMini label="Brief publishes" value={String(recentCounts.brief_publish ?? 0)} tone="text-ink" />
        </div>
        <div className="border-t border-line px-4 py-4 text-[12px] leading-snug text-muted">
          This 24-hour window is the closest current proxy for momentum. It helps distinguish a large historical count from actual recent operator activity.
        </div>
      </section>

      <section className="mt-6 rounded-md border border-line bg-white">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          24-hour graph growth
        </div>
        <div className="grid grid-cols-5 gap-3 px-4 py-4">
          <MetricMini label="Projects" value={String(recentGraphGrowth.projects24h)} tone="text-ink" />
          <MetricMini label="Alerts" value={String(recentGraphGrowth.alerts24h)} tone="text-ink" />
          <MetricMini label="Actions" value={String(recentGraphGrowth.actions24h)} tone="text-ink" />
          <MetricMini label="Watchlists" value={String(recentGraphGrowth.watchlists24h)} tone="text-ink" />
          <MetricMini label="Recipients" value={String(recentGraphGrowth.recipients24h)} tone="text-ink" />
        </div>
        <div className="border-t border-line px-4 py-4 text-[12px] leading-snug text-muted">
          This shows whether the tracked object graph is actually growing in the most recent 24-hour window, not just accumulating old records. It is the cleanest current proxy for whether scheduled widening and operator actions are still compounding.
        </div>
      </section>

      <section className="mt-6 rounded-md border border-line bg-white">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Spread loop funnel
        </div>
        <div className="grid grid-cols-6 gap-3 px-4 py-4">
          <MetricMini label="Alert to radar" value={`${investigateRate}%`} tone="text-ink" />
          <MetricMini label="Alert to share" value={`${shareRate}%`} tone="text-ink" />
          <MetricMini label="Alert to save" value={`${createRate}%`} tone="text-ink" />
          <MetricMini label="Save to follow" value={`${followRate}%`} tone="text-ink" />
          <MetricMini label="Save to publish" value={`${publishRate}%`} tone="text-ink" />
          <MetricMini
            label="Recipients per publish"
            value={uniqueBriefPublishes > 0 ? (pipeline.recipientCount / uniqueBriefPublishes).toFixed(1) : "0.0"}
            tone="text-ink"
          />
        </div>
        <div className="border-t border-line px-4 py-4 text-[12px] leading-snug text-muted">
          This is the closest current proxy for internal spread. `Alert to radar` uses direct alert-origin investigation clicks, while the watchlist and brief steps use unique entities so repeated updates on the same object do not inflate the conversion rates.
        </div>
      </section>

      <RecoveryActions showQladRecovery={showQladRecovery} />

      <section className="mt-10">
        <header className="mb-3.5 flex items-baseline justify-between border-b border-line pb-2.5">
          <h2 className="text-[18px] font-semibold tracking-tight text-ink">
            Validation backtest scoreboard
          </h2>
          <span className="font-mono text-[11.5px] text-muted">
            {validationProjects.length} seeded public-project fixtures
          </span>
        </header>
        <div className="overflow-hidden rounded-md border border-line">
          <div className="grid grid-cols-[110px_1.5fr_150px_120px_120px_120px_110px] border-b border-line bg-bg-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            <div>Project</div>
            <div>Name</div>
            <div>Geography</div>
            <div>Stage</div>
            <div>Score</div>
            <div>Lead time</div>
            <div>Signals</div>
          </div>
          {validationProjects.map((project) => {
            const lead = daysBetween(
              new Date(project.firstSignalAt),
              project.publicAnnouncedAt ? new Date(project.publicAnnouncedAt) : null,
            );
            return (
              <div
                key={project.publicId}
                className="grid grid-cols-[110px_1.5fr_150px_120px_120px_120px_110px] items-center border-b border-line px-4 py-3 text-[13px] last:border-b-0"
              >
                <div className="font-mono text-[11.5px] text-muted">{project.publicId}</div>
                <div>
                  <div className="font-semibold tracking-tight text-ink">{project.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    First signal {fmtDate(new Date(project.firstSignalAt))}
                    {project.publicAnnouncedAt ? ` · public ${fmtDate(new Date(project.publicAnnouncedAt))}` : ""}
                  </div>
                </div>
                <div className="text-muted">{project.parishCounty ?? "—"}</div>
                <div className="font-mono text-[11.5px] text-muted">
                  {project.stage.toLowerCase().replace(/_/g, "-")}
                </div>
                <div className="font-mono text-[14px] font-semibold text-ink">{project.score}</div>
                <div className="font-mono text-[12px] text-muted">
                  {lead != null ? `${lead} days` : "unannounced"}
                </div>
                <div className="font-mono text-[12px] text-muted">
                  {project.signals.length}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid grid-cols-[0.95fr_0.95fr_1.1fr] gap-6">
        <div>
          <header className="mb-3.5 flex items-baseline justify-between border-b border-line pb-2.5">
            <h2 className="text-[18px] font-semibold tracking-tight text-ink">
              Recent watchlists
            </h2>
            <Link href="/watchlists" className="font-mono text-[11.5px] text-muted underline decoration-line decoration-1 underline-offset-2 hover:text-ink">
              Open watchlists
            </Link>
          </header>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            {recentWatchlists.length === 0 && (
              <div className="px-4 py-8 text-sm text-muted">
                No watchlists exist yet.
              </div>
            )}
            {recentWatchlists.map((watchlist) => (
              <Link
                key={watchlist.id}
                href={`/watchlists/${watchlist.id}`}
                className="block border-b border-line px-4 py-3.5 last:border-b-0 hover:bg-bg-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[14px] font-semibold tracking-tight text-ink">
                    {watchlist.name}
                  </div>
                  <div className="font-mono text-[11px] text-muted">
                    {watchlist.isShared ? "shared" : "private"}
                  </div>
                </div>
                <div className="mt-1 text-[12px] text-muted">
                  {watchlist._count.items} saved items · created {fmtDate(watchlist.createdAt)}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <header className="mb-3.5 flex items-baseline justify-between border-b border-line pb-2.5">
            <h2 className="text-[18px] font-semibold tracking-tight text-ink">
              Source health
            </h2>
            <Link href="/sources" className="font-mono text-[11.5px] text-muted underline decoration-line decoration-1 underline-offset-2 hover:text-ink">
              Open full registry
            </Link>
          </header>
          <div className="overflow-hidden rounded-md border border-line">
            <div className="grid grid-cols-[1.2fr_120px_140px_140px_1fr] border-b border-line bg-bg-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              <div>Source</div>
              <div>Status</div>
              <div>Last run</div>
              <div>Last ok</div>
              <div>Error</div>
            </div>
            {sources.map((source) => (
              <div
                key={source.id}
                className="grid grid-cols-[1.2fr_120px_140px_140px_1fr] items-center border-b border-line px-4 py-3 text-[13px] last:border-b-0"
              >
                <div>
                  <div className="font-semibold tracking-tight text-ink">{source.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    {source.slug} · {source.jurisdiction}
                  </div>
                </div>
                <div className="font-mono text-[11.5px] text-muted">
                  {source.status.toLowerCase()}
                </div>
                <div className="font-mono text-[11.5px] text-muted">
                  {source.runs[0]?.finishedAt ? fmtDate(source.runs[0].finishedAt) : "—"}
                </div>
                <div className="font-mono text-[11.5px] text-muted">
                  {source.lastOkAt ? `${fmtDate(source.lastOkAt)} · ${freshnessBucket(source.lastOkAt)}` : "—"}
                </div>
                <div className="text-[12px] leading-snug text-muted">
                  {source.lastError ?? "No current error."}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <header className="mb-3.5 flex items-baseline justify-between border-b border-line pb-2.5">
            <h2 className="text-[18px] font-semibold tracking-tight text-ink">
              Brief delivery
            </h2>
            <Link href="/briefs" className="font-mono text-[11.5px] text-muted underline decoration-line decoration-1 underline-offset-2 hover:text-ink">
              Open briefs
            </Link>
          </header>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            {recentRecipients.length === 0 && (
              <div className="px-4 py-8 text-sm text-muted">
                No queued recipients exist yet.
              </div>
            )}
            {recentRecipients.map((recipient) => (
              <Link
                key={recipient.id}
                href={`/briefs/${recipient.brief.id}`}
                className="block border-b border-line px-4 py-3.5 last:border-b-0 hover:bg-bg-2"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                  Issue {recipient.brief.issueNumber}
                </div>
                <div className="mt-0.5 text-[14px] font-semibold tracking-tight text-ink">
                  {recipient.email}
                </div>
                <div className="mt-1 text-[12px] text-muted">
                  Sent {fmtDate(recipient.sentAt)} · {recipient.brief.title}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-2 px-4 py-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </div>
      <div className="mt-1 font-mono text-[28px] font-semibold tracking-tight text-ink">
        {value}
      </div>
      <div className="mt-1 text-[12px] text-muted">{note}</div>
    </div>
  );
}

function MetricMini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-2 px-3.5 py-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </div>
      <div className={`mt-1 font-mono text-[22px] font-semibold tracking-tight ${tone}`}>
        {value}
      </div>
    </div>
  );
}
