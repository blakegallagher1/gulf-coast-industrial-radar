import { prisma } from "@gcir/db";
import { fmtDate } from "@/lib/format";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function WatchlistsPage() {
  const watchlists = await prisma.watchlist.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true, alerts: true } } },
  });

  const totalItems = watchlists.reduce((sum, w) => sum + w._count.items, 0);
  const totalAlerts = watchlists.reduce((sum, w) => sum + w._count.alerts, 0);
  const sharedCount = watchlists.filter((w) => w.isShared).length;

  return (
    <main className="mx-auto max-w-[1180px] flex-1 overflow-y-auto px-10 py-12">
      <PageHeader
        sectionCode="§W"
        eyebrow="Saved corridors · operator queue"
        title="Watchlists"
        titleAccent="saved filters that learn."
        description="Each watchlist is a saved view of the radar — a stored filter set against corridors, score bands, signal families, and named projects. New alerts that match the filter surface in your Monday brief and the Followed tab."
        meta={`${watchlists.length} active`}
      />

      {/* Summary spec sheet */}
      <section className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-[7px] border border-line bg-line/60 sm:grid-cols-4">
        <SummaryCell value={String(watchlists.length)} label="Watchlists" />
        <SummaryCell value={String(totalItems)}        label="Saved items" />
        <SummaryCell value={String(totalAlerts)}       label="Linked alerts" />
        <SummaryCell value={String(sharedCount)}       label="Shared to team" />
      </section>

      {watchlists.length === 0 && (
        <div className="rounded-[7px] border border-dashed border-line bg-bone-2/40 px-6 py-14 text-center">
          <Bookmark className="mx-auto mb-3 h-5 w-5 text-muted" />
          <h3 className="font-display text-[22px] tracking-tight text-ink">No watchlists yet</h3>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
            Save a radar filter to start a watchlist — corridor + score band + signal family becomes a stored,
            shareable view that drives recurring brief and review workflows.
          </p>
          <Link href={"/radar" as any} className="gcir-btn-primary mt-5 inline-flex">
            Open the radar <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <ul className="grid gap-3.5 sm:grid-cols-2">
        {watchlists.map((w) => (
          <li key={w.id}>
            <Link
              href={`/watchlists/${w.id}`}
              className="group relative block overflow-hidden rounded-[7px] border border-line bg-bone p-5 transition-all hover:border-ink/30 hover:shadow-md"
            >
              {/* Phosphor stripe on hover */}
              <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-accent transition-transform group-hover:scale-y-100" />

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    <Bookmark className="h-3 w-3" />
                    <span>{w.isShared ? "shared · team" : "private"}</span>
                  </div>
                  <h2 className="mt-2 font-display text-[22px] leading-tight tracking-tight text-ink">
                    {w.name}
                  </h2>
                  {w.description && (
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
                      {w.description}
                    </p>
                  )}
                </div>
                <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-muted-2 transition-all group-hover:text-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>

              <div className="gcir-horizon mt-4 opacity-50" />

              <div className="mt-4 flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-4">
                  <SpecPill label="items" value={String(w._count.items)} />
                  <SpecPill label="alerts" value={String(w._count.alerts)} icon={<Bell className="h-2.5 w-2.5" />} />
                </div>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
                  {fmtDate(w.createdAt)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function SummaryCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-bone px-5 py-5">
      <div className="font-display text-[40px] leading-none tracking-[-0.025em] text-ink">{value}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
    </div>
  );
}

function SpecPill({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      {icon}
      <span className="font-mono text-ink-2 font-semibold">{value}</span>
      <span className="text-muted-2">{label}</span>
    </span>
  );
}
