/**
 * SourceWatcherAgent — orchestrates an adapter run and persists records.
 *
 * This is the entry point for the worker’s source-watch step:
 *   1. Fetch records from the adapter.
 *   2. Upsert into the DB as RawSignal rows.
 *   3. Return a summary for logging.
 */

import { adapters } from "@gcir/adapters";
import { prisma } from "@gcir/db";
import type { SignalType } from "@gcir/db";

export interface SourceWatchResult {
  slug: string;
  fetched: number;
  upserted: number;
  skipped: number;
  notes?: string;
  error?: string;
}

export async function runSourceWatcher(slug: string): Promise<SourceWatchResult> {
  const adapter = adapters[slug];
  if (!adapter) {
    return { slug, fetched: 0, upserted: 0, skipped: 0, error: `No adapter for slug: ${slug}` };
  }

  // Get previous fetch context
  const source = await prisma.dataSource.findFirst({ where: { slug } });
  const ctx = { since: source?.lastFetchedAt ?? undefined };

  let result;
  try {
    result = await adapter.run(ctx);
  } catch (err) {
    return {
      slug,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let upserted = 0;
  let skipped = 0;

  for (const record of result.records) {
    try {
      const signalType = familyToSignalType(record.family);
      await prisma.rawSignal.upsert({
        where: { externalId: record.externalId },
        create: {
          externalId: record.externalId,
          sourceId: source!.id,
          type: signalType,
          rawJson: record.payload,
          fetchedAt: record.observedAt,
        },
        update: {
          rawJson: record.payload,
          fetchedAt: record.observedAt,
        },
      });
      upserted++;
    } catch {
      skipped++;
    }
  }

  // Update last fetched timestamp
  if (source) {
    await prisma.dataSource.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date() },
    });
  }

  return {
    slug,
    fetched: result.records.length,
    upserted,
    skipped,
    notes: result.notes,
  };
}

function familyToSignalType(family: string): SignalType {
  const map: Record<string, SignalType> = {
    INCENTIVE: "FILING",
    ENVIRONMENTAL_PERMIT: "PERMIT",
    PARCEL_TRANSACTION: "PARCEL",
    UTILITY_POWER: "REGULATORY",
    PROCUREMENT: "PROCUREMENT",
    FINANCING: "BOND",
    ENTITY_FORMATION: "CORPORATE",
    REGULATORY: "REGULATORY",
  };
  return map[family] ?? "FILING";
}
