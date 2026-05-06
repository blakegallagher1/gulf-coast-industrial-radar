"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { BookmarkPlus, Clock3, FileText, MapPin, Route, Share2, Sparkles } from "lucide-react";
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

export function Drawer({
  project,
  nowIso,
  plan: _plan = "pro",
}: {
  project: RadarProject | null;
  nowIso: string;
  plan?: "free" | "pro";
}) {
  const [tab, setTab] = useState<TabId>("summary");
  const [watchPending, setWatchPending] = useState(false);
  const [watchError, setWatchError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setTab("summary");
    setWatchPending(false);
    setWatchError(null);
  }, [project?.id]);

  const shareUrl = useMemo(() => {
    if (!project) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/share/project/${project.id}`;
  }, [project]);

  const shareProject = async () => {
    if (!shareUrl) return;
    const payload = {
      title: project!.name,
      text: `${project!.name} — Formation Score ${project!.score}`,
      url: shareUrl,
    };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // share is best-effort
    }
  };

  const saveWatchlist = async () => {
    if (!project || watchPending) return;

    setWatchPending(true);
    setWatchError(null);

    try {
      const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          isShared: true,
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; watchlistId?: string }
        | null;

      if (!res.ok || !body?.watchlistId) {
        setWatchError(body?.error ?? "Could not save watchlist.");
        return;
      }

      router.push(`/watchlists/${body.watchlistId}`);
      router.refresh();
    } catch {
      setWatchError("Could not save watchlist.");
    } finally {
      setWatchPending(false);
    }
  };

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
      <aside className="flex w-[var(--drawer-w)] flex-shrink-0 flex-col border-l border-line bg-white max-md:hidden">
        <div className="m-auto p-8 text-center text-sm text-muted">
          Select an alert to inspect.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-[var(--drawer-w)] flex-shrink-0 flex-col overflow-hidden border-l border-line bg-white max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:h-[70vh] max-md:w-full max-md:rounded-t-xl max-md:border-l-0 max-md:border-t max-md:shadow-lg">
      <header className="border-b border-line-2 px-5 py-3.5">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          <span>
            Project · {detail?.status ?? (project.score >= 95 ? "confirmed" : "suspected")}
          </span>
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
              <span className="text-muted-2">({fmtAge(project.firstSignalAt, nowIso)})</span>
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

        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-md border border-line bg-white text-[11.5px]">
          <ProjectPosture
            icon={<Clock3 className="h-3.5 w-3.5" />}
            label="lead signal"
            value={project.firstSignalAt ? fmtAge(project.firstSignalAt, nowIso) : "unseen"}
          />
          <ProjectPosture
            icon={<Route className="h-3.5 w-3.5" />}
            label="corridor"
            value={project.corridor || "unmapped"}
          />
          <ProjectPosture
            icon={<FileText className="h-3.5 w-3.5" />}
            label="next move"
            value={project.band === "high" || project.band === "elevated" ? "brief + option map" : "monitor"}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button className="gcir-btn-primary" onClick={() => router.push("/briefs")}>
            <Sparkles className="h-3.5 w-3.5" /> Generate brief
          </button>
          <button className="gcir-btn" onClick={saveWatchlist} disabled={watchPending}>
            <BookmarkPlus className="h-3.5 w-3.5" /> {watchPending ? "Saving..." : "Save watchlist"}
          </button>
          <button className="gcir-btn" onClick={shareProject}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
        {watchError && <div className="mt-2 text-[12px] text-crit">{watchError}</div>}
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

function ProjectPosture({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-r border-line px-3 py-2.5 last:border-r-0">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="uppercase tracking-[0.06em]">{label}</span>
      </div>
      <div className="mt-1 truncate font-semibold text-ink">{value}</div>
    </div>
  );
}
