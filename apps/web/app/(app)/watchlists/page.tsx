import { prisma } from "@gcir/db";
import { fmtDate } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WatchlistsPage() {
  const watchlists = await prisma.watchlist.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true, alerts: true } } },
  });

  return (
    <main className="mx-auto max-w-[1120px] flex-1 overflow-y-auto px-10 py-9">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Watchlists
      </div>
      <h1 className="mb-1 text-[36px] font-semibold leading-[1.1] tracking-tighter">
        Your watch criteria
      </h1>
      <p className="mb-6 text-[15.5px] text-muted-2">
        Each watchlist is a saved filter against the radar. New alerts that match the filter
        will surface in your weekly brief and the Followed tab.
      </p>

      {watchlists.length === 0 && (
        <div className="rounded-md border border-dashed border-line bg-bg-2 px-6 py-10 text-center text-sm text-muted">
          No watchlists yet. Create one from the Radar — filters become a saveable view.
        </div>
      )}

      <ul className="mt-2 divide-y divide-line">
        {watchlists.map((w) => (
          <li key={w.id} className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[15.5px] font-semibold tracking-tight">{w.name}</div>
                {w.description && (
                  <div className="mt-0.5 text-[13px] text-muted">{w.description}</div>
                )}
                <div className="mt-1 flex gap-3 text-[11.5px] text-muted">
                  <span>{w._count.items} items</span>
                  <span>{w._count.alerts} alerts</span>
                  <span className="font-mono">created {fmtDate(w.createdAt)}</span>
                </div>
              </div>
              <Link href={`/watchlists/${w.id}`} className="gcir-btn">
                Open
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
