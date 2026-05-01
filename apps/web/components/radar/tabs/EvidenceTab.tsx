"use client";

import useSWR from "swr";
import { Link2, Sparkles } from "lucide-react";
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

type Citation = { url: string; title?: string; snippet?: string };

type SupplementaryEvidence = {
  publicCheck?: {
    summary: string;
    confidence: number;
    citations: Citation[];
  };
  entityResearch?: Array<{
    entityName: string;
    summary: string;
    sisterCompanies: string[];
    citations: Citation[];
  }>;
  modelMix?: string[];
};

type ProjectDetail = {
  latestAlert?: {
    id: string;
    publicCoverageFound: boolean | null;
    supplementaryEvidence: SupplementaryEvidence | null;
    validatedAt: string | null;
    validationCostUsd: number | null;
  } | null;
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export function EvidenceTab({ projectId }: { projectId: string }) {
  const { data } = useSWR<{ documents: Doc[] }>(`/api/projects/${projectId}/evidence`, fetcher);
  const { data: project } = useSWR<ProjectDetail>(`/api/projects/${projectId}`, fetcher);
  const docs = data?.documents ?? [];

  const supp = project?.latestAlert?.supplementaryEvidence;
  const validatedAt = project?.latestAlert?.validatedAt;
  const cost = project?.latestAlert?.validationCostUsd;

  return (
    <div>
      {/* ── Perplexity supplementary evidence ── */}
      {supp && (supp.publicCheck || (supp.entityResearch && supp.entityResearch.length > 0)) && (
        <section className="mb-5 rounded-md border border-line bg-bg-2 px-4 py-3.5">
          <header className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Supplementary evidence · Perplexity
            </div>
            <div className="font-mono text-[10.5px] text-muted-2">
              {validatedAt ? fmtDate(validatedAt) : ""}
              {cost != null ? ` · $${cost.toFixed(3)}` : ""}
            </div>
          </header>

          {supp.publicCheck && (
            <article className="mb-2.5">
              <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
                Public-announcement check · conf {supp.publicCheck.confidence.toFixed(2)}
              </div>
              <p className="mt-1 text-[13px] leading-snug text-ink-2">{supp.publicCheck.summary}</p>
              {supp.publicCheck.citations.length > 0 && (
                <ul className="mt-1.5 flex flex-col gap-0.5 text-[11.5px]">
                  {supp.publicCheck.citations.map((c, i) => (
                    <li key={i}>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-muted underline decoration-line decoration-1 underline-offset-2 hover:text-ink"
                      >
                        <Link2 className="h-3 w-3" /> {c.title ?? c.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}

          {supp.entityResearch && supp.entityResearch.length > 0 && (
            <article>
              <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
                Entity research · {supp.entityResearch.length} reports
              </div>
              <div className="mt-1.5 flex flex-col gap-2">
                {supp.entityResearch.map((e, i) => (
                  <details
                    key={i}
                    className="rounded border border-line-2 bg-white px-3 py-2 text-[12.5px]"
                  >
                    <summary className="cursor-pointer font-semibold text-ink">
                      {e.entityName}
                      {e.sisterCompanies.length > 0 && (
                        <span className="ml-1.5 font-normal text-muted">
                          · {e.sisterCompanies.length} sisters
                        </span>
                      )}
                    </summary>
                    <p className="mt-1.5 leading-snug text-ink-2">{e.summary}</p>
                    {e.sisterCompanies.length > 0 && (
                      <p className="mt-1 text-[11.5px] text-muted">
                        Sisters: {e.sisterCompanies.join(", ")}
                      </p>
                    )}
                    {e.citations?.length > 0 && (
                      <ul className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        {e.citations.slice(0, 5).map((c, j) => (
                          <li key={j}>
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted underline decoration-line decoration-1 underline-offset-2 hover:text-ink"
                            >
                              {c.title ?? c.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                ))}
              </div>
            </article>
          )}

          {supp.modelMix && supp.modelMix.length > 0 && (
            <div className="mt-2 text-[10.5px] text-muted-2">
              Model mix: {supp.modelMix.join(", ")}
            </div>
          )}
        </section>
      )}

      {/* ── Primary archived evidence ── */}
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
