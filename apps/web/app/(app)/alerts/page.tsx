import Link from "next/link";
import { prisma } from "@gcir/db";
import { ArrowUpRight, Radio, RadioTower } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { ShareLinkButton } from "@/components/share-link-button";
import { TrackedLink } from "@/components/tracked-link";
import { UsageEventTracker } from "@/components/usage-event-tracker";
import { PageHeader } from "@/components/page-header";
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
      { audience: "Investor",     move: "Decide whether this permit trail implies a real expansion worth adding to a tracked corridor watchlist." },
      { audience: "Developer",    move: "Read the permit context as an early site-readiness clue before treating it as a full project thesis." },
      { audience: "Engineering",  move: `Inspect the facility/process scope in ${candidate.summary} and translate it into likely utility, emissions, or site-constraint implications.` },
      { audience: "Construction", move: "Monitor whether permit progression is followed by EPC, procurement, or board-level milestones that justify execution tracking." },
    ];
  }

  return [
    { audience: "Investor",     move: "Read the filing as an early capital-allocation or sponsor-intent signal before it shows up in parcel or permit evidence." },
    { audience: "Developer",    move: "Check whether the company signal points to a specific site, corridor, or industrial subsector worth pre-staging." },
    { audience: "Engineering",  move: "Translate the filing context into likely facility type, power/load, or entitlement implications if the project localizes." },
    { audience: "Construction", move: "Watch for follow-on supplier, EPC, or public procurement traces before treating this as a build-phase opportunity." },
  ];
}

function alertLane(alert: { reasonCode: string | null; title: string }): "quiet_assembly" | "owner_concentration" | "candidate_promoted" | "other" {
  if (alert.reasonCode === "qlad.owner-concentration" || /owner concentration/i.test(alert.title)) return "owner_concentration";
  if (alert.reasonCode === "candidate.promoted" || /emerging (permit|company) candidate/i.test(alert.title)) return "candidate_promoted";
  if (alert.reasonCode?.startsWith("qlad.") || /quiet land assembly/i.test(alert.title)) return "quiet_assembly";
  return "other";
}

const LANE_LABEL: Record<string, { label: string; tone: "crit" | "accent" | "info" | "muted"; }> = {
  quiet_assembly:      { label: "Quiet assembly",     tone: "crit"   },
  owner_concentration: { label: "Owner concentration", tone: "accent" },
  candidate_promoted:  { label: "Promoted candidate",  tone: "info"   },
  other:               { label: "Other",               tone: "muted"  },
};

