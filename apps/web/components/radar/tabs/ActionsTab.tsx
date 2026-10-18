"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { ArrowRight, RefreshCcw, ShieldAlert } from "lucide-react";
import { ConfPill } from "@/components/conf-pill";
import { cn } from "@/lib/cn";

type Action = {
  id: string;
  rank: number;
  kind: string;
  title: string;
  rationale: string;
  confidence: number;
  reasonCode: string | null;
  estTimeMin: number | null;
};

type Review = {
  id: string;
  state: string;
  note: string | null;
  createdAt: string;
  reviewerId: string | null;
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());
type DrawerTab = "summary" | "timeline" | "parcels" | "entities" | "evidence" | "actions";
type Audience = "All" | "Investor" | "Developer" | "Engineering" | "Construction";
type ReviewState = "WATCH" | "ESCALATED" | "VALID" | "FALSE_POSITIVE" | "DISMISSED";

const REVIEW_ACTIONS: Array<{ state: ReviewState; label: string }> = [
  { state: "WATCH", label: "Mark watch" },
  { state: "ESCALATED", label: "Escalate" },
  { state: "VALID", label: "Mark valid" },
  { state: "FALSE_POSITIVE", label: "False positive" },
  { state: "DISMISSED", label: "Dismiss" },
];

const AUDIENCE_OPTIONS: Audience[] = ["All", "Investor", "Developer", "Engineering", "Construction"];
const ROLE_LANES: Array<{
  audience: Exclude<Audience, "All">;
  title: string;
  description: string;
}> = [
  {
    audience: "Investor",
    title: "Investor lane",
    description: "Decide whether to pursue, pass, or underwrite the assemblage before the signal gets crowded.",
  },
  {
    audience: "Developer",
    title: "Developer lane",
    description: "Pressure-test land control, entitlement, and tract viability before committing time to a thesis.",
  },
  {
    audience: "Engineering",
    title: "Engineering lane",
    description: "Work the physical and regulatory constraints that determine whether the site can actually perform.",
  },
  {
    audience: "Construction",
    title: "Construction lane",
    description: "Track board, schedule, and execution triggers that matter once the site begins to harden into a project.",
  },
];

const ACTION_META: Record<
  string,
  {
    audience: Audience[];
    tab: DrawerTab;
    cta: string;
  }
> = {
  MAP_ADJACENT_PARCELS: {
    audience: ["Investor", "Developer"],
    tab: "parcels",
    cta: "Open parcels",
  },
  IDENTIFY_OWNERS: {
    audience: ["Investor", "Developer"],
    tab: "entities",
    cta: "Open entities",
  },
  ESTIMATE_ASSEMBLAGE_VALUE: {
    audience: ["Investor", "Developer"],
    tab: "parcels",
    cta: "Review site",
  },
  CHECK_ZONING: {
    audience: ["Developer", "Engineering"],
    tab: "parcels",
    cta: "Inspect site",
  },
  CHECK_FLOOD_WETLANDS: {
    audience: ["Developer", "Engineering"],
    tab: "parcels",
    cta: "Inspect constraints",
  },
  CALL_BROKER_OWNER: {
    audience: ["Investor", "Developer"],
    tab: "entities",
    cta: "Open owners",
  },
  MONITOR_NEXT_BOARD: {
    audience: ["Developer", "Engineering", "Construction"],
    tab: "timeline",
    cta: "Open timeline",
  },
  PREPARE_OPTION_STRATEGY: {
    audience: ["Investor", "Developer"],
    tab: "summary",
    cta: "Review thesis",
  },
  PURSUE_ENTITLEMENT: {
    audience: ["Developer", "Engineering"],
    tab: "evidence",
    cta: "Open evidence",
  },
  PASS: {
    audience: ["Investor", "Developer"],
    tab: "summary",
    cta: "Review summary",
  },
  ESCALATE_ANALYST: {
    audience: ["Investor", "Developer", "Engineering", "Construction"],
    tab: "evidence",
    cta: "Review evidence",
  },
};

