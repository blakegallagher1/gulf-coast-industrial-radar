import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Find buyer entities through ParcelInterest → Site → Project
  const sites = await prisma.site.findMany({
    where: { projectId: id },
    include: {
      parcels: { include: { buyerEntity: true } },
    },
  });

  const entityMap = new Map<string, NonNullable<typeof sites[0]["parcels"][0]["buyerEntity"]>>();
  for (const s of sites) {
    for (const pi of s.parcels) {
      if (pi.buyerEntity) entityMap.set(pi.buyerEntity.id, pi.buyerEntity);
    }
  }
  const entities = Array.from(entityMap.values());

  // Edge counts via EntityLink (in either direction)
  const ids = entities.map((e) => e.id);
  const links = ids.length === 0 ? [] : await prisma.entityLink.findMany({
    where: { OR: [{ fromId: { in: ids } }, { toId: { in: ids } }] },
    include: { from: { select: { name: true } }, to: { select: { name: true } } },
    take: 50,
  });

  const edgeCount = new Map<string, number>();
  for (const l of links) {
    edgeCount.set(l.fromId, (edgeCount.get(l.fromId) ?? 0) + 1);
    edgeCount.set(l.toId,   (edgeCount.get(l.toId) ?? 0) + 1);
  }

  return NextResponse.json({
    entities: entities.map((e) => ({
      id: e.id,
      name: e.name,
      kind: e.kind,
      state: e.state,
      registrationNo: e.registrationNo,
      formedAt: e.formedAt,
      registeredAgent: e.registeredAgent,
      opacityScore: e.opacityScore,
      edges: edgeCount.get(e.id) ?? 0,
    })),
    links: links.map((l) => ({
      fromName: l.from.name,
      toName: l.to.name,
      relationship: l.relationship,
      confidence: l.confidence,
      detectedBy: l.detectedBy,
    })),
  });
}
