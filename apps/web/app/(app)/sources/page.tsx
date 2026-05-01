import { prisma } from "@gcir/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-accent/[0.06] text-accent-ink ring-accent/30",
  DEGRADED: "bg-warn/[0.06] text-warn ring-warn/30",
  PAUSED: "bg-bg-3 text-muted ring-line",
  TODO: "bg-bg-3 text-muted ring-line",
  RETIRED: "bg-bg-3 text-muted ring-line",
};

export default async function SourcesPage() {
  const sources = await prisma.source.findMany({
    orderBy: [{ family: "asc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-[1120px] flex-1 overflow-y-auto px-10 py-9">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Source registry
      </div>
      <h1 className="mb-1 text-[36px] font-semibold leading-[1.1] tracking-tighter">
        Free, public Gulf Coast sources
      </h1>
      <p className="mb-6 text-[15.5px] text-muted-2">
        {sources.length} sources across Louisiana, Texas, Mississippi, Alabama, Florida, and federal agencies. Provenance preserved per claim — every alert links to its raw evidence.
      </p>

      <table className="mt-4 w-full border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr>
            {["Source", "Provides", "Cadence", "Last run", "Status", "Research"].map((h) => (
              <th
                key={h}
                className="border-b border-line bg-bg-2 px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id} className="hover:bg-bg-2">
              <td className="border-b border-line-2 px-2.5 py-2.5 align-top">
                <div className="font-semibold text-ink">{s.name}</div>
                <div className="mt-0.5 text-[11px] text-muted">{s.jurisdiction}</div>
              </td>
              <td className="border-b border-line-2 px-2.5 py-2.5 align-top text-ink-2">
                {s.family.toLowerCase().replace(/_/g, " ")}
                {s.notes && <div className="mt-0.5 text-[11px] text-muted">{s.notes}</div>}
              </td>
              <td className="border-b border-line-2 px-2.5 py-2.5 align-top font-mono text-[11.5px] text-muted-2">
                {s.cadence.toLowerCase()}
              </td>
              <td className="border-b border-line-2 px-2.5 py-2.5 align-top font-mono text-[11.5px] text-ink-3">
                {s.lastOkAt ? fmtDate(s.lastOkAt) : "—"}
              </td>
              <td className="border-b border-line-2 px-2.5 py-2.5 align-top">
                <span
                  className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11.5px] ring-1 ${STATUS_STYLES[s.status] ?? "bg-bg-3 text-muted ring-line"}`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "currentColor" }}
                  />
                  {s.status}
                </span>
              </td>
              <td className="border-b border-line-2 px-2.5 py-2.5 align-top">
                <a
                  href={`https://github.com/blakegallagher1/gulf-coast-industrial-radar/blob/main/packages/adapters/src/research/${s.slug}.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-muted underline decoration-line decoration-1 underline-offset-2 hover:text-ink"
                >
                  {s.slug}.md
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <aside className="mt-8 rounded-md border border-line bg-bg-2 p-4 text-[13px] leading-relaxed text-ink-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Provenance promise
        </div>
        Every claim in the radar links back to its raw source document. Each ingestion run preserves the source URL, observed date, response snapshot, extraction confidence, and an evidence excerpt. Source license and robots/terms review status is tracked per source. No paid aggregators, no proprietary databases, no scraping that violates terms.
      </aside>
    </main>
  );
}
