import Link from "next/link";
import { prisma } from "@gcir/db";
import { fmtDate } from "@/lib/format";
import { ShareLinkButton } from "@/components/share-link-button";
import { TrackedLink } from "@/components/tracked-link";
import { UsageEventTracker } from "@/components/usage-event-tracker";
import { CreateWatchlistButton } from "./create-watchlist-button";
import { PromoteCandidateButton } from "./promote-candidate-button";
import { PromoteTopCandidatesButton } from "./promote-top-candidates-button";

export const dynamic = "force-dynamic";

type Audience = "Investor" | "Developer" | "Engineering" | "Construction";

const ACTION_AUDIENCE: Record<string, Audience[]> = {
  MAP_ADJACENT_PARCELS: ["Investor", "Developer"],
  IDENTIFY_OWNERS: ["Investor", "Developer"],
  ESTIMATE_ASSEMBLAGE_VALUE: ["Investor", "Developer"],
  CHECK_ZONING: ["Developer", "Engineering"],
  CHECK_FLOOD_WETLANDS: ["Developer", "Engineering"],
  CALL_BROKER_OWNER: ["Investor", "Developer"],
  MONITOR_NEXT_BOARD: ["Developer", "Engineering", "Construction"],
  PREPARE_OPTION_STRATEGY: ["Investor", "Developer"],
  PURSUE_ENTITLEMENT: ["Developer", "Engineering"],
  PASS: ["Investor", "Developer"],
  ESCALATE_ANALYST: ["Investor", "Developer", "Engineering", "Construction"],
};

const CANDIDATE_STAGE: Record<string, string> = {
  ENVIRONMENTAL_PERMIT: "PERMIT_SURFACED",
  PUBLIC_COMPANY: "FINANCING_SURFACED",
};

function emergingCandidateMoves(candidate: { family: string; summary: string }): Array<{
  audience: Audience;
  move: string;
}> {
  if (candidate.family === "ENVIRONMENTAL_PERMIT") {
    return [
      {
        audience: "Investor",
        move: "Decide whether this permit trail implies a real expansion worth adding to a tracked corridor watchlist.",
      },
      {
        audience: "Developer",
        move: "Read the permit context as an early site-readiness clue before treating it as a full project thesis.",
      },
      {
        audience: "Engineering",
        move: `Inspect the facility/process scope in ${candidate.summary} and translate it into likely utility, emissions, or site-constraint implications.`,
      },
      {
        audience: "Construction",
        move: "Monitor whether permit progression is followed by EPC, procurement, or board-level milestones that justify execution tracking.",
      },
    ];
  }

  return [
    {
      audience: "Investor",
      move: "Read the filing as an early capital-allocation or sponsor-intent signal before it shows up in parcel or permit evidence.",
    },
    {
      audience: "Developer",
      move: "Check whether the company signal points to a specific site, corridor, or industrial subsector worth pre-staging.",
    },
    {
      audience: "Engineering",
      move: "Translate the filing context into likely facility type, power/load, or entitlement implications if the project localizes.",
    },
    {
      audience: "Construction",
      move: "Watch for follow-on supplier, EPC, or public procurement traces before treating this as a build-phase opportunity.",
    },
  ];
}

function alertLane(alert: {
  reasonCode: string | null;
  title: string;
}): "quiet_assembly" | "owner_concentration" | "candidate_promoted" | "other" {
  if (alert.reasonCode === "qlad.owner-concentration" || /owner concentration/i.test(alert.title)) {
    return "owner_concentration";
  }
  if (alert.reasonCode === "candidate.promoted" || /emerging (permit|company) candidate/i.test(alert.title)) {
    return "candidate_promoted";
  }
  if (alert.reasonCode?.startsWith("qlad.") || /quiet land assembly/i.test(alert.title)) {
    return "quiet_assembly";
  }
  return "other";
}

