"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import { fmtAcres } from "@/lib/format";
import type { RadarProject } from "../RadarShell";

type Detail = {
  scoreBreakdown?: {
    contributions?: Array<{
      family: string;
      weight: number;
      contribution: number;
    }>;
    rawSum?: number;
  };
  signalCount?: number;
  buyerCount?: number;
  windowMonths?: number | null;
  estimatedCapex?: string | null;
  latestAlert?: {
    id: string;
    title: string;
    reasonCode: string | null;
    publicCoverageFound: boolean | null;
    validationCostUsd: number | null;
    validatedAt: string | null;
  } | null;
};

const FAMILY_COLOR: Record<string, string> = {
  LAND_CONTROL: "#10a37f",
  ENVIRONMENTAL_PERMIT: "#1f5fa8",
  INCENTIVE: "#ca8a04",
  UTILITY_POWER: "#7e22ce",
  ENTITY_FORMATION: "#6b6b6b",
  PORT_TERMINAL: "#0891b2",
  PUBLIC_COMPANY: "#dc2626",
  LOCAL_AGENDA: "#475569",
  FINANCING: "#b3261e",
  PROCUREMENT: "#1f5fa8",
};

export function SummaryTab({
  project,
  detail,
}: {
  project: RadarProject;
  detail: Detail | undefined;
}) {
  const breakdown = detail?.scoreBreakdown?.contributions ?? [];

  const publicCoverageFound = detail?.latestAlert?.publicCoverageFound === true;
  const wasValidated = detail?.latestAlert?.validatedAt != null;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[14.5px] leading-relaxed tracking-tight text-ink-2">
        <p>
          Suspected <strong className="font-semibold text-ink">{project.facilityType ?? "industrial-formation"}</strong>{" "}
          activity in <strong className="font-semibold text-ink">{project.parishCounty}</strong>.
          {project.acres != null && (
            <> Land control of <strong className="font-semibold text-ink">{fmtAcres(project.acres)}</strong>{" "}
              detected, with corroborating signals across multiple free Gulf Coast public sources.</>
          )}
        </p>
        <p className="mt-3">
          Stage:{" "}
          <strong className="font-semibold text-ink">
            {project.stage.toLowerCase().replace(/_/g, "-")}
          </strong>
          . Score: <strong className="font-semibold text-ink">{project.score} / 100</strong>.
        </p>
      </div>

      {publicCoverageFound && (
        <div className="rounded-md border border-info/30 bg-info/[0.06] px-3.5 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-info">
            <AlertTriangle className="h-3.5 w-3.5" /> Public announcement detected
          </div>
          <div className="text-[13px] leading-snug text-ink-2">
            The Perplexity validation pass found credible public coverage that already
            explains this assembly. Score has been backed off and the alert is
            silenced — see the Evidence tab for citations.
          </div>
        </div>
      )}

      {wasValidated && !publicCoverageFound && (
        <div className="rounded-md border border-accent/30 bg-accent/[0.06] px-3.5 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-accent-ink">
            <ShieldCheck className="h-3.5 w-3.5" /> Validated · no public coverage
          </div>
          <div className="text-[13px] leading-snug text-ink-2">
            Perplexity searched the open web and did not find a credible public source
            explaining this assembly. The alert publishes with confidence.
          </div>
        </div>
      )}

      <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3.5 py-3">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-warn">
          <AlertTriangle className="h-3.5 w-3.5" /> Why this matters now
        </div>
        <div className="text-[13px] leading-snug text-ink-2">
          {publicCoverageFound
            ? "Already-public evidence prices most of this in. Hold off on speculative options unless adjacent owners remain reachable; check the Actions tab for revised guidance."
            : project.score >= 90
              ? "The financing-surfaced stage is the latest acquisition window before public announcement. Adjacent landowners within a 1.5-mile ring are likely to see option offers in the next 30–60 days."
              : project.score >= 75
                ? "Site-control evidence is strong but pre-announcement. Adjacent options remain available; once incentives or financing surface, prices will move quickly."
                : "Watchlist evidence is corroborated but early. Map adjacent assets and monitor the next agenda or filing window."}
        </div>
      </div>

      {breakdown.length > 0 && (
        <div>
          <div className="gcir-section-h">
            Score breakdown <span className="font-normal normal-case tracking-normal">weighted contributors</span>
          </div>
          <div className="flex flex-col gap-2">
            {breakdown.map((b) => (
              <div
                key={b.family}
                className="grid grid-cols-[140px_1fr_56px] items-center gap-3 text-[13px]"
              >
                <span className="text-ink-2">{b.family.toLowerCase().replace(/_/g, " ")}</span>
                <div className="h-1 overflow-hidden rounded bg-bg-3">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${Math.min(100, (b.contribution / b.weight) * 100)}%`,
                      background: FAMILY_COLOR[b.family] ?? "#0d0d0d",
                    }}
                  />
                </div>
                <span className="text-right font-mono text-[11.5px] text-muted">
                  +{b.contribution.toFixed(1)} / {b.weight}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
