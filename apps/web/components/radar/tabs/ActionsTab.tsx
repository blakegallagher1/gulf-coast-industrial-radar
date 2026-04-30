"use client";

import useSWR from "swr";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { ConfPill } from "@/components/conf-pill";
import { cn } from "@/lib/cn";

type Action = {
  id: string;
  rank: number;
  kind: string;
  title: string;
  rationale: string;
  confidence: number;
  reasonCode: string | null;
  estTimeMin: number | null;
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export function ActionsTab({ projectId }: { projectId: string }) {
  const { data } = useSWR<{ actions: Action[] }>(
    `/api/projects/${projectId}/actions`,
    fetcher,
  );
  const actions = data?.actions ?? [];

  return (
    <div>
      {actions.length === 0 && (
        <div className="py-6 text-center text-sm text-muted">
          No recommended actions yet — run the InvestorAction agent to generate them.
        </div>
      )}
      {actions.map((a, i) => (
        <article
          key={a.id}
          className={cn(
            "mb-2.5 flex items-start gap-3.5 rounded-md border px-4 py-3.5",
            i === 0 ? "border-ink bg-bg-2 shadow-sm" : "border-line bg-white",
          )}
        >
          <div
            className={cn(
              "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11.5px] font-semibold",
              i === 0 ? "bg-ink text-white" : "border border-line bg-white text-ink",
            )}
          >
            {a.rank}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[14px] font-semibold leading-snug tracking-tight text-ink">
              {a.title}
            </h4>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{a.rationale}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
              <ConfPill confidence={a.confidence} />
              {a.reasonCode && <span>Reason · {a.reasonCode}</span>}
              {a.estTimeMin != null && (
                <span>~{Math.round(a.estTimeMin / 5) * 5}m</span>
              )}
            </div>
          </div>
          <button
            className={cn(
              "flex-shrink-0 self-center",
              i === 0 ? "gcir-btn-primary" : "gcir-btn",
            )}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {i === 0 ? "Open" : "Act"}
          </button>
        </article>
      ))}

      <div className="mt-4 rounded-md border border-dashed border-line bg-bg-2 px-3.5 py-3 text-[13px] text-ink-3">
        <div className="mb-1.5 flex items-center gap-2 font-semibold text-ink">
          <ShieldAlert className="h-4 w-4 text-muted" />
          Analyst review · pending escalation
        </div>
        <div className="text-[12.5px] leading-snug text-muted">
          High-impact conclusions (likely sponsor identity) require human review before
          they ship in a paid investor brief.
        </div>
      </div>
    </div>
  );
}
