"use client";

import useSWR from "swr";
import { ConfPill } from "@/components/conf-pill";
import { fmtDate } from "@/lib/format";

type Signal = {
  id: string;
  family: string;
  predicate: string;
  subjectLabel: string;
  observedAt: string;
  documentDate: string | null;
  confidence: number;
  source?: { name: string } | null;
};

const FAMILY_COLOR: Record<string, string> = {
  LAND_CONTROL: "#10a37f",
  ENVIRONMENTAL_PERMIT: "#1f5fa8",
  INCENTIVE: "#ca8a04",
  UTILITY_POWER: "#7e22ce",
  ENTITY_FORMATION: "#6b6b6b",
  PORT_TERMINAL: "#0891b2",
  PUBLIC_COMPANY: "#dc2626",
  LOCAL_AGENDA: "#475569",
  FINANCING: "#b3261e",
  PROCUREMENT: "#1f5fa8",
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export function TimelineTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useSWR<{ signals: Signal[] }>(
    `/api/projects/${projectId}/timeline`,
    fetcher,
  );
  const signals = data?.signals ?? [];

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted">Loading timeline…</div>;
  }
  if (signals.length === 0) {
    return <div className="py-8 text-center text-sm text-muted">No signals recorded yet.</div>;
  }

  return (
    <div className="relative pl-2 pt-1">
      <div className="absolute bottom-1.5 left-3.5 top-1.5 w-px bg-line" />
      {signals.map((s) => {
        const dot = FAMILY_COLOR[s.family] ?? "#6b6b6b";
        return (
          <div key={s.id} className="relative mb-1 cursor-pointer rounded-md py-2.5 pl-9 pr-1 transition-colors hover:bg-bg-2">
            <span
              className="absolute left-2.5 top-3.5 h-2.5 w-2.5 rounded-full"
              style={{
                background: "#fff",
                border: `2px solid ${dot}`,
                boxShadow: "0 0 0 3px #fff",
              }}
            />
            <div className="flex items-start justify-between gap-2.5">
              <div className="text-[13.5px] font-semibold leading-snug tracking-tight text-ink">
                {s.subjectLabel}
              </div>
              <div className="flex-shrink-0 font-mono text-[11px] text-muted">
                {fmtDate(s.documentDate ?? s.observedAt)}
              </div>
            </div>
            <div className="mt-1 text-[12.5px] leading-snug text-muted">
              {s.predicate} · family {s.family.toLowerCase().replace(/_/g, " ")}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <ConfPill confidence={s.confidence} />
              {s.source?.name && (
                <span className="text-[11px] text-muted underline decoration-line decoration-1 underline-offset-2">
                  {s.source.name}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
