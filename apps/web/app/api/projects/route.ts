import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";
import { scoreBand } from "@gcir/shared";

export async function GET() {
  const projects = await prisma.project.findMany({
    where: { status: "suspected" },
    orderBy: [{ score: "desc" }],
    include: {
      sites: { take: 1, orderBy: { createdAt: "asc" } },
    },
    take: 100,
  });

  return NextResponse.json({
    projects: projects.map((p) => ({
      id: p.id,
      publicId: p.publicId,
      name: p.name,
      stage: p.stage,
      score: p.score,
      band: scoreBand(p.score),
      parishCounty: p.parishCounty,
      state: p.state,
      corridor: p.corridor,
      acres: p.sites[0]?.totalAcres ?? null,
      facilityType: p.facilityType,
      lat: p.sites[0]?.centerLat ?? null,
      lng: p.sites[0]?.centerLng ?? null,
      firstSignalAt: p.firstSignalAt,
      estimatedCapex: p.estimatedCapex,
    })),
  });
}