export default async function AlertsPage() {
  const [alerts, emergingSignals, existingCandidateProjects] = await Promise.all([
    prisma.alert.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 50,
      include: {
        project: {
          select: {
            id: true,
            publicId: true,
            name: true,
            stage: true,
            score: true,
            parishCounty: true,
            state: true,
            actions: {
              orderBy: [{ rank: "asc" }],
              take: 8,
              select: {
                id: true,
                kind: true,
                title: true,
                rank: true,
              },
            },
          },
        },
        watchlist: {
          select: {
            id: true,
            name: true,
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
      take: 200,
      select: {
        id: true,
        family: true,
        predicate: true,
        subjectLabel: true,
        observedAt: true,
        payload: true,
      },
    }),
    prisma.project.findMany({
      where: {
        status: "suspected",
        stage: {
          in: ["PERMIT_SURFACED", "FINANCING_SURFACED"],
        },
      },
      select: {
        id: true,
        name: true,
        stage: true,
        publicId: true,
        score: true,
      },
    }),
  ]);

  const liveAlerts = alerts.filter((alert) => alert.publishedAt && !alert.silencedAt);
  const silencedAlerts = alerts.filter((alert) => alert.silencedAt);
  const quietAssemblyAlerts = alerts.filter((alert) => alertLane(alert) === "quiet_assembly");
  const ownerConcentrationAlerts = alerts.filter((alert) => alertLane(alert) === "owner_concentration");
  const promotedCandidateAlerts = alerts.filter((alert) => alertLane(alert) === "candidate_promoted");
  const emergingCandidates = Array.from(
    emergingSignals.reduce((acc, signal) => {
      const payload = (signal.payload ?? {}) as {
        applicant?: string;
        facilityName?: string;
        companyName?: string;
        formType?: string;
        permitNo?: string;
        receivedDate?: string;
      };
      const label =
        payload.applicant ??
        payload.companyName ??
        signal.subjectLabel.split("·")[0]?.trim() ??
        signal.subjectLabel;
      const existing = acc.get(label);
      const summary =
        signal.family === "ENVIRONMENTAL_PERMIT"
          ? payload.facilityName
            ? `${payload.facilityName} · permit ${payload.permitNo ?? "pending"}`
            : signal.subjectLabel
          : payload.formType
            ? `${payload.formType} filing`
            : signal.subjectLabel;
      if (existing) {
        existing.count += 1;
        if (signal.observedAt > existing.observedAt) {
          existing.observedAt = signal.observedAt;
          existing.summary = summary;
          existing.family = signal.family;
        }
        return acc;
      }
      acc.set(label, {
        key: label,
        label,
        family: signal.family,
        summary,
        observedAt: signal.observedAt,
        count: 1,
      });
      return acc;
    }, new Map<string, { key: string; label: string; family: string; summary: string; observedAt: Date; count: number }>()),
  )
    .map(([, value]) => value)
    .map((candidate) => ({
      ...candidate,
      existingProject:
        existingCandidateProjects.find(
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
  const trackedEmergingCount = emergingCandidates.filter((candidate) => candidate.existingProject).length;
  const promotableEmergingCount = emergingCandidates.length - trackedEmergingCount;

  return (
    <main className="mx-auto max-w-[1180px] flex-1 overflow-y-auto px-10 py-10">
      <UsageEventTracker
        eventType="page_view"
        surface="alerts"
        metadata={{
          alertCount: alerts.length,
          emergingCandidateCount: emergingCandidates.length,
        }}
      />
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Alert stream
      </div>
      <h1 className="mb-2 text-[38px] font-semibold leading-[1.05] tracking-tighter text-ink">
        Live formation alerts
      </h1>
      <p className="max-w-[860px] text-[15.5px] leading-relaxed text-muted-2">
        This is the operator feed for formation objects that actually made it through scoring and alert creation. It is the shortest path from ingestion to something a deal team can forward, review, and act on.
      </p>

      <section className="mt-8 grid grid-cols-5 gap-3">
        <MetricCard label="Total alerts" value={String(alerts.length)} note="last 50 alerts" />
        <MetricCard label="Live alerts" value={String(liveAlerts.length)} note="published and not silenced" />
        <MetricCard label="Quiet assembly" value={String(quietAssemblyAlerts.length)} note="highest-confidence formation alerts" />
        <MetricCard
          label="Owner concentration"
          value={String(ownerConcentrationAlerts.length)}
          note="lower-confidence land block watches"
        />
        <MetricCard
          label="Promoted candidates"
          value={String(promotedCandidateAlerts.length)}
          note="permit/company candidates now tracked as projects"
        />
      </section>

      <section className="mt-6 rounded-md border border-line bg-bg-2 px-4 py-4 text-[13px] leading-snug text-muted">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          How to read this stream
        </div>
        <div>
          `Quiet Assembly` means the detector believes a coordinated industrial land-control pattern is forming.
          `Owner Concentration Watch` is weaker: a large land block with an institutional owner and industrial fit,
          but without enough evidence yet to call it a true assembly. `Promoted Candidate` means an operator turned a weaker permit/company trail into a tracked project so it can join the recurring alert, action, and review loop.
        </div>
        <div className="mt-2">
          Save the strongest alerts into shared watchlists so they start feeding recurring brief and review workflows.
        </div>
      </section>

      <section className="mt-10">
        <header className="mb-3.5 flex items-baseline justify-between border-b border-line pb-2.5">
          <h2 className="text-[18px] font-semibold tracking-tight text-ink">
            Emerging permit and company candidates
          </h2>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11.5px] text-muted">
              {emergingCandidates.length} non-QLAD live candidates
            </span>
            <PromoteTopCandidatesButton />
          </div>
        </header>

        <div className="mb-6 rounded-md border border-line bg-bg-2 px-4 py-4 text-[13px] leading-snug text-muted">
          These are live non-parcel candidates already present in the database from permit and public-company feeds. They are intentionally weaker than full formation alerts, but they widen the operator surface beyond the current quiet-assembly cluster set and give engineering, construction, and market-monitoring teams something live to track before a project hardens into a scored alert.
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <MetricCard label="Visible candidates" value={String(emergingCandidates.length)} note="current queue window" />
          <MetricCard label="Already tracked" value={String(trackedEmergingCount)} note="linked to tracked projects" />
          <MetricCard label="Still promotable" value={String(promotableEmergingCount)} note="not yet converted into projects" />
        </div>

        {emergingCandidates.length > 0 && (
          <div className="mb-10 grid gap-3 md:grid-cols-2">
            {emergingCandidates.map((candidate) => (
              <article
                key={candidate.key}
                className="rounded-md border border-line bg-white px-4 py-3.5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
                  <span>{candidate.family === "ENVIRONMENTAL_PERMIT" ? "permit candidate" : "company candidate"}</span>
                  <span className="font-mono">{candidate.count} signals</span>
                  <span className="font-mono">{fmtDate(candidate.observedAt)}</span>
                </div>
                <h3 className="text-[16px] font-semibold leading-tight tracking-tight text-ink">
                  {candidate.label}
                </h3>
                <div className="mt-1 text-[13px] leading-snug text-muted">
                  {candidate.summary}
                </div>
                <div className="mt-3 grid gap-2">
                  {emergingCandidateMoves(candidate).map((item) => (
                    <div
                      key={`${candidate.key}-${item.audience}`}
                      className="rounded-md border border-line bg-bg-2 px-3 py-2.5"
                    >
                      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted">
                        {item.audience}
                      </div>
                      <div className="text-[12.5px] leading-snug text-ink">
                        {item.move}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {candidate.existingProject ? (
                      <Link
                        href={`/radar?projectId=${encodeURIComponent(candidate.existingProject.id)}&focus=actions`}
                        className="gcir-btn"
                      >
                        Open tracked project
                      </Link>
                    ) : (
                      <PromoteCandidateButton
                        family={candidate.family}
                        label={candidate.label}
                        summary={candidate.summary}
                      />
                    )}
                    <Link
                      href={`/signals?family=${encodeURIComponent(candidate.family)}`}
                      className="gcir-btn"
                    >
                      Open {candidate.family === "ENVIRONMENTAL_PERMIT" ? "permit" : "company"} signals
                    </Link>
                  </div>
                  {candidate.existingProject && (
                    <div className="mt-2 text-[11.5px] text-muted">
                      Already tracked as{" "}
                      <span className="font-mono text-ink">{candidate.existingProject.publicId}</span>{" "}
                      · score {candidate.existingProject.score}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <header className="mb-3.5 flex items-baseline justify-between border-b border-line pb-2.5">
          <h2 className="text-[18px] font-semibold tracking-tight text-ink">
            Stream
          </h2>
          <div className="flex gap-2">
            <ShareLinkButton path="/alerts" label="Share alert stream" />
            <Link href={"/proof" as any} className="gcir-btn">
              Open proof
            </Link>
          </div>
        </header>

        {alerts.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-bg-2 px-6 py-12 text-center text-sm text-muted">
            No alerts have been created yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-md border border-line bg-white px-4 py-3.5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
                  <span className={alert.silencedAt ? "text-warn" : "text-ink"}>
                    {alert.silencedAt ? "silenced" : alert.publishedAt ? "published" : "draft"}
                  </span>
                  <span>
                    {alertLane(alert) === "owner_concentration"
                      ? "owner concentration"
                      : alertLane(alert) === "candidate_promoted"
                        ? "promoted candidate"
                      : alertLane(alert) === "quiet_assembly"
                        ? "quiet assembly"
                        : "other"}
                  </span>
                  <span className="font-mono">{fmtDate(alert.createdAt)}</span>
                  {alert.reasonCode && <span>{alert.reasonCode}</span>}
                  {alert.publicCoverageFound && <span>public coverage found</span>}
                  {alert.watchlist && <span>watchlist · {alert.watchlist.name}</span>}
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[18px] font-semibold leading-tight tracking-tight text-ink">
                      {alert.title}
                    </h3>
                    {alert.project && (
                      <div className="mt-1 flex flex-wrap gap-3 text-[12px] text-muted">
                        <span className="font-mono">{alert.project.publicId}</span>
                        <span>{alert.project.parishCounty ?? "Unknown parish"}</span>
                        <span>{alert.project.stage.toLowerCase().replace(/_/g, "-")}</span>
                        <span>score {alert.project.score}</span>
                      </div>
                    )}
                    <div className="mt-2 line-clamp-4 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-3">
                      {alert.body}
                    </div>
                    {alert.project && alert.project.actions.length > 0 && (
                      <div className="mt-3 rounded-md border border-line bg-bg-2 px-3 py-3">
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
                          Top moves by role
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {(["Investor", "Developer", "Engineering", "Construction"] as const).map((audience) => {
                            const topAction =
                              alert.project?.actions.find((action) =>
                                ACTION_AUDIENCE[action.kind]?.includes(audience),
                              ) ?? null;
                            return (
                              <div
                                key={audience}
                                className="rounded-md border border-line bg-white px-3 py-2.5"
                              >
                                <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted">
                                  {audience}
                                </div>
                                <div className="text-[12.5px] leading-snug text-ink">
                                  {topAction ? topAction.title : "No explicit role-specific move on this alert yet."}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="rounded-full border border-line px-3 py-1 font-mono text-[14px] font-semibold text-ink">
                      {alert.score}
                    </div>
                    {alert.watchlist ? (
                      <Link href={`/watchlists/${alert.watchlist.id}`} className="gcir-btn">
                        Open watchlist
                      </Link>
                    ) : alert.project ? (
                      <CreateWatchlistButton
                        projectId={alert.project.id}
                        projectName={alert.project.name}
                      />
                    ) : null}
                    {alert.project && (
                      <TrackedLink
                        href={`/radar?projectId=${encodeURIComponent(alert.project.id)}`}
                        eventType="open_radar"
                        surface="alerts"
                        targetType="project"
                        targetId={alert.project.id}
                        metadata={{ publicId: alert.project.publicId }}
                        className="gcir-btn"
                      >
                        Open in radar
                      </TrackedLink>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
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
