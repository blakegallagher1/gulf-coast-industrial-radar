import { prisma } from "@gcir/db";
import { scoreBand } from "@gcir/shared";
import type { Metadata } from "next";
import { RadarShell } from "@/components/radar/RadarShell";
import { UsageEventTracker } from "@/components/usage-event-tracker";

export const metadata: Metadata = { title: "Radar" };
export const dynamic = "force-dynamic";

function resolveSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.trim() ? value[0].trim() : null;
  return value.trim() || null;
}

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolvedParams = await Promise.resolve(searchParams);
  const initialProjectId = resolveSearchParam(resolvedParams.projectId);

  const [projects, sourcesAgg] = await Promise.all([
    prisma.project.findMany({
      where: { status: "suspected" },
      orderBy: [{ score: "desc" }],
      include: {
        sites: { take: 1, orderBy: { createdAt: "asc" } },
      },
      take: 60,
    }),
    prisma.source.findMany({
      select: { name: true, status: true, lastError: true, lastRunAt: true },
    }),
  ]);

  const enriched = projects
    .filter((p) => p.sites[0]?.centerLat != null && p.sites[0]?.centerLng != null)
    .map((p) => ({
      id: p.id,
      publicId: p.publicId,
      name: p.name,
      stage: p.stage,
      score: p.score,
      band: scoreBand(p.score),
      parishCounty: p.parishCounty ?? "",
      state: p.state ?? "",
      corridor: p.corridor ?? "",
      acres: p.sites[0]?.totalAcres ?? null,
      facilityType: p.facilityType ?? null,
      lat: p.sites[0]!.centerLat!,
      lng: p.sites[0]!.centerLng!,
      firstSignalAt: p.firstSignalAt?.toISOString() ?? null,
      estimatedCapex: p.estimatedCapex ?? null,
    }));

  const ok = sourcesAgg.filter((s) => s.status === "ACTIVE").length;
  const degraded = sourcesAgg.filter((s) => s.status === "DEGRADED").length;
  const totalSources = sourcesAgg.length;

  return (
    <>
      <UsageEventTracker
        eventType="page_view"
        surface="radar"
        targetType={initialProjectId ? "project" : undefined}
        targetId={initialProjectId ?? undefined}
        metadata={{ projectCount: enriched.length }}
      />
      <RadarShell
        projects={enriched}
        sources={sourcesAgg.map((s) => ({ slug: s.name, status: s.status }))}
        health={{ ok, degraded, total: totalSources }}
        initialProjectId={initialProjectId ?? undefined}
        plan="pro"
      />
    </>
  );
}
