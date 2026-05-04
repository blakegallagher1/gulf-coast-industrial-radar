/**
 * GET /api/projects/[id]/parcel-signals
 *
 * Returns a GeoJSON FeatureCollection built from LAND_CONTROL Signal payloads
 * that are spatially near the project's primary site centroid.
 * Each feature carries: owner, parcelNumber, acres, zoning, floodZone, saleYear.
 */

import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";

type Ring = [number, number][];

interface ParcelPayload {
  owner?: string | null;
  parcelNumber?: string | null;
  acresApprox?: number | string | null;
  zoning?: string | null;
  floodZone?: string | null;
  saleYear?: string | null;
  ownerAddress?: string | null;
  geometry?: { rings?: Ring[] } | null;
}

function ringsToGeoJsonPolygon(rings: Ring[]): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: rings.map((ring) => ring.map(([lng, lat]) => [lng, lat])),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { sites: { take: 1, orderBy: { createdAt: "asc" } } },
  });

  if (!project || !project.sites[0]?.centerLat || !project.sites[0]?.centerLng) {
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }

  const lat = project.sites[0].centerLat;
  const lng = project.sites[0].centerLng;
  const RADIUS = 0.18;

  const signals = await prisma.$queryRaw<
    Array<{ id: string; subjectLabel: string; observedAt: Date; payload: unknown }>
  >`
    SELECT id, "subjectLabel", "observedAt", payload
    FROM "Signal"
    WHERE family = 'LAND_CONTROL'
      AND (payload->'geometry'->'rings'->0->0->1)::float
          BETWEEN ${lat - RADIUS} AND ${lat + RADIUS}
      AND (payload->'geometry'->'rings'->0->0->0)::float
          BETWEEN ${lng - RADIUS} AND ${lng + RADIUS}
    ORDER BY "observedAt" DESC
    LIMIT 2000
  `;

  const features: GeoJSON.Feature[] = [];

  for (const sig of signals) {
    const p = sig.payload as ParcelPayload;
    const rings = p?.geometry?.rings;
    if (!rings?.length) continue;

    features.push({
      type: "Feature",
      id: sig.id,
      geometry: ringsToGeoJsonPolygon(rings),
      properties: {
        signalId: sig.id,
        owner: p.owner ?? null,
        parcelNumber: p.parcelNumber ?? null,
        acres: p.acresApprox ? Number(p.acresApprox) : null,
        zoning: p.zoning ?? null,
        floodZone: p.floodZone ?? null,
        saleYear: p.saleYear ?? null,
        ownerAddress: p.ownerAddress ?? null,
        observedAt: sig.observedAt.toISOString(),
        label: sig.subjectLabel,
      },
    });
  }

  return NextResponse.json(
    { type: "FeatureCollection", features },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
