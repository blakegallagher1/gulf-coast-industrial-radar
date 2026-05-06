"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { BookmarkPlus, ChevronsLeftRight, Clock3, FileText, MapPin, Route, Share2, Sparkles } from "lucide-react";
import { fmtAcres, fmtAge, fmtDate } from "@/lib/format";
import { SummaryTab } from "./tabs/SummaryTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { ParcelsTab } from "./tabs/ParcelsTab";
import { EntitiesTab } from "./tabs/EntitiesTab";
import { EvidenceTab } from "./tabs/EvidenceTab";
import { ActionsTab } from "./tabs/ActionsTab";
import type { RadarProject } from "./RadarShell";

const TABS = [
  { id: "summary",  label: "Summary",  num: "01" },
  { id: "timeline", label: "Timeline", num: "02" },
  { id: "parcels",  label: "Parcels",  num: "03" },
  { id: "entities", label: "Entities", num: "04" },
  { id: "evidence", label: "Evidence", num: "05" },
  { id: "actions",  label: "Actions",  num: "06" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const BAND_COLOR_BY_BAND: Record<string, string> = {
  high: "var(--crit)",
  elevated: "var(--accent)",
  watch: "var(--info)",
  weak: "var(--muted)",
  noise: "var(--muted-2)",
};

export function Drawer({
  project,
  nowIso,
  plan: _plan = "pro",
  collapsed,
  onToggleCollapsed,
}: {
  project: RadarProject | null;
  nowIso: string;
  plan?: "free" | "pro";
  collapsed: boolean;
  onToggleCollapsed: () => void;
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
      <aside className="flex w-[var(--drawer-w)] flex-shrink-0 flex-col border-l border-line bg-bone max-md:hidden">
        <div className="m-auto max-w-xs p-8 text-center">
          <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-bone-2">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-2" />
          </span>
          <div className="font-display text-[20px] leading-tight tracking-tight text-ink-2">No project selected</div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-muted">Select a marker on the radar to inspect.</div>
        </div>
      </aside>
    );
  }

  const bandColor = BAND_COLOR_BY_BAND[project.band] ?? "var(--muted)";

  if (collapsed) {
    return (
      <aside className="hidden w-[80px] flex-shrink-0 flex-col border-l border-line bg-bone-2/40 lg:flex">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-full min-h-0 flex-col items-center gap-3 px-2 py-4 text-center transition-colors hover:bg-bone-2"
          title="Expand project detail"
        >
          <ChevronsLeftRight className="h-4 w-4 text-muted" />
          <div
            className="font-display text-[28px] font-normal leading-none"
            style={{ color: bandColor }}
          >
            {project.score}
          </div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
            score
          </div>
          <div className="mt-2 max-h-[300px] truncate font-display text-[13px] leading-tight tracking-tight text-ink [writing-mode:vertical-rl] rotate-180">
            {project.name}
          </div>
          <div className="mt-auto rounded-[3px] border border-line bg-bone px-1.5 py-2 font-mono text-[9px] uppercase tracking-[0.20em] text-muted-2 [writing-mode:vertical-rl]">
            project · detail
          </div>
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[var(--drawer-w)] flex-shrink-0 flex-col overflow-hidden border-l border-line bg-bone max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:h-[70vh] max-md:w-full max-md:rounded-t-xl max-md:border-l-0 max-md:border-t max-md:shadow-lg">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-line bg-bone px-5 pb-4 pt-4">
        {/* Breadcrumb / control */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <span className="rounded-[3px] border border-line bg-bone-2 px-1.5 py-0.5 text-ink-3">
              {detail?.status ?? (project.score >= 95 ? "confirmed" : "suspected")}
            </span>
            <span className="text-muted-2">/</span>
            <span className="truncate">{headerSubject}</span>
            <span className="text-muted-2">/</span>
            <span className="text-ink-3">{project.publicId}</span>
          </div>
          <button
            type="button"
            className="gcir-icon-btn h-7 w-7 shrink-0"
            onClick={onToggleCollapsed}
            title="Collapse project detail"
          >
            <ChevronsLeftRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Big display title */}
        <h2 className="mb-3 font-display text-[28px] leading-[1.05] tracking-[-0.018em] text-ink">
          {project.name}
        </h2>

        {/* Spec data row */}
        <div className="mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            <strong className="font-medium text-ink-2">
              {project.parishCounty}{project.state ? ` · ${project.state}` : ""}
            </strong>
          </span>
          {project.firstSignalAt && (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-muted-2">first signal</span>
              <strong className="font-medium text-ink-2">{fmtDate(project.firstSignalAt)}</strong>
              <span className="font-mono text-[11px] text-muted">({fmtAge(project.firstSignalAt, nowIso)})</span>
            </span>
          )}
          {project.acres != null && (
            <span className="inline-flex items-center gap-1.5">
              <strong className="font-medium text-ink-2">{fmtAcres(project.acres)}</strong>
            </span>
          )}
          {project.estimatedCapex && (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              <strong className="font-medium text-ink-2">{project.estimatedCapex}</strong>
              <span className="text-muted-2">capex</span>
            </span>
          )}
        </div>

        {/* Score panel */}
        <div className="relative overflow-hidden rounded-[7px] border border-line bg-bone-2/70 px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(255,253,247,0.55)]">
          {/* corner mark */}
          <div className="absolute right-3 top-3 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-2">
            §01 · score
          </div>
          <div className="flex items-center gap-4">
            <div
              className="font-display text-[52px] font-normal leading-none tabular-nums tracking-[-0.02em]"
              style={{ color: bandColor }}
            >
              {project.score}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Project formation score
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-bone-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${project.score}%`,
                    background: bandColor,
                  }}
                />
                {/* tick marks */}
                {[40, 60, 75, 90].map((tick) => (
                  <span
                    key={tick}
                    className="absolute top-0 h-full w-px bg-bone"
                    style={{ left: `${tick}%`, opacity: 0.5 }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">
                  stage{" "}
                  <strong className="font-medium text-ink-2">
                    {project.stage.toLowerCase().replace(/_/g, "-")}
                  </strong>
                </span>
                {detail?.scoreDelta != null && (
                  <span
                    className="font-mono font-semibold"
                    style={{ color: detail.scoreDelta > 0 ? "var(--crit)" : "var(--info)" }}
                  >
                    {detail.scoreDelta > 0 ? "▲ +" : "▼ "}
                    {detail.scoreDelta} · last 7d
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Posture grid */}
        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[6px] border border-line bg-bone text-[11.5px]">
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
            accent={project.band === "high" || project.band === "elevated"}
          />
        </div>

        {/* Action buttons */}
        <div className="mt-3.5 flex gap-2">
          <button className="gcir-btn-accent" onClick={() => router.push("/briefs")}>
            <Sparkles className="h-3.5 w-3.5" /> Generate brief
          </button>
          <button className="gcir-btn" onClick={saveWatchlist} disabled={watchPending}>
            <BookmarkPlus className="h-3.5 w-3.5" /> {watchPending ? "Saving…" : "Watchlist"}
          </button>
          <button className="gcir-btn ml-auto" onClick={shareProject}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
        {watchError && <div className="mt-2 text-[12px] text-crit">{watchError}</div>}
      </header>

      {/* Tabs */}
      <div className="scrollbar-thin flex gap-0 overflow-x-auto border-b border-line bg-bone-2/40 px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-active={tab === t.id ? "true" : "false"}
            className="gcir-tab inline-flex items-center gap-1.5"
            onClick={() => setTab(t.id)}
          >
            <span className="font-mono text-[9.5px] font-normal text-muted-2">{t.num}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-8 pt-4">
        {tab === "summary"  && <SummaryTab project={project} detail={detail} />}
        {tab === "timeline" && <TimelineTab projectId={project.id} />}
        {tab === "parcels"  && <ParcelsTab projectId={project.id} project={project} />}
        {tab === "entities" && <EntitiesTab projectId={project.id} />}
        {tab === "evidence" && <EvidenceTab projectId={project.id} />}
        {tab === "actions"  && <ActionsTab projectId={project.id} />}
      </div>
    </aside>
  );
}

function ProjectPosture({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 border-r border-line px-3 py-2.5 last:border-r-0">
      <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={`mt-1 truncate text-[13px] font-medium tracking-tight ${accent ? "text-accent-ink" : "text-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}
