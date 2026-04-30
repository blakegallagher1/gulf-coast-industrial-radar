import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Pull RawDocuments via Signal.rawDocumentId
  const signals = await prisma.signal.findMany({
    where: { projectId: id },
    select: { rawDocumentId: true },
  });
  const docIds = Array.from(new Set(signals.map((s) => s.rawDocumentId).filter(Boolean) as string[]));

  const docs = docIds.length === 0
    ? []
    : await prisma.rawDocument.findMany({
        where: { id: { in: docIds } },
        orderBy: { observedAt: "desc" },
        include: { source: { select: { name: true } } },
        take: 30,
      });

  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      url: d.url,
      title: d.title,
      excerpt: d.excerpt,
      documentDate: d.documentDate,
      observedAt: d.observedAt,
      contentHash: d.contentHash,
      source: d.source ? { name: d.source.name } : null,
    })),
  });
}
