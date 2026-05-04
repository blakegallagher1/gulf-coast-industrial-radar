import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@gcir/db";
import { fmtDate } from "@/lib/format";
import { ShareLinkButton } from "@/components/share-link-button";
import { FollowControls } from "./follow-controls";

export const dynamic = "force-dynamic";

export default async function WatchlistDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const watchlist = await prisma.watchlist.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          project: {
            select: {
              id: true,
              publicId: true,
              name: true,
              score: true,
              status: true,
              stage: true,
            },
          },
        },
      },
    },
  });

  if (!watchlist) notFound();

  const filterEntries = describeFilter(watchlist.filter);
  const followMeta = readFollowMeta(watchlist.filter);

  return (
    <main className="mx-auto max-w-[1120px] flex-1 overflow-y-auto px-10 py-9">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Watchlist
      </div>
      <h1 className="mb-1 text-[34px] font-semibold leading-[1.1] tracking-tighter">
        {watchlist.name}
      </h1>
      {watchlist.description && <p className="mb-4 text-muted">{watchlist.description}</p>}

      <div className="mb-6 flex gap-3 text-[12px] text-muted">
        <span>{watchlist.items.length} items</span>
        <span className="font-mono">created {fmtDate(watchlist.createdAt)}</span>
        <span>shared {watchlist.isShared ? "yes" : "no"}</span>
      </div>

      <FollowControls
        watchlistId={watchlist.id}
        initialFollowed={followMeta.followed}
        initialDeliveryMode={followMeta.deliveryMode}
      />

      <div className="mb-6 flex gap-2">
        <ShareLinkButton path={`/watchlists/${watchlist.id}`} label="Share watchlist" />
        <Link href="/briefs" className="gcir-btn">
          Open briefs
        </Link>
      </div>

      <section className="mb-6 overflow-hidden rounded-md border border-line">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Saved criteria
        </div>
        <div className="px-4 py-4">
          {filterEntries.length === 0 ? (
            <div className="text-sm text-muted">
              No saved criteria were preserved on this watchlist.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filterEntries.map((entry) => (
                <div
                  key={entry.key}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] text-ink-2"
                >
                  <span className="font-semibold text-ink">{entry.label}:</span>{" "}
                  <span className="font-mono text-[11.5px]">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
          {watchlist.isShared && (
            <div className="mt-3 text-[12.5px] text-muted">
              Shareable URL: <span className="font-mono text-ink">/watchlists/{watchlist.id}</span>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-line">
        <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Saved projects
        </div>
        <ul>
          {watchlist.items.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted">
              This watchlist has no matched projects yet.
            </li>
          )}
          {watchlist.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between border-b border-line px-4 py-3.5 last:border-b-0">
              <div>
                <Link
                  href={`/radar?projectId=${encodeURIComponent(item.project.id)}`}
                  className="text-[14px] font-semibold"
                >
                  {item.project.name}
                </Link>
                <div className="mt-0.5 font-mono text-[11px] text-muted">{item.project.publicId}</div>
              </div>
              <div className="text-right text-[11.5px] text-muted">
                {item.project.stage.toLowerCase().replace(/_/g, "-")}
                <div className="mt-0.5 font-mono text-[13px] text-ink">{item.project.score}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4">
        <Link href="/watchlists" className="gcir-btn">
          Back to watchlists
        </Link>
      </div>
    </main>
  );
}

function describeFilter(filter: unknown): Array<{ key: string; label: string; value: string }> {
  if (!filter || typeof filter !== "object" || Array.isArray(filter)) return [];

  const entries: Array<{ key: string; label: string; value: string }> = [];
  for (const [key, rawValue] of Object.entries(filter)) {
    const value = formatFilterValue(rawValue);
    if (!value) continue;
    entries.push({
      key,
      label: humanizeKey(key),
      value,
    });
  }
  return entries;
}

function formatFilterValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatFilterValue(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    const objectParts = Object.entries(value)
      .map(([k, v]) => {
        const formatted = formatFilterValue(v);
        return formatted ? `${humanizeKey(k)} ${formatted}` : null;
      })
      .filter((item): item is string => Boolean(item));
    return objectParts.length > 0 ? objectParts.join(" · ") : null;
  }
  return null;
}

function humanizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function readFollowMeta(filter: unknown): {
  followed: boolean;
  deliveryMode: "weekly_brief" | "manual";
} {
  if (!filter || typeof filter !== "object" || Array.isArray(filter)) {
    return { followed: false, deliveryMode: "manual" };
  }

  const record = filter as Record<string, unknown>;
  const followed = record.followed === true;
  const deliveryMode =
    record.deliveryMode === "weekly_brief" ? "weekly_brief" : "manual";

  return { followed, deliveryMode };
}