export function ActionsTab({ projectId }: { projectId: string }) {
  const { data, mutate, isLoading } = useSWR<{ actions: Action[] }>(
    `/api/projects/${projectId}/actions`,
    fetcher,
  );
  const { data: reviewData, mutate: mutateReviews } = useSWR<{ reviews: Review[] }>(
    `/api/projects/${projectId}/review`,
    fetcher,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewPending, setReviewPending] = useState<ReviewState | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<Audience>("All");
  const actions = data?.actions ?? [];
  const reviews = reviewData?.reviews ?? [];
  const latestReview = reviews[0] ?? null;

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      if (audienceFilter === "All") return true;
      const meta = ACTION_META[action.kind];
      return meta?.audience.includes(audienceFilter) ?? false;
    });
  }, [actions, audienceFilter]);

  const laneSummaries = useMemo(
    () =>
      ROLE_LANES.map((lane) => {
        const laneActions = actions.filter((action) =>
          ACTION_META[action.kind]?.audience.includes(lane.audience) ?? false,
        );
        return {
          ...lane,
          count: laneActions.length,
          topAction: laneActions[0] ?? null,
        };
      }),
    [actions],
  );

  async function generateActions() {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/actions`, {
        method: "POST",
      });
      if (response.ok) {
        await mutate();
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function setReviewState(state: ReviewState) {
    setReviewPending(state);
    setReviewError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setReviewError(body?.error ?? "Could not update analyst review.");
        return;
      }
      await mutateReviews();
    } catch {
      setReviewError("Could not update analyst review.");
    } finally {
      setReviewPending(null);
    }
  }

  function jumpToTab(tab: DrawerTab) {
    window.dispatchEvent(
      new CustomEvent("gcir:drawer-tab", {
        detail: { projectId, tab },
      }),
    );
  }

  return (
    <div>
      {actions.length > 0 && (
        <section className="mb-3.5 rounded-md border border-line bg-bg-2 px-3.5 py-3">
          <div className="mb-3 rounded-md border border-line bg-white px-3 py-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Operating lanes
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {laneSummaries.map((lane) => (
                <button
                  key={lane.audience}
                  type="button"
                  onClick={() => setAudienceFilter(lane.audience)}
                  className={cn(
                    "rounded-md border px-3 py-3 text-left transition-colors",
                    audienceFilter === lane.audience
                      ? "border-ink bg-bg-2"
                      : "border-line bg-white hover:bg-bg-2",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink">
                      {lane.title}
                    </div>
                    <div className="font-mono text-[11px] text-muted">
                      {lane.count} actions
                    </div>
                  </div>
                  <div className="text-[12px] leading-snug text-muted">
                    {lane.description}
                  </div>
                  <div className="mt-2 text-[12px] text-ink">
                    {lane.topAction ? (
                      <>
                        <span className="font-semibold">Top move:</span> {lane.topAction.title}
                      </>
                    ) : (
                      "No role-specific actions on this project yet."
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Role lens
          </div>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAudienceFilter(option)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] transition-colors",
                  audienceFilter === option
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-white text-muted hover:text-ink",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-2 text-[12px] leading-snug text-muted">
            {audienceFilter === "All"
              ? `Showing all ${filteredActions.length} actions across investor, developer, engineering, and construction workflows.`
              : `Showing ${filteredActions.length} actions most relevant to ${audienceFilter.toLowerCase()} users.`}
          </div>
        </section>
      )}

      {actions.length === 0 && (
        <div className="rounded-md border border-dashed border-line bg-bg-2 px-4 py-6 text-center">
          <div className="text-sm text-muted">
            {isLoading
              ? "Loading recommended actions..."
              : "No recommended actions yet. Generate them from the current evidence package."}
          </div>
          <button
            type="button"
            onClick={generateActions}
            disabled={isGenerating}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")} />
            {isGenerating ? "Generating..." : "Generate actions"}
          </button>
        </div>
      )}

      {actions.length > 0 && filteredActions.length === 0 && (
        <div className="mb-3 rounded-md border border-dashed border-line bg-white px-4 py-5 text-sm text-muted">
          No actions are currently tagged for the {audienceFilter.toLowerCase()} lens on this project.
        </div>
      )}

      {filteredActions.map((a, i) => {
        const meta = ACTION_META[a.kind] ?? {
          audience: ["Investor", "Developer"] as Audience[],
          tab: "summary" as DrawerTab,
          cta: "Review summary",
        };
        return (
          <article
            key={a.id}
            className={cn(
              "mb-2.5 flex items-start gap-3.5 rounded-md border px-4 py-3.5",
              i === 0 ? "border-ink bg-bg-2 shadow-sm" : "border-line bg-white",
            )}
          >
            <div
              className={cn(
                "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11.5px] font-semibold",
                i === 0 ? "bg-ink text-white" : "border border-line bg-white text-ink",
              )}
            >
              {a.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {meta.audience.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-line bg-white px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <h4 className="text-[14px] font-semibold leading-snug tracking-tight text-ink">
                {a.title}
              </h4>
              <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{a.rationale}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                <ConfPill confidence={a.confidence} />
                <span>Next surface · {meta.tab}</span>
                {a.reasonCode && <span>Reason · {a.reasonCode}</span>}
                {a.estTimeMin != null && <span>~{Math.round(a.estTimeMin / 5) * 5}m</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => jumpToTab(meta.tab)}
              className={cn(
                "flex-shrink-0 self-center",
                i === 0 ? "gcir-btn-primary" : "gcir-btn",
              )}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {meta.cta}
            </button>
          </article>
        );
      })}

      <div className="mt-4 rounded-md border border-line bg-bg-2 px-3.5 py-3.5 text-[13px] text-ink-3">
        <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
          <ShieldAlert className="h-4 w-4 text-muted" />
          Analyst review
        </div>
        <div className="mb-3 text-[12.5px] leading-snug text-muted">
          High-impact conclusions require human review before they ship in a paid investor brief.
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {REVIEW_ACTIONS.map((action) => (
            <button
              key={action.state}
              type="button"
              onClick={() => setReviewState(action.state)}
              disabled={reviewPending !== null}
              className="gcir-btn"
            >
              {reviewPending === action.state ? "Saving..." : action.label}
            </button>
          ))}
        </div>
        {reviewError && <div className="mb-2 text-[12px] text-crit">{reviewError}</div>}
        {latestReview ? (
          <div className="rounded-md border border-line bg-white px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
              Latest decision
            </div>
            <div className="mt-1 text-[13px] font-semibold text-ink">
              {latestReview.state.toLowerCase().replace(/_/g, "-")}
            </div>
            <div className="mt-0.5 text-[12px] text-muted">
              {new Date(latestReview.createdAt).toLocaleString()}
            </div>
            {latestReview.note && (
              <div className="mt-1 text-[12.5px] leading-snug text-muted">
                {latestReview.note}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-muted">No analyst decision recorded yet.</div>
        )}
      </div>
    </div>
  );
}
