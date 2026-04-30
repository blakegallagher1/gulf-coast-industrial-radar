"use client";

import useSWR from "swr";
import { ConfPill } from "@/components/conf-pill";

type Entity = {
  id: string;
  name: string;
  kind: string;
  state: string | null;
  registrationNo: string | null;
  formedAt: string | null;
  registeredAgent: string | null;
  opacityScore: number | null;
  edges: number;
};

type Link = {
  fromName: string;
  toName: string;
  relationship: string;
  confidence: number;
  detectedBy: string | null;
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export function EntitiesTab({ projectId }: { projectId: string }) {
  const { data } = useSWR<{ entities: Entity[]; links: Link[] }>(
    `/api/projects/${projectId}/entities`,
    fetcher,
  );
  const entities = data?.entities ?? [];
  const links = data?.links ?? [];

  return (
    <div>
      <div className="gcir-section-h">
        Entities · resolved <span className="font-normal normal-case tracking-normal">{entities.length} resolved · {links.length} edges</span>
      </div>
      <table className="w-full border-separate border-spacing-0 text-[12.5px]">
        <thead>
          <tr>
            <th className="border-b border-line bg-bg-2 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">Entity</th>
            <th className="border-b border-line bg-bg-2 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">Type</th>
            <th className="border-b border-line bg-bg-2 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">Formed</th>
            <th className="border-b border-line bg-bg-2 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">Opacity</th>
            <th className="border-b border-line bg-bg-2 px-2.5 py-1.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">Edges</th>
          </tr>
        </thead>
        <tbody>
          {entities.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-6 text-center text-muted">
                No entities resolved yet.
              </td>
            </tr>
          )}
          {entities.map((e) => (
            <tr key={e.id}>
              <td className="border-b border-line-2 px-2.5 py-2 align-top">
                <div className="font-semibold text-ink">{e.name}</div>
                {e.registrationNo && (
                  <div className="mt-0.5 text-[11px] text-muted">
                    {e.state ?? "?"} · {e.registrationNo}
                  </div>
                )}
              </td>
              <td className="border-b border-line-2 px-2.5 py-2 text-ink-2">{e.kind}</td>
              <td className="border-b border-line-2 px-2.5 py-2 font-mono text-[11.5px] text-ink-3">
                {e.formedAt ? new Date(e.formedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }) : "—"}
              </td>
              <td className="border-b border-line-2 px-2.5 py-2">
                <OpacityBar score={e.opacityScore ?? 0} />
              </td>
              <td className="border-b border-line-2 px-2.5 py-2 text-right text-ink-2">
                {e.edges}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {links.length > 0 && (
        <>
          <div className="gcir-section-h">
            Edges · entity links
          </div>
          <ul className="flex flex-col gap-1.5 text-[12.5px]">
            {links.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded border border-line-2 px-3 py-2">
                <div className="flex-1">
                  <div className="text-ink-2">
                    <strong className="font-semibold text-ink">{l.fromName}</strong> ↔{" "}
                    <strong className="font-semibold text-ink">{l.toName}</strong>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    {l.relationship.toLowerCase().replace(/_/g, " ")} ·{" "}
                    detected by {l.detectedBy ?? "deterministic"}
                  </div>
                </div>
                <ConfPill confidence={l.confidence} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function OpacityBar({ score }: { score: number }) {
  const lit = Math.round(score * 5);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-2.5 w-1 rounded-[1px]"
          style={{ background: i < lit ? "#b3261e" : "#f5f5f4" }}
        />
      ))}
    </span>
  );
}
