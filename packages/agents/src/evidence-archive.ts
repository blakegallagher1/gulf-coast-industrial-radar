/**
 * EvidenceArchiveAgent — fetches the full content (PDF, HTML body) for any
 * RawDocument that was indexed by URL only (e.g., USACE PDFs, EDGAR filings).
 *
 * Called by the worker after SourceWatcher when a RawDocument's bytes column
 * holds only a URL pointer or a stub JSON.
 */

import { prisma, type RawDocument } from "@gcir/db";
import { fetchWithRetry, storeEvidence } from "@gcir/adapters";

export async function deepenEvidence(rawDocumentId: string): Promise<void> {
  const doc = await prisma.rawDocument.findUnique({ where: { id: rawDocumentId } });
  if (!doc) throw new Error(`evidence-archive: missing RawDocument ${rawDocumentId}`);
  if (doc.mimeType.startsWith("application/pdf") || doc.mimeType.startsWith("text/html")) {
    return; // already deepened
  }
  if (!doc.url || !/^https?:/.test(doc.url)) return;

  const res = await fetchWithRetry(doc.url, {
    timeoutMs: 45_000,
    userAgent: process.env.SEC_EDGAR_USER_AGENT ?? "GulfCoastIndustrialRadar/0.1",
  });
  const ct = (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0];
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength === 0) return;

  // Write the deepened evidence as a NEW RawDocument linked back to the seed.
  await storeEvidence({
    sourceId: doc.sourceId,
    sourceRunId: doc.sourceRunId ?? undefined,
    url: doc.url,
    bytes: buf,
    mimeType: ct ?? "application/octet-stream",
    title: doc.title ?? undefined,
    documentDate: doc.documentDate ?? undefined,
    metadata: { ...((doc.metadata as object) ?? {}), deepenedFrom: doc.id },
  });
}

/** Process a small batch of stubs each tick. */
export async function deepenEvidenceBatch(limit = 10): Promise<number> {
  const stubs: RawDocument[] = await prisma.rawDocument.findMany({
    where: { mimeType: { in: ["application/json", "text/plain"] } },
    orderBy: { observedAt: "desc" },
    take: limit,
  });
  let processed = 0;
  for (const s of stubs) {
    try {
      await deepenEvidence(s.id);
      processed++;
    } catch {
      // single failure shouldn't abort the batch; logged via SourceRun in caller
    }
  }
  return processed;
}
