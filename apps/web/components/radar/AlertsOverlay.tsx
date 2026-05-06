"use client";

import { Filter, MapPin, RadioTower } from "lucide-react";
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
}: {
  projects: RadarProject[];
  activeId: string | null;
  nowIso: string;
  onSelect: (id: string) => void;
}) {
  const topScore = projects[0]?.score ?? 0;
  const totalAcres = projects.reduce((sum, project) => sum + (project.acres ?? 0), 0);
  const watchedCount = projects.filter((project) => project.band === "watch").length;

  return (
    <aside
      className={cn(
        "absolute right-3.5 top-3.5 z-10",
        "flex w-[352px] flex-col overflow-hidden rounded-lg border border-line bg-white shadow-xl",
      )}
      style={{ maxHeight: "calc(100vh - var(--header-h) - var(--status-h) - 28px)" }}
    >
      <div className="border-b border-line-2 px-3.5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[13.5px] font-semibold tracking-tight">
              <RadioTower className="h-3.5 w-3.5 text-crit" />
              Live alert queue
            </div>
            <div className="mt-0.5 font-mono text-[10.5px] text-muted">
              last refresh · just now · auto
            </div>
          </div>
          <button className="gcir-icon-btn h-7 w-7" title="Filter">
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-md border border-line bg-bg-2 text-[11px]">
          <QueueMetric label="top score" value={topScore ? String(topScore) : "--"} />
          <QueueMetric label="watch" value={String(watchedCount)} />
          <QueueMetric label="acres" value={totalAcres ? Math.round(totalAcres).toLocaleString() : "0"} />
        </div>
      </div>

      <div className="flex gap-px border-b border-line-2 px-3 text-[12px] font-medium">
        <button className="border-b-2 border-ink px-2.5 py-2 text-ink">Priority · {projects.length}</button>
        <button className="border-b-2 border-transparent px-2.5 py-2 text-muted hover:text-ink">New</button>
        <button className="border-b-2 border-transparent px-2.5 py-2 text-muted hover:text-ink">Followed</button>
      </div>

      {projects[0] && (
        <div className="border-b border-line-2 bg-bg-2 px-3.5 py-2.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            Current lead
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-semibold text-ink">{projects[0].name}</div>
              <div className="mt-0.5 truncate text-[11px] text-muted">
                {projects[0].parishCounty} · {projects[0].stage.toLowerCase().replace(/_/g, "-")}
              </div>
            </div>
            <ScoreChip score={projects[0].score} />
          </div>
        </div>
      )}

      <div className="scrollbar-thin flex-1 overflow-y-auto p-1.5">
        {projects.length === 0 && (
          <div className="px-3 py-6 text-center text-[12.5px] text-muted">
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
                "flex w-full flex-col gap-1.5 rounded-lg p-3 text-left transition-colors",
                active
                  ? "border border-line bg-bg-3"
                  : "border border-transparent hover:bg-bg-3",
              )}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <div className={cn("mt-0.5 h-2 w-2 rounded-full", active ? "bg-crit" : "bg-stone-300")} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold leading-tight tracking-tight text-ink">
                        {p.name}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                    <MapPin className="h-3 w-3" />
                    {p.parishCounty} {p.state ? `· ${p.state}` : ""}
                  </div>
                </div>
                <ScoreChip score={p.score} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StageTag stage={p.stage as any} />
                {p.acres != null && <span className="gcir-tag">{fmtAcres(p.acres)}</span>}
                {p.facilityType && (
                  <span className="gcir-tag" title={p.facilityType}>
                    {p.facilityType.length > 22
                      ? p.facilityType.slice(0, 22) + "…"
                      : p.facilityType}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[11.5px] text-muted">
                <span>{p.firstSignalAt ? `first signal ${fmtAge(p.firstSignalAt, nowIso)}` : ""}</span>
                <span className="font-mono text-muted-2">{p.publicId}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function QueueMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-line px-2.5 py-2 last:border-r-0">
      <div className="font-mono text-[14px] font-semibold leading-none text-ink">{value}</div>
      <div className="mt-1 truncate text-[10px] uppercase tracking-[0.06em] text-muted">{label}</div>
    </div>
  );
}
