/**
 * Adapter contract — every source adapter implements this interface.
 * The worker iterates all registered adapters on a schedule and calls run().
 */

import type { SignalFamily } from "@gcir/shared";

export type AdapterContext = {
  /** Source row id from the DB. */
  sourceId: string;
  /** SourceRun id created by the worker before calling run(). */
  sourceRunId: string;
  /** Optional resume cursor from the previous run. */
  cursor?: unknown;
  /** Window: only fetch records observed since this date (when supported). */
  since?: Date;
};

export type AdapterRecord = {
  /** Stable id used for deduplication (URL, doc id, parcel id, ...). */
  externalId: string;
  /** Signal family this record will become. */
  family: SignalFamily;
  /** Predicate vocabulary, e.g. "land.transfer", "permit.air.NOI". */
  predicate: string;
  /** Human label for the UI. */
  subjectLabel: string;
  /** When the underlying event happened (filing date, sale date, etc.). */
  documentDate?: Date;
  /** When we observed it (run timestamp). */
  observedAt: Date;
  /** 0..1 extraction confidence. */
  confidence: number;
  /** Original URL of the source record. */
  url: string;
  /** Raw bytes (HTML/PDF/JSON) for evidence archival. */
  rawBytes: Buffer | Uint8Array | string;
  /** Mime type of rawBytes. */
  rawMime: string;
  /** Verbatim excerpt for the evidence drawer. */
  evidenceSnippet?: string;
  /** Structured fields extracted from the record. */
  payload: Record<string, unknown>;
};

export type AdapterResult = {
  records: AdapterRecord[];
  /** Next-page cursor; null/undefined ends the run. */
  nextCursor?: unknown;
  /** Optional per-run telemetry. */
  notes?: string;
};

export interface SourceAdapter {
  slug: string;
  family: SignalFamily;
  /** True if this adapter has a working real implementation; false = stub. */
  implemented: boolean;
  run(ctx: AdapterContext): Promise<AdapterResult>;
}
