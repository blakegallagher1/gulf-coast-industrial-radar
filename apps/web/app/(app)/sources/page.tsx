import { prisma } from "@gcir/db";
import { fmtDate } from "@/lib/format";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

type StatusStyle = { bg: string; text: string; ring: string; dot: string; label: string };

const DEFAULT_STATUS_STYLE: StatusStyle = {
  bg: "bg-bone-3/70", text: "text-muted", ring: "ring-line", dot: "bg-muted-2", label: "mapped",
};

const STATUS_STYLES: Record<string, StatusStyle> = {
  ACTIVE:   { bg: "bg-info/[0.10]",   text: "text-info",       ring: "ring-info/30",   dot: "bg-info",        label: "active"   },
  DEGRADED: { bg: "bg-accent/[0.14]", text: "text-accent-ink", ring: "ring-accent/40", dot: "bg-accent",      label: "degraded" },
  PAUSED:   { bg: "bg-bone-3/70",     text: "text-muted",      ring: "ring-line",      dot: "bg-muted-2",     label: "paused"   },
  TODO:     DEFAULT_STATUS_STYLE,
  RETIRED:  { bg: "bg-bone-3/70",     text: "text-muted",      ring: "ring-line",      dot: "bg-muted-2",     label: "retired"  },
};

export default async function SourcesPage() {
  const sources = await prisma.source.findMany({
    orderBy: [{ family: "asc" }, { name: "asc" }],
  });

  const counts = sources.reduce(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <main className="mx-auto max-w-[1180px] flex-1 overflow-y-auto px-10 py-12">
      <PageHeader
        sectionCode="§S"
        eyebrow="Public source registry"
        title="Free, public Gulf Coast"
        titleAccent="industrial sources."
        description={`${sources.length} sources across Louisiana, Texas, Mississippi, Alabama, Florida, and federal agencies. Provenance preserved per claim — every alert links to its raw evidence.`}
        meta="0 paid aggregators"
      />

      {/* Status spec strip */}
      <section className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-[7px] border border-line bg-line/60 sm:grid-cols-5">
        <SourceStat label="Active"   value={String(counts.ACTIVE   ?? 0)} tone="info"   />
        <SourceStat label="Degraded" value={String(counts.DEGRADED ?? 0)} tone="accent" />
        <SourceStat label="Paused"   value={String(counts.PAUSED   ?? 0)} tone="muted"  />
        <SourceStat label="Mapped"   value={String(counts.TODO     ?? 0)} tone="muted"  />
        <SourceStat label="Retired"  value={String(counts.RETIRED  ?? 0)} tone="muted"  />
      </section>

      <div className="overflow-hidden rounded-[7px] border border-line bg-bone shadow-sm">
        <div className="grid grid-cols-[2.2fr_1.8fr_120px_140px_120px_140px] items-center gap-x-4 border-b border-line bg-bone-2/70 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>Source</span>
          <span>Provides</span>
          <span>Cadence</span>
          <span>Last run</span>
          <span>Status</span>
          <span className="text-right">Research note</span>
        </div>

        {sources.map((s) => {
          const styles: StatusStyle = STATUS_STYLES[s.status] ?? DEFAULT_STATUS_STYLE;
          return (
            <div
              key={s.id}
              className="group grid grid-cols-[2.2fr_1.8fr_120px_140px_120px_140px] items-center gap-x-4 border-b border-line/60 px-5 py-3.5 transition-colors last:border-b-0 hover:bg-bone-2/50"
            >
              <div>
                <div className="font-sans text-[13.5px] font-semibold tracking-tight text-ink">{s.name}</div>
                <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted">{s.jurisdiction}</div>
              </div>
              <div className="text-[12.5px] text-ink-3">
                <span className="capitalize">{s.family.toLowerCase().replace(/_/g, " ")}</span>
                {s.notes && <div className="mt-0.5 line-clamp-1 text-[11.5px] text-muted">{s.notes}</div>}
              </div>
              <div className="font-mono text-[11px] text-muted">{s.cadence.toLowerCase()}</div>
              <div className="font-mono text-[11px] text-ink-3">{s.lastOkAt ? fmtDate(s.lastOkAt) : "—"}</div>
              <div>
                <span className={`inline-flex items-center gap-1.5 rounded-[3px] px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.10em] ring-1 ${styles.bg} ${styles.text} ${styles.ring}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                  {styles.label}
                </span>
              </div>
              <a
                href={`https://github.com/blakegallagher1/gulf-coast-industrial-radar/blob/main/packages/adapters/src/research/${s.slug}.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-end gap-1 font-mono text-[10.5px] text-muted transition-colors hover:text-ink"
              >
                {s.slug}.md
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          );
        })}
      </div>

      <aside className="mt-10 grid grid-cols-12 gap-6 rounded-[7px] border border-line bg-bone-2/40 px-7 py-7">
        <div className="col-span-12 lg:col-span-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] bg-accent/15 text-accent-ink">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="font-display text-[20px] leading-tight tracking-tight text-ink">Provenance promise</div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-9 text-[13.5px] leading-[1.65] text-ink-3">
          Every claim in the radar links back to its raw source document. Each ingestion run preserves the source URL,
          observed date, response snapshot, extraction confidence, and an evidence excerpt. Source license and robots/terms
          review status is tracked per source. <strong className="font-medium text-ink">No paid aggregators. No proprietary databases. No scraping that violates terms.</strong>
        </div>
      </aside>
    </main>
  );
}

function SourceStat({ label, value, tone }: { label: string; value: string; tone: "info" | "accent" | "muted" }) {
  const colors = {
    info:   "text-info",
    accent: "text-accent-ink",
    muted:  "text-ink-2",
  };
  return (
    <div className="bg-bone px-5 py-5">
      <div className={`font-display text-[36px] leading-none tracking-[-0.025em] ${colors[tone]}`}>{value}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
    </div>
  );
}
