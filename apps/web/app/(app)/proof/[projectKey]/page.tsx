import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@gcir/db";
import { runBacktest } from "@gcir/scoring";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProofProjectPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const project = runBacktest().projects.find((item) => item.projectKey === projectKey);
  if (!project) notFound();

  const rawDocuments = await prisma.rawDocument.findMany({
    where: { id: { in: project.timeline.map((point) => point.rawDocumentId) } },
    select: { id: true, title: true, url: true, observedAt: true, excerpt: true },
  });
  const rawDocumentById = new Map(rawDocuments.map((row) => [row.id, row]));

  return (
    <main className="mx-auto max-w-[1120px] flex-1 overflow-y-auto px-10 py-9">
      <Link
        href="/proof"
        className="mb-5 inline-flex font-mono text-[11.5px] text-muted underline decoration-line underline-offset-2 hover:text-ink"
      >
        Back to proof
      </Link>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Validation backtest drilldown
      </div>
      <h1 className="mb-2 text-[36px] font-semibold leading-[1.08] tracking-tighter text-ink">
        {project.projectName}
      </h1>
      <p className="max-w-[840px] text-[15px] leading-relaxed text-muted-2">
        The timeline reconstructs what the existing scoring engine would have known from seeded
        public-source fixtures before the public announcement marker.
      </p>

      <section className="mt-7 grid grid-cols-5 gap-3">
        <Metric label="Earliest surfaced" value={project.earliestSurfacedAt ?? "unmet"} />
        <Metric label="Lead time" value={project.leadTimeDays != null ? `${project.leadTimeDays}d` : "unmet"} />
        <Metric label="Surface score" value={String(project.formationScoreAtSurface)} />
        <Metric label="QLAD trigger" value={project.qladTriggerDate ?? "none"} />
        <Metric label="Public marker" value={project.publicAnnouncementDate} />
      </section>

      <section className="mt-8 rounded-md border border-line bg-white">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Recommended action
        </div>
        <div className="px-4 py-4 text-[15px] font-semibold tracking-tight text-ink">
          {project.recommendedAction}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-[1fr_320px] gap-6">
        <div className="rounded-md border border-line bg-white">
          <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Reconstructed signal timeline
          </div>
          <div className="divide-y divide-line">
            {project.timeline.map((point) => {
              const rawDocument = rawDocumentById.get(point.rawDocumentId);
              return (
                <div key={point.rawDocumentId} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold tracking-tight text-ink">
                        {point.evidenceSpan}
                      </div>
                      <div className="mt-1 font-mono text-[11.5px] text-muted">
                        {point.observedAt} · {point.sourceSlug} · {point.signalFamilies.join(", ")}
                      </div>
                    </div>
                    <div className="font-mono text-[13px] font-semibold text-ink">
                      score {point.score}
                    </div>
                  </div>
                  <div className="mt-2 rounded-md border border-line bg-bg-2 px-3 py-2 text-[12px] leading-snug text-muted">
                    RawDocument fixture: <span className="font-mono text-ink">{point.rawDocumentId}</span>
                    {rawDocument ? (
                      <>
                        {" "}· observed {fmtDate(rawDocument.observedAt)} ·{" "}
                        <span className="text-ink">{rawDocument.title ?? rawDocument.excerpt}</span>
                      </>
                    ) : (
                      " · seed row not loaded in the local database yet"
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white">
          <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Score curve
          </div>
          <div className="space-y-3 px-4 py-4">
            {project.scoreCurve.map((point) => (
              <div key={point.observedAt}>
                <div className="mb-1 flex justify-between font-mono text-[11.5px] text-muted">
                  <span>{point.observedAt}</span>
                  <span>{point.score}</span>
                </div>
                <div className="h-2 rounded-full bg-bg-3">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${Math.max(3, point.score)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="border-t border-line pt-3 font-mono text-[11.5px] text-muted">
              Public announcement marker: {project.publicAnnouncementDate}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
      <div className="mt-1 font-mono text-[15px] font-semibold text-ink">{value}</div>
    </div>
  );
}
