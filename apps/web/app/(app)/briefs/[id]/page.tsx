import { prisma } from "@gcir/db";
import { notFound } from "next/navigation";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BriefView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brief = await prisma.brief.findUnique({ where: { id } });
  if (!brief) notFound();

  const movers = (brief.topMovers as Array<{ publicId?: string; name?: string; scoreDelta?: number }>) ?? [];
  const actions = (brief.recommendedActions as Array<{ rank: number; title: string; why?: string }>) ?? [];
  const health = (brief.sourceHealth as { items?: Array<{ name: string; status: string; lastError?: string | null }> }) ?? { items: [] };

  return (
    <main className="mx-auto max-w-[920px] flex-1 overflow-y-auto px-10 py-12">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Weekly Investor Brief · Issue {brief.issueNumber}
      </div>
      <h1 className="mb-1 text-[36px] font-semibold leading-[1.1] tracking-tighter">
        {brief.title}
      </h1>
      <p className="mb-8 text-[15.5px] text-muted-2">
        {fmtDate(brief.windowStart)} – {fmtDate(brief.windowEnd)}
      </p>

      <Section title="Top movers" meta={`${movers.length} flagged`}>
        <ul>
          {movers.map((m, i) => (
            <li
              key={i}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3.5 border-b border-line-2 py-3.5 last:border-b-0"
            >
              <div>
                <div className="text-[14.5px] font-semibold leading-tight tracking-tight">
                  {m.name}
                </div>
                <div className="mt-0.5 font-mono text-[11.5px] text-muted">
                  {m.publicId ?? ""}
                </div>
              </div>
              {m.scoreDelta != null && (
                <div className="font-mono text-[13px] font-semibold text-crit">
                  ▲ +{m.scoreDelta}
                </div>
              )}
              <button className="gcir-btn">Open</button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="What changed this week" meta="analyst narrative">
        <div className="space-y-3 text-[15px] leading-relaxed text-ink-2">
          {brief.narrative.split(/\n\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Section>

      <Section title="Recommended actions" meta={`${actions.length} actions`}>
        <ul className="flex flex-col gap-2">
          {actions.map((a, i) => (
            <li
              key={i}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-3.5 rounded-md border border-line bg-bg-2 px-3.5 py-3"
            >
              <span className="mt-0.5 font-mono text-[11px] font-semibold text-muted">
                {String(a.rank).padStart(2, "0")}
              </span>
              <div>
                <div className="text-[14px] font-semibold tracking-tight text-ink">{a.title}</div>
                {a.why && <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{a.why}</div>}
              </div>
              <button className="gcir-btn-primary">Open</button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Source health" meta={`${health.items?.length ?? 0} sources`}>
        <div className="grid grid-cols-3 gap-3">
          {(health.items ?? []).map((it, i) => (
            <div key={i} className="rounded-md border border-line bg-white px-3.5 py-3">
              <div className="text-[12px] text-muted-2">{it.name}</div>
              <div className="mt-1 font-mono text-[18px] font-semibold tracking-tight">
                {it.status === "ACTIVE" ? "100%" : it.status === "DEGRADED" ? "62%" : "—"}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted">{it.status}</div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-9">
      <header className="mb-3.5 flex items-baseline justify-between border-b border-line pb-2.5">
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        {meta && <span className="font-mono text-[11.5px] text-muted">{meta}</span>}
      </header>
      {children}
    </section>
  );
}
