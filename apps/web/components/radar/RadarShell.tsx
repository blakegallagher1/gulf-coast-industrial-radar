"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CORRIDORS, scoreBand, type ScoreBand } from "@gcir/shared";
import { Activity, Crosshair, Database, Factory } from "lucide-react";
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
          className="fixed inset-0 z-[120] bg-black/30 backdrop-blur-sm"
          onClick={() => setIsCommandOpen(false)}
        >
          <div
            className="absolute left-1/2 top-20 w-full max-w-[680px] -translate-x-1/2 rounded-lg border border-line bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              ref={commandInputRef}
              value={commandQuery}
              onChange={(event) => {
                setCommandQuery(event.target.value);
                setCommandSelection(0);
              }}
              placeholder="Search projects by name, ID, parish, or signal"
              className="mb-2 block w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none ring-2 ring-transparent transition focus:ring-accent"
            />
            <div className="max-h-[50vh] overflow-y-auto pr-0.5">
              {visibleCommandProjects.length === 0 && (
                <div className="rounded-md border border-dashed border-line bg-bg-2 p-4 text-center text-[12.5px] text-muted">
                  No matches for <span className="font-mono">{commandQuery || "empty query"}</span>
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
                        ? "flex w-full items-start gap-2 rounded-md border border-line bg-bg-3 px-2.5 py-2 text-left"
                        : "flex w-full items-start gap-2 rounded-md border border-transparent px-2.5 py-2 text-left hover:bg-bg-3"
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-ink">{project.name}</div>
                      <div className="mt-0.5 truncate text-[11.5px] text-muted">
                        {project.publicId} · {project.parishCounty}
                        {project.state ? `, ${project.state}` : ""} · {project.stage.toLowerCase().replace(/_/g, "-")}
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-muted-2">{project.score}</div>
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

        <section className="relative min-w-0 flex-1 bg-bg-3">
          <div className="pointer-events-none absolute left-4 top-4 z-10 w-[308px] max-lg:hidden">
            <div className="overflow-hidden rounded-lg border border-white/15 bg-black/68 text-white shadow-2xl backdrop-blur-md">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
                    <Activity className="h-3.5 w-3.5 text-emerald-300" />
                    Formation desk
                  </div>
                  <div className="mt-1 truncate text-[15px] font-semibold leading-tight tracking-tight">
                    {active ? active.name : "No project selected"}
                  </div>
                </div>
                <div className="shrink-0 rounded-md border border-white/10 bg-white/8 px-2 py-1.5 text-right">
                  <div className="font-mono text-[19px] font-semibold leading-none">
                    {active?.score ?? "--"}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-white/45">
                    score
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-white/10 text-[11.5px]">
                <WorkspaceStat
                  icon={<Crosshair className="h-3.5 w-3.5" />}
                  label="in view"
                  value={String(visibleProjects.length)}
                />
                <WorkspaceStat
                  icon={<Factory className="h-3.5 w-3.5" />}
                  label="high intent"
                  value={String(workspaceMetrics.highIntent)}
                />
                <WorkspaceStat
                  label="acres"
                  value={workspaceMetrics.totalAcres > 0 ? Math.round(workspaceMetrics.totalAcres).toLocaleString() : "0"}
                />
                <WorkspaceStat
                  icon={<Database className="h-3.5 w-3.5" />}
                  label="sources"
                  value={`${health.ok}/${health.total}`}
                />
              </div>
              <div className="space-y-1 border-t border-white/10 px-3 py-2 text-[11.5px] text-white/62">
                <div className="truncate">
                  Focus corridor:{" "}
                  <strong className="font-semibold text-white">
                    {workspaceMetrics.topCorridor ? workspaceMetrics.topCorridor[0] : "none"}
                  </strong>
                  {workspaceMetrics.topCorridor ? ` · ${workspaceMetrics.topCorridor[1]} projects` : ""}
                </div>
                <div className="truncate font-mono text-white/45">{sourcePosture}</div>
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
          />
        </section>

        <Drawer project={active} nowIso={nowIso} plan={plan} />
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
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-4 py-3">
      {icon && <span className="text-white/45">{icon}</span>}
      <div className="min-w-0">
        <div className="font-mono text-[15px] font-semibold leading-none text-white">{value}</div>
        <div className="mt-1 truncate text-[10px] uppercase tracking-[0.08em] text-white/42">{label}</div>
      </div>
    </div>
  );
}
