import { prisma } from "@gcir/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, FileText, Mail, TrendingUp } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { PublishControls } from "./publish-controls";

export const dynamic = "force-dynamic";

type SourceHealthItem = { name: string; status: string; lastError?: string | null };
type FollowedWatchlist = { id?: string; name: string };
type WatchlistFocusProject = {
  projectPublicId: string;
  projectName: string;
  score?: number;
  watchlistNames?: string[];
};
type FollowedWatchlistDelivery = {
  recipientCount?: number;
  queuedRecipients?: number;
  publishedAt?: string;
  watchlistCount?: number;
};
type BriefSourceHealth = {
  items: SourceHealthItem[];
  followedWatchlists: FollowedWatchlist[];
  watchlistFocus: WatchlistFocusProject[];
  followedWatchlistDelivery?: FollowedWatchlistDelivery;
};

export default async function BriefView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brief = await prisma.brief.findUnique({
    where: { id },
    include: {
      recipients: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!brief) notFound();

  const movers = (brief.topMovers as Array<{ publicId?: string; name?: string; scoreDelta?: number }>) ?? [];
  const actions = (brief.recommendedActions as Array<{ rank: number; title: string; why?: string }>) ?? [];
  const health = readSourceHealth(brief.sourceHealth);
  const currentFollowedRecipientCount = await loadCurrentFollowedRecipientCount();
  const followedDeliveryRecipientCount =
    health.followedWatchlistDelivery?.recipientCount ?? currentFollowedRecipientCount;
  const followedDeliveryLabel = health.followedWatchlistDelivery?.publishedAt
    ? "included recipients"
    : "eligible recipients";

  return (
    <main className="mx-auto max-w-[960px] flex-1 overflow-y-auto px-10 py-12">
      {/* Back link + meta */}
      <div className="mb-6 flex items-center justify-between">
        <Link href={"/briefs" as any} className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink">
          <ChevronLeft className="h-3 w-3" />
          Back to issues
        </Link>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
          Issue {String(brief.issueNumber).padStart(3, "0")} · {brief.publishedAt ? "published" : "draft"}
        </span>
      </div>

      {/* Editorial masthead */}
      <header className="relative pb-10">
        <div className="gcir-eyebrow">
          <span className="num">§{String(brief.issueNumber).padStart(2, "0")}</span>
          <span>Weekly investor brief</span>
        </div>

        <h1 className="mt-3 font-display text-[52px] leading-[1.0] tracking-[-0.022em] text-ink sm:text-[68px]">
          {brief.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="text-accent-ink">window</span>
          <span className="text-ink-3">{fmtDate(brief.windowStart)} → {fmtDate(brief.windowEnd)}</span>
          <span className="h-3 w-px bg-line" />
          <span className="text-accent-ink">issued</span>
          <span className="text-ink-3">{brief.publishedAt ? fmtDate(brief.publishedAt) : "in draft"}</span>
          <span className="h-3 w-px bg-line" />
          <span className="text-accent-ink">analyst</span>
          <span className="text-ink-3">BriefWriter v1</span>
        </div>

        <div className="gcir-horizon mt-7" />
      </header>

      <PublishControls
        briefId={brief.id}
        initialPublished={Boolean(brief.publishedAt)}
        followedWatchlistCount={health.followedWatchlists.length}
        watchlistFocusCount={health.watchlistFocus.length}
        followedDeliveryRecipientCount={followedDeliveryRecipientCount}
        followedDeliveryLabel={followedDeliveryLabel}
        queuedRecipientCount={brief.recipients.length}
      />

      <Section
        sectionCode="§01"
        title="Top movers"
        meta={`${movers.length} flagged`}
        icon={<TrendingUp className="h-3.5 w-3.5" />}
      >
        {movers.length === 0 ? (
          <Empty />
        ) : (
          <ul className="overflow-hidden rounded-[7px] border border-line bg-bone">
            {movers.map((m, i) => (
              <li
                key={i}
                className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-4 border-b border-line/60 px-5 py-4 transition-colors last:border-b-0 hover:bg-bone-2/50"
              >
                <span className="font-mono text-[11px] tabular-nums text-muted-2">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="font-display text-[20px] leading-tight tracking-tight text-ink">
                    {m.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted">
                    {m.publicId ?? "—"}
                  </div>
                </div>
                {m.scoreDelta != null && (
                  <span className="inline-flex items-center gap-1 rounded-[3px] border border-crit/30 bg-crit/[0.10] px-2 py-1 font-mono text-[12px] font-semibold text-crit tabular-nums">
                    ▲ +{m.scoreDelta}
                  </span>
                )}
                <button className="gcir-btn">
                  Open <ArrowUpRight className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        sectionCode="§02"
        title="Followed watchlist attribution"
        meta={`${health.followedWatchlists.length} watchlists · ${health.watchlistFocus.length} projects`}
        icon={<Mail className="h-3.5 w-3.5" />}
      >
        {health.followedWatchlists.length === 0 && health.watchlistFocus.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-hidden rounded-[7px] border border-line bg-bone">
            <div className="grid grid-cols-3 gap-px bg-line/60">
              <AttributionCell value={String(health.followedWatchlists.length)} label="contributing watchlists" />
              <AttributionCell value={String(health.watchlistFocus.length)} label="followed projects" />
              <AttributionCell value={String(followedDeliveryRecipientCount)} label={followedDeliveryLabel} />
            </div>

            <div className="grid gap-px bg-line/60 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="bg-bone px-5 py-4">
                <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent-ink">
                  Followed watchlists
                </div>
                <ul className="mt-3 space-y-2">
                  {health.followedWatchlists.map((watchlist) => (
                    <li key={watchlist.id ?? watchlist.name} className="rounded-[5px] border border-line bg-bone-2/50 px-3 py-2.5">
                      <div className="font-sans text-[13.5px] font-semibold tracking-tight text-ink">{watchlist.name}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        weekly brief follow state
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-bone px-5 py-4">
                <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent-ink">
                  Projects pulled by follow state
                </div>
                {health.watchlistFocus.length === 0 ? (
                  <div className="mt-3 rounded-[5px] border border-dashed border-line bg-bone-2/40 px-3 py-4 text-[12.5px] text-muted">
                    No scored projects crossed the followed-watchlist threshold for this issue.
                  </div>
                ) : (
                  <ul className="mt-3 divide-y divide-line rounded-[5px] border border-line bg-bone-2/40">
                    {health.watchlistFocus.map((project) => (
                      <li key={project.projectPublicId} className="px-3.5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-display text-[18px] leading-tight tracking-tight text-ink">
                              {project.projectName}
                            </div>
                            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                              {project.projectPublicId}
                            </div>
                          </div>
                          {project.score != null && (
                            <span className="rounded-[3px] border border-info/30 bg-info/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-info">
                              score {project.score}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(project.watchlistNames ?? []).map((name) => (
                            <span key={name} className="rounded-[3px] border border-line bg-bone px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.10em] text-muted">
                              {name}
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section
        sectionCode="§03"
        title="What changed this week"
        meta="analyst narrative"
      >
        <article className="rounded-[7px] border border-line bg-bone px-7 py-7">
          <div className="space-y-4 font-sans text-[16px] leading-[1.7] text-ink-2 first-letter:font-display first-letter:text-[64px] first-letter:font-normal first-letter:leading-[0.85] first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-ink">
            {brief.narrative.split(/\n\n+/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </article>
      </Section>

      <Section
        sectionCode="§04"
        title="Recommended actions"
        meta={`${actions.length} actions`}
      >
        {actions.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {actions.map((a, i) => (
              <li
                key={i}
                className="group grid grid-cols-[44px_1fr_auto] items-start gap-4 rounded-[7px] border border-line bg-bone px-5 py-4 transition-all hover:border-ink/30 hover:shadow-sm"
              >
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-line bg-bone-2 font-mono text-[11px] font-semibold tabular-nums text-ink-2">
                  {String(a.rank).padStart(2, "0")}
                </span>
                <div>
                  <div className="font-sans text-[14.5px] font-semibold tracking-tight text-ink">{a.title}</div>
                  {a.why && <div className="mt-1 text-[12.5px] leading-relaxed text-muted">{a.why}</div>}
                </div>
                <button className="gcir-btn-accent self-start">
                  Open <ArrowUpRight className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        sectionCode="§05"
        title="Source health"
        meta={`${health.items?.length ?? 0} sources`}
      >
        {(!health.items || health.items.length === 0) ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {health.items!.map((it, i) => {
              const isActive = it.status === "ACTIVE";
              const isDegraded = it.status === "DEGRADED";
              const tone = isActive ? "info" : isDegraded ? "accent" : "muted";
              return (
                <div key={i} className="rounded-[6px] border border-line bg-bone px-4 py-3.5">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted line-clamp-1">{it.name}</div>
                  <div
                    className={
                      "mt-1.5 font-display text-[24px] leading-none tabular-nums " +
                      (tone === "info" ? "text-info" : tone === "accent" ? "text-accent-ink" : "text-muted-2")
                    }
                  >
                    {isActive ? "100%" : isDegraded ? "62%" : "—"}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-info" : isDegraded ? "bg-accent" : "bg-muted-2"}`} />
                    {it.status.toLowerCase()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* End of brief mark */}
      <div className="mt-12 flex items-center justify-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
        <span className="h-px w-12 bg-line" />
        <FileText className="h-3 w-3" />
        End of issue · brick &amp; yield
        <span className="h-px w-12 bg-line" />
      </div>
    </main>
  );
}

function readSourceHealth(value: unknown): BriefSourceHealth {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { items: [], followedWatchlists: [], watchlistFocus: [] };
  }

  const record = value as {
    items?: SourceHealthItem[];
    followedWatchlists?: FollowedWatchlist[];
    watchlistFocus?: WatchlistFocusProject[];
    followedWatchlistDelivery?: FollowedWatchlistDelivery;
  };

  return {
    items: Array.isArray(record.items) ? record.items : [],
    followedWatchlists: Array.isArray(record.followedWatchlists) ? record.followedWatchlists : [],
    watchlistFocus: Array.isArray(record.watchlistFocus) ? record.watchlistFocus : [],
    followedWatchlistDelivery:
      record.followedWatchlistDelivery && typeof record.followedWatchlistDelivery === "object"
        ? record.followedWatchlistDelivery
        : undefined,
  };
}

async function loadCurrentFollowedRecipientCount(): Promise<number> {
  const watchlists = await prisma.watchlist.findMany({
    where: {
      AND: [
        { filter: { path: ["followed"], equals: true } },
        { filter: { path: ["deliveryMode"], equals: "weekly_brief" } },
      ],
      userId: { not: null },
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return new Set(
    watchlists
      .map((watchlist) => watchlist.user?.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email && email.includes("@"))),
  ).size;
}

function Section({
  sectionCode,
  title,
  meta,
  icon,
  children,
}: {
  sectionCode: string;
  title: string;
  meta?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <header className="mb-4 flex items-baseline justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent-ink">{sectionCode}</span>
          {icon && <span className="text-muted-2">{icon}</span>}
          <h2 className="font-display text-[26px] leading-tight tracking-tight text-ink">{title}</h2>
        </div>
        {meta && <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function AttributionCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-bone px-4 py-4">
      <div className="font-display text-[32px] leading-none tracking-tight text-ink">{value}</div>
      <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">{label}</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-[6px] border border-dashed border-line bg-bone-2/40 px-5 py-8 text-center text-[13px] text-muted">
      Nothing reported in this section.
    </div>
  );
}