export default async function AlertsPage() {
  const [alerts, emergingSignals, existingCandidateProjects] = await Promise.all([
    prisma.alert.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 50,
      include: {
        project: {
          select: {
            id: true, publicId: true, name: true, stage: true, score: true, parishCounty: true, state: true,
            actions: {
              orderBy: [{ rank: "asc" }],
              take: 8,
              select: { id: true, kind: true, title: true, rank: true },
            },
          },
        },
        watchlist: { select: { id: true, name: true } },
      },
    }),
    prisma.signal.findMany({
      where: { family: { in: ["ENVIRONMENTAL_PERMIT", "PUBLIC_COMPANY"] } },
      orderBy: [{ observedAt: "desc" }],
      take: 200,
      select: { id: true, family: true, predicate: true, subjectLabel: true, observedAt: true, payload: true },
    }),
    prisma.project.findMany({
      where: { status: "suspected", stage: { in: ["PERMIT_SURFACED", "FINANCING_SURFACED"] } },
      select: { id: true, name: true, stage: true, publicId: true, score: true },
    }),
  ]);

  const liveAlerts = alerts.filter((alert) => alert.publishedAt && !alert.silencedAt);
  const quietAssemblyAlerts = alerts.filter((alert) => alertLane(alert) === "quiet_assembly");
  const ownerConcentrationAlerts = alerts.filter((alert) => alertLane(alert) === "owner_concentration");
  const promotedCandidateAlerts = alerts.filter((alert) => alertLane(alert) === "candidate_promoted");

  const emergingCandidates = Array.from(
    emergingSignals.reduce((acc, signal) => {
      const payload = (signal.payload ?? {}) as {
        applicant?: string; facilityName?: string; companyName?: string; formType?: string; permitNo?: string; receivedDate?: string;
      };
      const label = payload.applicant ?? payload.companyName ?? signal.subjectLabel.split("·")[0]?.trim() ?? signal.subjectLabel;
      const existing = acc.get(label);
      const summary =
        signal.family === "ENVIRONMENTAL_PERMIT"
          ? payload.facilityName ? `${payload.facilityName} · permit ${payload.permitNo ?? "pending"}` : signal.subjectLabel
          : payload.formType ? `${payload.formType} filing` : signal.subjectLabel;
      if (existing) {
        existing.count += 1;
        if (signal.observedAt > existing.observedAt) {
          existing.observedAt = signal.observedAt;
          existing.summary = summary;
          existing.family = signal.family;
        }
        return acc;
      }
      acc.set(label, { key: label, label, family: signal.family, summary, observedAt: signal.observedAt, count: 1 });
      return acc;
    }, new Map<string, { key: string; label: string; family: string; summary: string; observedAt: Date; count: number }>()),
  )
    .map(([, value]) => value)
    .map((candidate) => ({
      ...candidate,
      existingProject:
        existingCandidateProjects.find(
          (project) => project.name === candidate.label && project.stage === (CANDIDATE_STAGE[candidate.family] ?? "WATCH"),
        ) ?? null,
    }))
    .sort((a, b) => Number(Boolean(b.existingProject)) - Number(Boolean(a.existingProject)) || b.count - a.count || b.observedAt.getTime() - a.observedAt.getTime())
    .slice(0, 8);

  const trackedEmergingCount = emergingCandidates.filter((candidate) => candidate.existingProject).length;
  const promotableEmergingCount = emergingCandidates.length - trackedEmergingCount;

  return (
    <main className="mx-auto max-w-[1180px] flex-1 overflow-y-auto px-10 py-12">
      <UsageEventTracker
        eventType="page_view"
        surface="alerts"
        metadata={{ alertCount: alerts.length, emergingCandidateCount: emergingCandidates.length }}
      />

      <PageHeader
        sectionCode="§A"
        eyebrow="Live alert stream"
        title="Live formation alerts."
        titleAccent="The operator feed."
        description="This is the operator feed for formation objects that have made it through scoring and alert creation. The shortest path from ingestion to something a deal team can forward, review, and act on."
        meta={
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-crit gcir-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-crit" />
            </span>
            <RadioTower className="h-3 w-3 text-crit" />
            Live · stream OK
          </span>
        }
      />

      {/* Lane summary */}
      <section className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-[7px] border border-line bg-line/60 sm:grid-cols-5">
        <LaneStat value={String(alerts.length)}                 label="Total alerts"        sub="last 50 alerts" />
        <LaneStat value={String(liveAlerts.length)}             label="Live alerts"          sub="published · not silenced" tone="info" />
        <LaneStat value={String(quietAssemblyAlerts.length)}    label="Quiet assembly"       sub="highest-confidence formation" tone="crit" />
        <LaneStat value={String(ownerConcentrationAlerts.length)} label="Owner concentration" sub="weaker land-block watches" tone="accent" />
        <LaneStat value={String(promotedCandidateAlerts.length)}  label="Promoted candidates" sub="now tracked as projects" />
      </section>

      {/* Reading guide */}
      <section className="mb-10 grid grid-cols-12 items-start gap-6 rounded-[7px] border border-line bg-bone-2/40 px-7 py-6">
        <div className="col-span-12 md:col-span-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-ink">How to read</div>
          <div className="mt-1.5 font-display text-[20px] leading-tight tracking-tight text-ink">Stream key</div>
        </div>
        <div className="col-span-12 grid gap-3 md:col-span-9 md:grid-cols-3">
          <KeyEntry tone="crit"   label="Quiet Assembly"        body="The detector believes a coordinated industrial land-control pattern is forming." />
          <KeyEntry tone="accent" label="Owner Concentration"   body="A large land block with an institutional owner and industrial fit, but not yet a true assembly." />
          <KeyEntry tone="info"   label="Promoted Candidate"    body="An operator turned a permit/company trail into a tracked project so it joins the recurring alert loop." />
        </div>
      </section>

      {/* ── Emerging candidates ────────────────────────────────────────── */}
      <section className="mb-12">
        <header className="mb-5 flex items-baseline justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent-ink">§01</span>
            <Radio className="h-3.5 w-3.5 text-muted-2" />
            <h2 className="font-display text-[26px] leading-tight tracking-tight text-ink">Emerging candidates</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
              {emergingCandidates.length} non-QLAD live · {promotableEmergingCount} promotable
            </span>
            <PromoteTopCandidatesButton />
          </div>
        </header>

        <div className="mb-5 rounded-[7px] border border-line bg-bone-2/30 px-5 py-4 text-[13px] leading-[1.6] text-muted">
          Live non-parcel candidates from permit and public-company feeds. They are intentionally weaker than full
          formation alerts, but they widen the operator surface beyond the current quiet-assembly cluster set —
          and give engineering, construction, and market-monitoring teams something live to track before a project hardens.
        </div>

        {emergingCandidates.length > 0 && (
          <div className="grid gap-3.5 lg:grid-cols-2">
            {emergingCandidates.map((candidate) => (
              <article
                key={candidate.key}
                className="group relative overflow-hidden rounded-[7px] border border-line bg-bone p-5 transition-all hover:border-ink/30 hover:shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  <span className={
                    candidate.family === "ENVIRONMENTAL_PERMIT"
                      ? "rounded-[3px] border border-info/30 bg-info/10 px-1.5 py-0.5 text-info"
                      : "rounded-[3px] border border-crit/30 bg-crit/10 px-1.5 py-0.5 text-crit"
                  }>
                    {candidate.family === "ENVIRONMENTAL_PERMIT" ? "permit candidate" : "company candidate"}
                  </span>
                  <span className="text-muted-2">·</span>
                  <span>{candidate.count} signals</span>
                  <span className="text-muted-2">·</span>
                  <span>{fmtDate(candidate.observedAt)}</span>
                </div>
                <h3 className="font-display text-[22px] leading-tight tracking-tight text-ink">{candidate.label}</h3>
                <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{candidate.summary}</div>

                <div className="gcir-horizon mt-4 opacity-50" />

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {emergingCandidateMoves(candidate).map((item) => (
                    <div key={`${candidate.key}-${item.audience}`} className="rounded-[5px] border border-line bg-bone-2/60 px-3 py-2.5">
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-accent-ink">{item.audience}</div>
                      <div className="mt-1 text-[12.5px] leading-snug text-ink-2">{item.move}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {candidate.existingProject ? (
                      <Link
                        href={`/radar?projectId=${encodeURIComponent(candidate.existingProject.id)}&focus=actions`}
                        className="gcir-btn-primary"
                      >
                        Open tracked project <ArrowUpRight className="h-3 w-3" />
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
                    <div className="mt-2.5 text-[11.5px] text-muted">
                      Already tracked as{" "}
                      <span className="rounded-[3px] border border-line bg-bone-2 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink-2">
                        {candidate.existingProject.publicId}
                      </span>
                      {" "}· score{" "}
                      <span className="font-mono font-semibold text-ink-2">{candidate.existingProject.score}</span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Stream ─────────────────────────────────────────────────────── */}
      <section>
        <header className="mb-5 flex items-baseline justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent-ink">§02</span>
            <h2 className="font-display text-[26px] leading-tight tracking-tight text-ink">Stream</h2>
          </div>
          <div className="flex gap-2">
            <ShareLinkButton path="/alerts" label="Share alert stream" />
            <Link href={"/proof" as any} className="gcir-btn">
              Open proof <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </header>

        {alerts.length === 0 ? (
          <div className="rounded-[7px] border border-dashed border-line bg-bone-2/40 px-6 py-12 text-center text-sm text-muted">
            No alerts have been created yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((alert) => {
              const lane = alertLane(alert);
              const tone = LANE_LABEL[lane]?.tone ?? "muted";
              const stripeColor = tone === "crit" ? "var(--crit)" : tone === "accent" ? "var(--accent)" : tone === "info" ? "var(--info)" : "var(--muted-2)";
              return (
                <article key={alert.id} className="group relative overflow-hidden rounded-[7px] border border-line bg-bone p-5 transition-all hover:border-ink/30 hover:shadow-sm">
                  <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: stripeColor }} />

                  <div className="mb-2.5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    <span className={alert.silencedAt ? "rounded-[3px] border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-warn" : alert.publishedAt ? "rounded-[3px] border border-info/30 bg-info/10 px-1.5 py-0.5 text-info" : "rounded-[3px] border border-line bg-bone-2 px-1.5 py-0.5 text-muted"}>
                      {alert.silencedAt ? "silenced" : alert.publishedAt ? "published" : "draft"}
                    </span>
                    <LaneTag lane={lane} />
                    <span>{fmtDate(alert.createdAt)}</span>
                    {alert.reasonCode && <span className="text-muted-2">{alert.reasonCode}</span>}
                    {alert.publicCoverageFound && <span className="text-info">public coverage found</span>}
                    {alert.watchlist && <span className="text-accent-ink">watchlist · {alert.watchlist.name}</span>}
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[24px] leading-tight tracking-tight text-ink">{alert.title}</h3>
                      {alert.project && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted">
                          <span className="text-ink-3">{alert.project.publicId}</span>
                          <span>{alert.project.parishCounty ?? "Unknown parish"}</span>
                          <span>{alert.project.stage.toLowerCase().replace(/_/g, "-")}</span>
                          <span className="text-accent-ink">score {alert.project.score}</span>
                        </div>
                      )}
                      <div className="mt-3 line-clamp-4 whitespace-pre-wrap text-[13.5px] leading-[1.65] text-ink-2">
                        {alert.body}
                      </div>

                      {alert.project && alert.project.actions.length > 0 && (
                        <div className="mt-4 rounded-[6px] border border-line bg-bone-2/60 px-4 py-3.5">
                          <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-ink">
                            Top moves by role
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            {(["Investor", "Developer", "Engineering", "Construction"] as const).map((audience) => {
                              const topAction = alert.project?.actions.find((action) => ACTION_AUDIENCE[action.kind]?.includes(audience)) ?? null;
                              return (
                                <div key={audience} className="rounded-[4px] border border-line bg-bone px-3 py-2.5">
                                  <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">{audience}</div>
                                  <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">
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
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-bone-2 font-display text-[22px] tabular-nums leading-none text-ink">
                        {alert.score}
                      </div>
                      {alert.watchlist ? (
                        <Link href={`/watchlists/${alert.watchlist.id}`} className="gcir-btn">Watchlist</Link>
                      ) : alert.project ? (
                        <CreateWatchlistButton projectId={alert.project.id} projectName={alert.project.name} />
                      ) : null}
                      {alert.project && (
                        <TrackedLink
                          href={`/radar?projectId=${encodeURIComponent(alert.project.id)}`}
                          eventType="open_radar"
                          surface="alerts"
                          targetType="project"
                          targetId={alert.project.id}
                          metadata={{ publicId: alert.project.publicId }}
                          className="gcir-btn-accent"
                        >
                          Open in radar <ArrowUpRight className="h-3 w-3" />
                        </TrackedLink>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function LaneStat({ value, label, sub, tone = "default" }: { value: string; label: string; sub: string; tone?: "default" | "info" | "crit" | "accent" }) {
  const colors = {
    default: "text-ink",
    info:    "text-info",
    crit:    "text-crit",
    accent:  "text-accent-ink",
  };
  return (
    <div className="bg-bone px-5 py-5">
      <div className={`font-display text-[40px] leading-none tracking-[-0.025em] ${colors[tone]}`}>{value}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-1 text-[11.5px] leading-tight text-muted-2">{sub}</div>
    </div>
  );
}

function KeyEntry({ tone, label, body }: { tone: "crit" | "accent" | "info"; label: string; body: string }) {
  const dot = tone === "crit" ? "bg-crit" : tone === "accent" ? "bg-accent" : "bg-info";
  const textColor = tone === "crit" ? "text-crit" : tone === "accent" ? "text-accent-ink" : "text-info";
  return (
    <div className="rounded-[5px] border border-line bg-bone px-3.5 py-3">
      <div className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] ${textColor}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </div>
      <div className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">{body}</div>
    </div>
  );
}

function LaneTag({ lane }: { lane: string }) {
  const cfg = LANE_LABEL[lane] ?? LANE_LABEL.other!;
  const cls =
    cfg.tone === "crit" ? "border-crit/30 bg-crit/10 text-crit" :
    cfg.tone === "accent" ? "border-accent/40 bg-accent/15 text-accent-ink" :
    cfg.tone === "info" ? "border-info/30 bg-info/10 text-info" :
    "border-line bg-bone-2 text-muted";
  return (
    <span className={`rounded-[3px] border px-1.5 py-0.5 ${cls}`}>{cfg.label}</span>
  );
}
