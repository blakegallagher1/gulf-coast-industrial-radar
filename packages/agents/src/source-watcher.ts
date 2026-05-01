/**
 * SourceWatcherAgent — orchestrates an adapter run and persists the harvested
 * AdapterRecords as RawDocuments + Signal candidates.
 *
 * The intelligence here is small (it's mostly plumbing); the structured agent
 * call asks the model to *prioritize* which records most need extraction.
 */

import { prisma } from "@gcir/db";
import { adapters, storeEvidence, type AdapterRecord } from "@gcir/adapters";

export type SourceWatchInput = {
  sourceSlug: string;
  /** Optional override window. Defaults to 14 days. */
  sinceDays?: number;
};

export type SourceWatchOutput = {
  sourceRunId: string;
  recordsSeen: number;
  recordsNew: number;
  notes?: string;
};

export async function runSourceWatch(input: SourceWatchInput): Promise<SourceWatchOutput> {
  const adapter = adapters[input.sourceSlug];
  if (!adapter) throw new Error(`SourceWatcher: no adapter registered for ${input.sourceSlug}`);

  const source = await prisma.source.findUnique({ where: { slug: input.sourceSlug } });
  if (!source) throw new Error(`SourceWatcher: Source row missing for ${input.sourceSlug} (run db:seed)`);

  const since = new Date();
  since.setDate(since.getDate() - (input.sinceDays ?? 14));

  const run = await prisma.sourceRun.create({
    data: { sourceId: source.id, status: "running" },
  });

  let allRecords: AdapterRecord[] = [];
  let cursor: unknown = source.lastRunAt ? null : undefined;
  let pages = 0;
  let notes: string[] = [];

  try {
    while (pages < 25) {
      const result = await adapter.run({
        sourceId: source.id,
        sourceRunId: run.id,
        cursor,
        since,
      });
      allRecords = allRecords.concat(result.records);
      if (result.notes) notes.push(result.notes);
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
      pages++;
    }
  } catch (err) {
    await prisma.sourceRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        finishedAt: new Date(),
        errorMessage: (err as Error).message,
      },
    });
    await prisma.source.update({
      where: { id: source.id },
      data: { lastError: (err as Error).message, lastRunAt: new Date() },
    });
    throw err;
  }

  // Persist raw documents + signals
  let newCount = 0;
  for (const r of allRecords) {
    const doc = await storeEvidence({
      sourceId: source.id,
      sourceRunId: run.id,
      url: r.url,
      bytes: r.rawBytes,
      mimeType: r.rawMime,
      title: r.subjectLabel,
      excerpt: r.evidenceSnippet,
      documentDate: r.documentDate,
      metadata: r.payload,
    });

    // Idempotent: skip if a Signal already exists for (predicate, observedAt)
    const existing = await prisma.signal.findFirst({
      where: {
        family: r.family,
        predicate: r.predicate,
        observedAt: r.observedAt,
        rawDocumentId: doc.id,
      },
    });
    if (existing) continue;

    await prisma.signal.create({
      data: {
        family: r.family,
        predicate: r.predicate,
        subjectLabel: r.subjectLabel,
        observedAt: r.observedAt,
        documentDate: r.documentDate,
        weight: 0, // assigned by ProjectFormationScoring
        confidence: r.confidence,
        payload: r.payload as never,
        rawDocumentId: doc.id,
        sourceId: source.id,
        sourceRunId: run.id,
      },
    });
    newCount++;
  }

  await prisma.sourceRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      status: "ok",
      recordsSeen: allRecords.length,
      recordsNew: newCount,
    },
  });
  await prisma.source.update({
    where: { id: source.id },
    data: {
      lastRunAt: new Date(),
      lastOkAt: new Date(),
      lastError: null,
      status: allRecords.length === 0 ? "DEGRADED" : "ACTIVE",
    },
  });

  return {
    sourceRunId: run.id,
    recordsSeen: allRecords.length,
    recordsNew: newCount,
    notes: notes.join(" · "),
  };
}
