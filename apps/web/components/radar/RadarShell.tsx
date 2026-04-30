"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export function RadarShell({
  projects,
  health,
}: {
  projects: RadarProject[];
  health: Health;
}) {
  const [activeId, setActiveId] = useState<string | null>(projects[0]?.id ?? null);
  const [corridorFilter, setCorridorFilter] = useState<Set<string>>(new Set(CORRIDORS));
  const [bandFilter, setBandFilter] = useState<Set<ScoreBand>>(
    new Set<ScoreBand>(["high", "elevated", "watch"]),
  );

  const visibleProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          (p.corridor === "" || corridorFilter.has(p.corridor)) &&
          bandFilter.has(p.band),
      ),
    [projects, corridorFilter, bandFilter],
  );

  const active = useMemo(
    () => visibleProjects.find((p) => p.id === activeId) ?? visibleProjects[0] ?? null,
    [visibleProjects, activeId],
  );

  // command palette stub
  useEffect(() => {
    const handler = () => {
      window.dispatchEvent(new CustomEvent("gcir:cmd-open"));
    };
    window.addEventListener("gcir:cmd", handler);
    return () => window.removeEventListener("gcir:cmd", handler);
  }, []);

  const onSelect = useCallback((id: string) => setActiveId(id), []);

  return (
    <>
      <div className="relative flex min-h-0 flex-1">
        <FilterRail
          projects={projects}
          corridorFilter={corridorFilter}
          setCorridorFilter={setCorridorFilter}
          bandFilter={bandFilter}
          setBandFilter={setBandFilter}
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
            onSelect={onSelect}
          />
        </section>

        <Drawer project={active} />
      </div>

      <StatusBar health={health} count={visibleProjects.length} />
    </>
  );
}

export { scoreBand };
