import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sites = await prisma.site.findMany({
    where: { projectId: id },
    include: {
      parcels: {
        include: {
          parcel: true,
          buyerEntity: { select: { name: true } },
        },
      },
    },
  });

  const parcels = sites.flatMap((s) =>
    s.parcels.map((pi) => ({
      id: pi.parcel.id,
      parcelNumber: pi.parcel.parcelNumber,
      acres: pi.parcel.acres,
      zoning: pi.parcel.zoning,
      buyerName: pi.buyerEntity?.name ?? null,
      acquiredAt: pi.acquiredAt,
      pricePerAcre: pi.pricePerAcre ? Number(pi.pricePerAcre) : null,
      centerLat: pi.parcel.centerLat,
      centerLng: pi.parcel.centerLng,
    })),
  );

  return NextResponse.json({ parcels });
}
