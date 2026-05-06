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
  void _visibleCount;
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
        "flex w-[var(--rail-w)] flex-shrink-0 flex-col overflow-y-auto border-r border-line bg-bg-2",
      )}
    >
      <div className="border-b border-line-2 px-3.5 py-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Radar scope
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <RailMetric label="visible" value={String(visibleCount)} />
          <RailMetric label="total" value={String(projects.length)} />
        </div>
        <div className="mt-2 rounded-md border border-line bg-white px-2.5 py-2 text-[11.5px] text-muted">
          {selectedCorridors}/{CORRIDORS.length} corridors · {selectedBands}/4 score bands
        </div>
      </div>
      <Section title="Corridor" count={CORRIDORS.length}>
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
                {c}
              </span>
              <span className="font-mono text-[11.5px] text-muted">
                {corridorCounts.get(c) ?? 0}
              </span>
            </button>
          );
        })}
      </Section>

      <Section title="Score band">
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
                  className="h-2 w-2 rounded-sm"
                  style={{ background: BAND_COLOR[b] }}
                />
                {BAND_LABEL[b]}
              </span>
              <span className="font-mono text-[11.5px] text-muted">
                {bandCounts[b] ?? 0}
              </span>
            </button>
          );
        })}
      </Section>

      <Section title="Source family">
        {[
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
        ].map(([name, w]) => (
          <div key={String(name)} data-active="true" className="gcir-rail-row">
            <span className="flex items-center gap-2">
              <Check on={true} />
              {name as string}
            </span>
            <span className="font-mono text-[11.5px] text-muted">{w as number}</span>
          </div>
        ))}
      </Section>

      <Section title="Watchlists" rightLabel="+ new">
        {[
          ["River corridor LNG", 7],
          ["Hyundai-adjacent", 3],
          ["Lake Charles 200ac+", 5],
          ["Data-center load", 9],
          ["EBR 50ac+ infill", 12],
        ].map(([n, c]) => (
          <div key={String(n)} className="gcir-rail-row">
            <span className="flex items-center gap-2 text-muted">{n as string}</span>
            <span className="font-mono text-[11.5px] text-muted">{c as number}</span>
          </div>
        ))}
      </Section>
    </aside>
  );
}

function RailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white px-2.5 py-2">
      <div className="font-mono text-[15px] font-semibold leading-none text-ink">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.06em] text-muted">{label}</div>
    </div>
  );
}

function Section({
  title,
  count,
  rightLabel,
  children,
}: {
  title: string;
  count?: number;
  rightLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line-2 px-3.5 pb-2 pt-3.5">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
        <span>{title}</span>
        {count != null && <span className="font-mono text-[10.5px] text-muted-2">{count}</span>}
        {rightLabel && (
          <span className="font-mono text-[10.5px] text-muted-2">{rightLabel}</span>
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
        "inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-sm border",
        on ? "border-ink bg-ink" : "border-stone-300 bg-white",
      )}
    >
      {on && (
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}
