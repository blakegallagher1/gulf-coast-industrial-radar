"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CORRIDORS, scoreBand, type ScoreBand } from "@gcir/shared";
import { Activity, Crosshair, Database, Factory, Search } from "lucide-react";
import { RadarMap } from "./Map";
import { AlertsOverlay } from "./AlertsOverlay";
import { FilterRail } from "./FilterRail";
import { StatusBar } from "./StatusBar";
import { Drawer } from "./Drawer";

export type RadarProject = {
  id: string;
  publicId: string;
  name: string;
  stage: string;
  score: number;
  band: ScoreBand;
  parishCounty: string;
  state: string;
  corridor: string;
  acres: number | null;
  facilityType: string | null;
  lat: number;
  lng: number;
  firstSignalAt: string | null;
  estimatedCapex: string | null;
};

type Health = { ok: number; degraded: number; total: number };

const COMMAND_RESULTS_LIMIT = 25;
const SOURCE_HEALTH_LABELS: Record<string, string> = {
  ACTIVE: "active",
  DEGRADED: "degraded",
  PAUSED: "paused",
  TODO: "mapped",
};

type CommandEvent = CustomEvent<{ query?: string }>;

export function RadarShell({
  projects,
  sources,
  health,
  initialProjectId,
  nowIso,
  plan = "free",
}: {
  projects: RadarProject[];
  sources: { slug: string; status: string }[];
  health: Health;
  initialProjectId?: string;
  nowIso: string;
  plan?: "free" | "pro";
}) {
  const [activeId, setActiveId] = useState<string | null>(projects[0]?.id ?? null);
  const [corridorFilter, setCorridorFilter] = useState<Set<string>>(new Set(CORRIDORS));
  const [bandFilter, setBandFilter] = useState<Set<ScoreBand>>(
    new Set<ScoreBand>(["high", "elevated", "watch"]),
  );
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandSelection, setCommandSelection] = useState(0);
  const [isAlertQueueCollapsed, setIsAlertQueueCollapsed] = useState(true);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(true);
  const commandInputRef = useRef<HTMLInputElement>(null);

  const visibleProjects = useMemo<RadarProject[]>(
    () =>
      projects.filter(
        (p) =>
          (p.corridor === "" || corridorFilter.has(p.corridor)) &&
          bandFilter.has(p.band),
      ),
    [projects, corridorFilter, bandFilter],
  );

  const visibleCommandProjects = useMemo<RadarProject[]>(() => {
    const normalized = commandQuery.trim().toLowerCase();
    if (!normalized) {
      return visibleProjects.slice(0, COMMAND_RESULTS_LIMIT);
    }

    return visibleProjects
      .filter((project: RadarProject) => {
        const tokens =
          `${project.name} ${project.publicId} ${project.parishCounty} ${project.state} ${project.facilityType ?? ""}`.toLowerCase();
        return tokens.includes(normalized);
      })
      .slice(0, COMMAND_RESULTS_LIMIT);
  }, [commandQuery, visibleProjects]);

  const active = useMemo(
    () => visibleProjects.find((p) => p.id === activeId) ?? visibleProjects[0] ?? null,
    [visibleProjects, activeId],
  );

  const workspaceMetrics = useMemo(() => {
    const totalAcres = visibleProjects.reduce((sum, project) => sum + (project.acres ?? 0), 0);
    const highIntent = visibleProjects.filter((project) => project.band === "high" || project.band === "elevated").length;
    const corridorCounts = new Map<string, number>();
    for (const project of visibleProjects) {
      if (!project.corridor) continue;
      corridorCounts.set(project.corridor, (corridorCounts.get(project.corridor) ?? 0) + 1);
    }
    const topCorridor = Array.from(corridorCounts.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
    return { totalAcres, highIntent, topCorridor };
  }, [visibleProjects]);

  const sourcePosture = useMemo(() => {
    const counts = new Map<string, number>();
    for (const source of sources) {
      counts.set(source.status, (counts.get(source.status) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([status, count]) => `${count} ${SOURCE_HEALTH_LABELS[status] ?? status.toLowerCase()}`)
      .join(" · ");
  }, [sources]);

  useEffect(() => {
    if (!initialProjectId) return;
    const focused = projects.find((project) => project.id === initialProjectId);
    if (focused) {
      setActiveId(focused.id);
    }
  }, [initialProjectId, projects]);

  const syncActiveProjectToUrl = useCallback((id: string | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("projectId", id);
      url.searchParams.delete("focus");
    } else {
      url.searchParams.delete("projectId");
    }
    window.history.replaceState({}, "", url);
  }, []);

  const setActiveProject = useCallback(
    (id: string | null) => {
      setActiveId(id);
      syncActiveProjectToUrl(id);
    },
    [syncActiveProjectToUrl],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CommandEvent;
      const query = typeof custom.detail?.query === "string" ? custom.detail.query : "";
      setCommandSelection(0);
      setCommandQuery(query);
      setIsCommandOpen(true);
    };
    window.addEventListener("gcir:cmd", handler);
    return () => window.removeEventListener("gcir:cmd", handler);
  }, []);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandSelection(0);
        setCommandQuery("");
        setIsCommandOpen(true);
        return;
      }
      if (!isCommandOpen) return;

      if (event.key === "Escape") {
        setIsCommandOpen(false);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandSelection((current: number) =>
          visibleCommandProjects.length === 0 ? 0 : (current + 1) % visibleCommandProjects.length,
        );
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandSelection((current: number) =>
          visibleCommandProjects.length === 0
            ? 0
            : (current - 1 + visibleCommandProjects.length) % visibleCommandProjects.length,
        );
      }

      if (event.key === "Enter") {
        const selected = visibleCommandProjects[commandSelection];
        if (!selected) return;
        event.preventDefault();
        setActiveProject(selected.id);
        setIsCommandOpen(false);
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [isCommandOpen, commandSelection, setActiveProject, visibleCommandProjects]);

  useEffect(() => {
    if (!isCommandOpen) return;
    commandInputRef.current?.focus();
  }, [isCommandOpen]);

  useEffect(() => {
    if (commandSelection >= visibleCommandProjects.length) {
      setCommandSelection(Math.max(visibleCommandProjects.length - 1, 0));
    }
  }, [commandSelection, visibleCommandProjects.length]);

  const commandSelect = useCallback(
    (id: string) => {
      setActiveProject(id);
      setIsCommandOpen(false);
    },
    [setActiveProject],
  );

  const onSelect = useCallback((id: string) => setActiveProject(id), [setActiveProject]);

  return (
    <>
      {isCommandOpen && (
        <div
          className="fixed inset-0 z-[120] bg-ink/55 backdrop-blur-md"
          onClick={() => setIsCommandOpen(false)}
        >
          <div
            className="absolute left-1/2 top-[18%] w-full max-w-[680px] -translate-x-1/2 overflow-hidden rounded-[10px] border border-bone/15 bg-bone shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Search className="h-4 w-4 text-muted" />
              <input
                ref={commandInputRef}
                value={commandQuery}
                onChange={(event) => {
                  setCommandQuery(event.target.value);
                  setCommandSelection(0);
                }}
                placeholder="Search projects, owners, parcels, signals…"
                className="flex-1 bg-transparent font-sans text-[15px] tracking-tight text-ink placeholder:text-muted-2 focus:outline-none"
              />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
                ↑↓ navigate · ↵ open · esc
              </span>
            </div>
            <div className="scrollbar-thin max-h-[55vh] overflow-y-auto p-2">
              {visibleCommandProjects.length === 0 && (
                <div className="rounded-[6px] border border-dashed border-line bg-bone-2 p-6 text-center text-[12.5px] text-muted">
                  No matches for <span className="font-mono">"{commandQuery || "empty query"}"</span>
                </div>
              )}
              {visibleCommandProjects.map((project: RadarProject, index: number) => {
                const isSelected = index === commandSelection;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commandSelect(project.id)}
                    onMouseEnter={() => setCommandSelection(index)}
                    className={
                      isSelected
                        ? "flex w-full items-start gap-3 rounded-[6px] border border-accent/30 bg-accent/[0.07] px-3 py-2.5 text-left"
                        : "flex w-full items-start gap-3 rounded-[6px] border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-bone-2"
                    }
                  >
                    <span
                      className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                      style={{
                        background:
                          project.band === "high" ? "var(--crit)" :
                          project.band === "elevated" ? "var(--accent)" :
                          project.band === "watch" ? "var(--info)" : "var(--muted)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-sans text-[13.5px] font-semibold tracking-tight text-ink">{project.name}</div>
                      <div className="mt-0.5 truncate font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted">
                        {project.publicId} · {project.parishCounty}
                        {project.state ? `, ${project.state}` : ""} · {project.stage.toLowerCase().replace(/_/g, "-")}
                      </div>
                    </div>
                    <div className="font-mono text-[12px] font-semibold tabular-nums text-ink-3">{project.score}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <FilterRail
          projects={projects}
          corridorFilter={corridorFilter}
          setCorridorFilter={setCorridorFilter}
          bandFilter={bandFilter}
          setBandFilter={setBandFilter}
          visibleCount={visibleProjects.length}
          visibleProjectIds={visibleProjects.map((project) => project.id)}
        />

        <section className="relative min-w-0 flex-1 bg-ink">
          {/* ── Formation desk (workspace overlay) ─────────────────────── */}
          <div className="pointer-events-none absolute left-4 top-4 z-10 w-[296px] max-lg:hidden">
            <div className="relative overflow-hidden rounded-[8px] border border-bone/15 bg-[#0c100e]/85 text-bone shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-md">
              {/* corner amber notch */}
              <div className="absolute -right-2 -top-2 h-12 w-12 rotate-12 bg-accent/[0.15] blur-md" />

              <div className="flex items-center justify-between gap-3 border-b border-bone/[0.08] px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                    <Activity className="h-3 w-3" />
                    Formation desk
                  </div>
                  <div className="mt-0.5 truncate font-display text-[16px] leading-tight tracking-[-0.01em] text-bone">
                    {active ? active.name : "No project selected"}
                  </div>
                </div>
                <div className="shrink-0 rounded-[5px] border border-bone/[0.10] bg-bone/[0.04] px-2 py-1.5 text-right">
                  <div className="font-display text-[22px] leading-none text-bone">
                    {active?.score ?? "--"}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-bone/45">
                    score
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 divide-x divide-bone/[0.08]">
                <WorkspaceStat
                  icon={<Crosshair className="h-3 w-3" />}
                  label="view"
                  value={String(visibleProjects.length)}
                />
                <WorkspaceStat
                  icon={<Factory className="h-3 w-3" />}
                  label="intent"
                  value={String(workspaceMetrics.highIntent)}
                  accent
                />
                <WorkspaceStat
                  label="acres"
                  value={workspaceMetrics.totalAcres > 0 ? Math.round(workspaceMetrics.totalAcres).toLocaleString() : "0"}
                />
                <WorkspaceStat
                  icon={<Database className="h-3 w-3" />}
                  label="sources"
                  value={`${health.ok}/${health.total}`}
                />
              </div>

              <div className="space-y-1 border-t border-bone/[0.08] px-3.5 py-2.5 font-mono text-[10.5px] text-bone/55">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-bone/35 uppercase tracking-[0.12em]">focus</span>
                  <span className="truncate font-semibold text-bone">
                    {workspaceMetrics.topCorridor ? workspaceMetrics.topCorridor[0] : "none"}
                  </span>
                  {workspaceMetrics.topCorridor && (
                    <span className="text-bone/35">· {workspaceMetrics.topCorridor[1]} projects</span>
                  )}
                </div>
                <div className="truncate text-bone/40 uppercase tracking-[0.10em]">{sourcePosture}</div>
              </div>

              {/* Bottom rule with phosphor sweep marker */}
              <div className="relative h-[3px] w-full overflow-hidden bg-bone/[0.06]">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-accent/70 to-transparent animate-ticker" />
              </div>
            </div>
          </div>

          <RadarMap
            projects={visibleProjects}
            activeId={active?.id ?? null}
            onSelect={onSelect}
          />
          <AlertsOverlay
            projects={visibleProjects}
            activeId={active?.id ?? null}
            nowIso={nowIso}
            onSelect={onSelect}
            collapsed={isAlertQueueCollapsed}
            onToggleCollapsed={() => setIsAlertQueueCollapsed((collapsed) => !collapsed)}
          />
        </section>

        <Drawer
          project={active}
          nowIso={nowIso}
          plan={plan}
          collapsed={isDrawerCollapsed}
          onToggleCollapsed={() => setIsDrawerCollapsed((collapsed) => !collapsed)}
        />
      </div>

      <StatusBar health={health} count={visibleProjects.length} />
    </>
  );
}

export { scoreBand };

function WorkspaceStat({
  icon,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-2.5 text-center">
      {icon && <span className={accent ? "text-accent" : "text-bone/45"}>{icon}</span>}
      <div className="min-w-0">
        <div className={`font-display text-[16px] leading-none ${accent ? "text-accent" : "text-bone"}`}>
          {value}
        </div>
        <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.18em] text-bone/40">
          {label}
        </div>
      </div>
    </div>
  );
}
