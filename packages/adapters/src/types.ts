/**
 * Adapter contract — every source adapter implements this interface.
 */

export interface AdapterContext {
  /** ISO timestamp of the previous successful fetch, if any */
  since?: Date;
  /** Opaque pagination cursor from the previous run */
  cursor?: unknown;
  /** Abort signal for graceful shutdown */
  signal?: AbortSignal;
}

export interface AdapterRecord {
  /** Stable external identifier (dedup key) */
  externalId: string;
  /** Signal family (maps to SignalType in the DB schema) */
  family: string;
  /** Predicate — dot-separated verb phrase: "permit.air.NOI" */
  predicate: string;
  /** Human-readable label for the subject of this signal */
  subjectLabel: string;
  /** When the underlying document was created / filed */
  documentDate?: Date;
  /** When this record was observed by our crawler */
  observedAt: Date;
  /** Confidence score [0, 1] */
  confidence: number;
  /** Canonical source URL */
  url: string;
  /** Raw bytes (stringified JSON, HTML, PDF text, etc.) */
  rawBytes: string;
  /** MIME type of rawBytes */
  rawMime: string;
  /** Extracted text snippet for quick review */
  evidenceSnippet?: string;
  /** Typed payload — adapter-specific structured data */
  payload: Record<string, unknown>;
}

export interface AdapterResult {
  records: AdapterRecord[];
  /** Next cursor to pass in the following run, or null if no more pages */
  nextCursor: unknown;
  /** Free-text notes for logging */
  notes?: string;
}

export interface SourceAdapter {
  /** Unique slug (matches DataSource.slug in the DB) */
  slug: string;
  /** Signal family produced by this adapter */
  family: string;
  /** Whether this adapter has real fetch logic */
  implemented: boolean;
  run(ctx: AdapterContext): Promise<AdapterResult>;
}
