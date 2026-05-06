"use client";

import { CORRIDORS, type ScoreBand, BAND_LABEL, BAND_COLOR } from "@gcir/shared";
import { cn } from "@/lib/cn";
import type { RadarProject } from "./RadarShell";

export function FilterRail({
  projects,
  corridorFilter,
  setCorridorFilter,
  bandFilter,
  setBandFilter,
  visibleCount: _visibleCount,
  visibleProjectIds: _visibleProjectIds,
}: {
  projects: RadarProject[];
  corridorFilter: Set<string>;
  setCorridorFilter: (s: Set<string>) => void;
  bandFilter: Set<ScoreBand>;
  setBandFilter: (s: Set<ScoreBand>) => void;
  visibleCount?: number;
  visibleProjectIds?: string[];
}) {
  void _visibleProjectIds;
  function toggle<T>(set: Set<T>, key: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  }

  const corridorCounts = new Map<string, number>();
  for (const p of projects) {
    if (!p.corridor) continue;
    corridorCounts.set(p.corridor, (corridorCounts.get(p.corridor) ?? 0) + 1);
  }

  const bandCounts = projects.reduce(
    (acc, p) => ({ ...acc, [p.band]: (acc[p.band] ?? 0) + 1 }),
    {} as Record<ScoreBand, number>,
  );
  const visibleCount = _visibleCount ?? projects.length;
  const selectedCorridors = corridorFilter.size;
  const selectedBands = bandFilter.size;

  return (
    <aside
      className={cn(
        "flex w-[var(--rail-w)] flex-shrink-0 flex-col overflow-y-auto border-r border-line bg-bone-2/40 backdrop-blur-sm",
        "scrollbar-thin",
      )}
    >
      {/* Scope card */}
      <div className="border-b border-line px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.20em] text-muted">
            §A · Scope
          </span>
          <span className="font-mono text-[10px] tracking-wider text-muted-2">
            in view
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <RailMetric label="visible" value={String(visibleCount)} accent />
          <RailMetric label="total"   value={String(projects.length)} />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-[4px] border border-line bg-bone/85 px-2.5 py-2 text-[11px] text-muted">
          <span>
            <span className="font-mono text-ink-3 font-semibold">{selectedCorridors}</span>
            <span className="text-muted-2">/{CORRIDORS.length}</span>
            <span className="ml-1">corridors</span>
          </span>
          <span className="text-muted-2">·</span>
          <span>
            <span className="font-mono text-ink-3 font-semibold">{selectedBands}</span>
            <span className="text-muted-2">/4</span>
            <span className="ml-1">bands</span>
          </span>
        </div>
      </div>

      <Section title="Corridor" sectionCode="§B" count={CORRIDORS.length}>
        {CORRIDORS.map((c) => {
          const on = corridorFilter.has(c);
          return (
            <button
              key={c}
              data-active={on ? "true" : "false"}
              className="gcir-rail-row"
              onClick={() => toggle(corridorFilter, c, setCorridorFilter)}
            >
              <span className="flex items-center gap-2">
                <Check on={on} />
                <span className={on ? "font-medium text-ink" : "text-ink-3"}>{c}</span>
              </span>
              <span className="font-mono text-[11px] text-muted">
                {corridorCounts.get(c) ?? 0}
              </span>
            </button>
          );
        })}
      </Section>

      <Section title="Score band" sectionCode="§C">
        {(["high", "elevated", "watch", "weak"] as ScoreBand[]).map((b) => {
          const on = bandFilter.has(b);
          return (
            <button
              key={b}
              data-active={on ? "true" : "false"}
              className="gcir-rail-row"
              onClick={() => toggle(bandFilter, b, setBandFilter)}
            >
              <span className="flex items-center gap-2">
                <Check on={on} />
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: BAND_COLOR[b] }}
                />
                <span className={on ? "font-medium text-ink" : "text-ink-3"}>
                  {BAND_LABEL[b]}
                </span>
              </span>
              <span className="font-mono text-[11px] text-muted">
                {bandCounts[b] ?? 0}
              </span>
            </button>
          );
        })}
      </Section>

      <Section title="Source family" sectionCode="§D">
        {(
          [
            ["Land control", 25],
            ["Environmental permits", 15],
            ["Incentives", 15],
            ["Utility / power", 15],
            ["Entity formation", 10],
            ["Local agendas", 8],
            ["Port / terminal", 8],
            ["Financing", 7],
            ["SEC / corporate", 7],
            ["Procurement", 5],
          ] as const
        ).map(([name, w]) => (
          <div key={name} data-active="true" className="gcir-rail-row">
            <span className="flex items-center gap-2">
              <Check on={true} />
              <span className="text-ink-3">{name}</span>
            </span>
            <span className="font-mono text-[11px] text-muted">{w}</span>
          </div>
        ))}
      </Section>

      <Section title="Watchlists" sectionCode="§E" rightLabel="+ new">
        {(
          [
            ["River corridor LNG", 7],
            ["Hyundai-adjacent", 3],
            ["Lake Charles 200ac+", 5],
            ["Data-center load", 9],
            ["EBR 50ac+ infill", 12],
          ] as const
        ).map(([n, c]) => (
          <div key={n} className="gcir-rail-row">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-info" />
              <span className="text-ink-3">{n}</span>
            </span>
            <span className="font-mono text-[11px] text-muted">{c}</span>
          </div>
        ))}
      </Section>

      <div className="mt-auto border-t border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-2">
        <div className="flex items-center justify-between">
          <span>console · operating</span>
          <span className="text-phosphor-dim">●</span>
        </div>
      </div>
    </aside>
  );
}

function RailMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[5px] border bg-bone px-2.5 py-2 transition-colors",
        accent ? "border-accent/40 shadow-[inset_0_-2px_0_rgba(233,165,57,0.35)]" : "border-line",
      )}
    >
      <div className={cn("font-display text-[22px] leading-none", accent ? "text-ink" : "text-ink-2")}>
        {value}
      </div>
      <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">{label}</div>
    </div>
  );
}

function Section({
  title,
  sectionCode,
  count,
  rightLabel,
  children,
}: {
  title: string;
  sectionCode?: string;
  count?: number;
  rightLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line px-4 pb-2.5 pt-4">
      <div className="mb-2 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted">
        <div className="flex items-center gap-1.5">
          {sectionCode && <span className="font-mono font-normal text-muted-2">{sectionCode}</span>}
          <span>{title}</span>
        </div>
        {count != null && <span className="font-mono text-[10px] font-normal text-muted-2">{count}</span>}
        {rightLabel && (
          <button className="font-mono text-[10px] font-medium text-accent-ink transition-colors hover:text-ink">
            {rightLabel}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors",
        on ? "border-ink bg-ink" : "border-line-2 bg-bone-2",
      )}
    >
      {on && (
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-accent" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}
