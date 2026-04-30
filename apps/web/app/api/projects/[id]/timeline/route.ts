import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const signals = await prisma.signal.findMany({
    where: { projectId: id },
    orderBy: { observedAt: "desc" },
    include: { source: { select: { name: true } } },
    take: 50,
  });
  return NextResponse.json({
    signals: signals.map((s) => ({
      id: s.id,
      family: s.family,
      predicate: s.predicate,
      subjectLabel: s.subjectLabel,
      observedAt: s.observedAt,
      documentDate: s.documentDate,
      confidence: s.confidence,
      source: s.source ? { name: s.source.name } : null,
    })),
  });
}
