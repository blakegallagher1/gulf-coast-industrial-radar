"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CORRIDORS, scoreBand, type ScoreBand } from "@gcir/shared";
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
