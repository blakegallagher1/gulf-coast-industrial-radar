"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Eye, FileText, MapPin, Share2, Sparkles } from "lucide-react";
import { ScoreChip } from "@/components/score-chip";
import { fmtAcres, fmtAge, fmtDate } from "@/lib/format";
import { SummaryTab } from "./tabs/SummaryTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { ParcelsTab } from "./tabs/ParcelsTab";
import { EntitiesTab } from "./tabs/EntitiesTab";
import { EvidenceTab } from "./tabs/EvidenceTab";
import { ActionsTab } from "./tabs/ActionsTab";
import type { RadarProject } from "./RadarShell";

const TABS = [
  { id: "summary", label: "Summary" },
  { id: "timeline", label: "Signal timeline" },
  { id: "parcels", label: "Parcels & site" },
  { id: "entities", label: "Entity graph" },
  { id: "evidence", label: "Evidence" },
  { id: "actions", label: "Actions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Drawer({ project }: { project: RadarProject | null }) {
  const [tab, setTab] = useState<TabId>("summary");
  useEffect(() => setTab("summary"), [project?.id]);

  const { data: detail } = useSWR(
    project ? `/api/projects/${project.id}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const headerSubject = useMemo(() => {
    if (!project) return "—";
    const parts = [project.parishCounty, project.state].filter(Boolean);
    return parts.join(", ");
  }, [project]);

  if (!project) {
    return (
      <aside className="flex w-[var(--drawer-w)] flex-shrink-0 flex-col border-l border-line bg-white">
        <div className="m-auto p-8 text-center text-sm text-muted">
          Select an alert to inspect.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-[var(--drawer-w)] flex-shrink-0 flex-col overflow-hidden border-l border-line bg-white">
      <header className="border-b border-line-2 px-5 py-3.5">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          <span>Project · {detail?.status ?? project.score >= 95 ? "confirmed" : "suspected"}</span>
          <span className="text-stone-300">/</span>
          <span>{headerSubject}</span>
          <span className="text-stone-300">/</span>
          <span className="font-mono">{project.publicId}</span>
        </div>
        <h2 className="mb-2 text-[21px] font-semibold leading-tight tracking-tight text-ink">
          {project.name}
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            <strong className="font-semibold text-ink-2">
              {project.parishCounty}{project.state ? ` · ${project.state}` : ""}
            </strong>
          </span>
          {project.firstSignalAt && (
            <span className="inline-flex items-center gap-1.5">
              First signal{" "}
              <strong className="font-semibold text-ink-2">{fmtDate(project.firstSignalAt)}</strong>
              <span className="text-muted-2">({fmtAge(project.firstSignalAt)})</span>
            </span>
          )}
          {project.acres != null && (
            <span className="inline-flex items-center gap-1.5">
              <strong className="font-semibold text-ink-2">{fmtAcres(project.acres)}</strong>
            </span>
          )}
          {project.estimatedCapex && (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              <strong className="font-semibold text-ink-2">{project.estimatedCapex}</strong> capex
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3.5 rounded-md border border-line bg-bg-2 px-3.5 py-2.5">
          <div className="font-mono text-[36px] font-semibold leading-none tracking-tight text-crit"
               style={{ color: project.band === "high" ? "#b3261e" : project.band === "elevated" ? "#c97a16" : project.band === "watch" ? "#1f5fa8" : "#6b6b6b" }}>
            {project.score}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Project formation score
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-bg-3">
              <div
                className="h-full rounded"
                style={{
                  width: `${project.score}%`,
                  background:
                    project.band === "high" ? "#b3261e" :
                    project.band === "elevated" ? "#c97a16" :
                    project.band === "watch" ? "#1f5fa8" : "#6b6b6b",
                }}
              />
            </div>
            <div className="text-[11.5px] text-muted">
              stage <strong className="font-semibold text-ink-2">{project.stage.toLowerCase().replace(/_/g, "-")}</strong>
              {detail?.scoreDelta != null && (
                <>
                  {" · "}
                  <span style={{ color: detail.scoreDelta > 0 ? "#b3261e" : "#10a37f" }}>
                    {detail.scoreDelta > 0 ? "+" : ""}{detail.scoreDelta} last 7d
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button className="gcir-btn-primary">
            <Sparkles className="h-3.5 w-3.5" /> Generate brief
          </button>
          <button className="gcir-btn">
            <Eye className="h-3.5 w-3.5" /> Watch
          </button>
          <button className="gcir-btn">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </header>

      <div className="scrollbar-thin flex gap-0 overflow-x-auto border-b border-line bg-white px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-active={tab === t.id ? "true" : "false"}
            className="gcir-tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-8 pt-4">
        {tab === "summary" && <SummaryTab project={project} detail={detail} />}
        {tab === "timeline" && <TimelineTab projectId={project.id} />}
        {tab === "parcels" && <ParcelsTab projectId={project.id} project={project} />}
        {tab === "entities" && <EntitiesTab projectId={project.id} />}
        {tab === "evidence" && <EvidenceTab projectId={project.id} />}
        {tab === "actions" && <ActionsTab projectId={project.id} />}
      </div>
    </aside>
  );
}
