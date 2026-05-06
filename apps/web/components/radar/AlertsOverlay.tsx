"use client";

import { ChevronDown, ChevronUp, Filter, MapPin, RadioTower } from "lucide-react";
import { ScoreChip } from "@/components/score-chip";
import { StageTag } from "@/components/stage-tag";
import { fmtAcres, fmtAge } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { RadarProject } from "./RadarShell";

export function AlertsOverlay({
  projects,
  activeId,
  nowIso,
  onSelect,
  collapsed,
  onToggleCollapsed,
}: {
  projects: RadarProject[];
  activeId: string | null;
  nowIso: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const topScore = projects[0]?.score ?? 0;
  const totalAcres = projects.reduce((sum, project) => sum + (project.acres ?? 0), 0);
  const watchedCount = projects.filter((project) => project.band === "watch").length;

  if (collapsed) {
    return (
      <aside className="absolute right-3.5 top-3.5 z-10 w-[260px] overflow-hidden rounded-[6px] border border-bone/15 bg-[#0c100e]/85 text-bone shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-bone/[0.04]"
          title="Expand alert queue"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-[4px] bg-crit/[0.20] text-crit">
              <RadioTower className="h-3.5 w-3.5" />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-crit gcir-ping" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-[14.5px] tracking-tight text-bone">Alert queue</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-bone/45">
                {projects.length} in view · top {topScore || "--"}
              </span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-bone/40" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="absolute right-3.5 top-3.5 z-10 flex w-[372px] flex-col overflow-hidden rounded-[8px] border border-bone/15 bg-[#0c100e]/92 text-bone shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md"
      style={{ maxHeight: "calc(100vh - var(--header-h) - var(--status-h) - 28px)" }}
    >
      <div className="border-b border-bone/[0.08] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-bone">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-crit gcir-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-crit" />
              </span>
              Live alert queue
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-bone/40">
              auto · last refresh just now
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-bone/55 transition-colors hover:bg-bone/[0.06] hover:text-bone" title="Filter">
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-bone/55 transition-colors hover:bg-bone/[0.06] hover:text-bone"
              onClick={onToggleCollapsed}
              title="Collapse alert queue"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[5px] border border-bone/[0.10] bg-bone/[0.04]">
          <QueueMetric label="top score" value={topScore ? String(topScore) : "--"} accent />
          <QueueMetric label="watch"     value={String(watchedCount)} />
          <QueueMetric label="acres"     value={totalAcres ? Math.round(totalAcres).toLocaleString() : "0"} />
        </div>
      </div>

      <div className="flex gap-px border-b border-bone/[0.08] px-3 text-[11.5px] font-medium uppercase tracking-[0.10em]">
        <button className="border-b-2 border-accent px-2.5 py-2 text-bone">
          Priority <span className="ml-1 font-mono text-[10px] text-bone/45">{projects.length}</span>
        </button>
        <button className="border-b-2 border-transparent px-2.5 py-2 text-bone/45 transition-colors hover:text-bone">New</button>
        <button className="border-b-2 border-transparent px-2.5 py-2 text-bone/45 transition-colors hover:text-bone">Followed</button>
      </div>

      {projects[0] && (
        <div className="relative overflow-hidden border-b border-bone/[0.08] bg-bone/[0.03] px-4 py-3">
          <div className="absolute left-0 top-0 h-full w-[3px] bg-accent" />
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
            Current lead
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-display text-[16px] leading-tight tracking-tight text-bone">{projects[0].name}</div>
              <div className="mt-0.5 truncate font-mono text-[10.5px] uppercase tracking-[0.10em] text-bone/45">
                {projects[0].parishCounty} · {projects[0].stage.toLowerCase().replace(/_/g, "-")}
              </div>
            </div>
            <ScoreChip score={projects[0].score} className="border-bone/15 !text-bone" />
          </div>
        </div>
      )}

      <div className="scrollbar-thin flex-1 overflow-y-auto p-1.5">
        {projects.length === 0 && (
          <div className="px-3 py-6 text-center text-[12.5px] text-bone/40">
            No alerts in the current filter set.
          </div>
        )}
        {projects.map((p) => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={cn(
                "group relative flex w-full flex-col gap-1.5 rounded-[6px] p-3 text-left transition-all",
                active
                  ? "border border-accent/30 bg-accent/[0.06] shadow-[inset_0_0_0_1px_rgba(233,165,57,0.20)]"
                  : "border border-transparent hover:bg-bone/[0.04]",
              )}
            >
              {active && (
                <span className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-accent" />
              )}
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "mt-1 h-2 w-2 rounded-full transition-colors",
                        active ? "bg-accent shadow-[0_0_0_3px_rgba(233,165,57,0.18)]" : "bg-bone/30 group-hover:bg-bone/55",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-sans text-[13.5px] font-semibold leading-tight tracking-tight text-bone">
                        {p.name}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 mt-1 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.10em] text-bone/45">
                    <MapPin className="h-3 w-3" />
                    {p.parishCounty}{p.state ? ` · ${p.state}` : ""}
                  </div>
                </div>
                <ScoreChip score={p.score} className="!text-bone border-bone/15" />
              </div>
              <div className="ml-4 flex flex-wrap items-center gap-1.5">
                <StageTag stage={p.stage as never} className="!border-bone/15 !bg-bone/[0.05] !text-bone/65" />
                {p.acres != null && <span className="gcir-tag !border-bone/15 !bg-bone/[0.05] !text-bone/65">{fmtAcres(p.acres)}</span>}
                {p.facilityType && (
                  <span
                    className="gcir-tag !border-bone/15 !bg-bone/[0.05] !text-bone/65"
                    title={p.facilityType}
                  >
                    {p.facilityType.length > 22
                      ? p.facilityType.slice(0, 22) + "…"
                      : p.facilityType}
                  </span>
                )}
              </div>
              <div className="ml-4 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.10em] text-bone/40">
                <span>{p.firstSignalAt ? `signal ${fmtAge(p.firstSignalAt, nowIso)} ago` : ""}</span>
                <span>{p.publicId}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function QueueMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 border-r border-bone/[0.08] px-2.5 py-2 last:border-r-0">
      <div className={cn("font-display text-[20px] leading-none", accent ? "text-accent" : "text-bone")}>
        {value}
      </div>
      <div className="mt-1.5 truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-bone/45">
        {label}
      </div>
    </div>
  );
}
