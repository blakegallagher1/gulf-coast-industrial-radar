"use client";

import useSWR from "swr";
import { Link2 } from "lucide-react";
import { fmtDate } from "@/lib/format";

type Doc = {
  id: string;
  url: string;
  title: string | null;
  excerpt: string | null;
  documentDate: string | null;
  observedAt: string;
  contentHash: string;
  source?: { name: string } | null;
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export function EvidenceTab({ projectId }: { projectId: string }) {
  const { data } = useSWR<{ documents: Doc[] }>(
    `/api/projects/${projectId}/evidence`,
    fetcher,
  );
  const docs = data?.documents ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[12px] text-muted">
        <span>
          <strong className="text-ink">{docs.length}</strong> archived items ·{" "}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            All preserved
          </span>
        </span>
      </div>
      {docs.length === 0 && (
        <div className="py-6 text-center text-sm text-muted">No archived evidence yet.</div>
      )}
      {docs.map((d) => (
        <article
          key={d.id}
          className="mb-2 rounded-md border border-line bg-white px-3.5 py-3 transition-colors hover:border-stone-300"
        >
          <div className="flex items-start justify-between gap-2.5 text-[11px]">
            <div className="font-semibold uppercase tracking-[0.04em] text-muted">
              {d.source?.name ?? "Source"}
            </div>
            <div className="font-mono text-[10.5px] text-muted-2">
              {fmtDate(d.documentDate ?? d.observedAt)}
            </div>
          </div>
          <h4 className="mt-0.5 mb-1.5 text-[13px] font-semibold leading-snug tracking-tight text-ink">
            {d.title ?? d.url}
          </h4>
          {d.excerpt && (
            <blockquote className="mb-2 border-l-2 border-line pl-2.5 text-[12px] italic leading-relaxed text-ink-3">
              {d.excerpt}
            </blockquote>
          )}
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
          >
            <Link2 className="h-3 w-3" />
            {d.url} · sha {d.contentHash.slice(0, 10)}
          </a>
        </article>
      ))}
    </div>
  );
}
