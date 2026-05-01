/**
 * Evidence store — persists raw bytes (PDF/HTML/JSON) and creates a
 * RawDocument row that every Signal/ExtractedClaim can link back to.
 *
 * Two backends:
 *   - local filesystem (dev) — controlled by EVIDENCE_LOCAL_DIR
 *   - object storage (prod) — backed by EVIDENCE_BUCKET (S3-compatible)
 *
 * For now: local always works; S3 is a stub that an adapter swap can fill.
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@gcir/db";

export type StoreEvidenceArgs = {
  sourceId: string;
  sourceRunId?: string;
  url: string;
  bytes: Buffer | Uint8Array | string;
  mimeType: string;
  title?: string;
  excerpt?: string;
  documentDate?: Date;
  metadata?: Record<string, unknown>;
};

export async function storeEvidence(args: StoreEvidenceArgs) {
  const buf = typeof args.bytes === "string" ? Buffer.from(args.bytes, "utf8") : Buffer.from(args.bytes);
  const hash = createHash("sha256").update(buf).digest("hex");

  // Already archived? Return existing row (idempotent).
  const existing = await prisma.rawDocument.findUnique({
    where: { contentHash: hash },
  });
  if (existing) return existing;

  const storageKey = await writeBlob(hash, buf, args.mimeType);

  return prisma.rawDocument.create({
    data: {
      sourceId: args.sourceId,
      sourceRunId: args.sourceRunId,
      url: args.url,
      contentHash: hash,
      storageKey,
      mimeType: args.mimeType,
      bytes: buf.byteLength,
      title: args.title,
      excerpt: args.excerpt?.slice(0, 1024),
      documentDate: args.documentDate,
      metadata: (args.metadata ?? null) as never,
    },
  });
}

async function writeBlob(hash: string, buf: Buffer, mime: string): Promise<string> {
  const bucket = process.env.EVIDENCE_BUCKET;
  if (bucket) {
    // TODO: real S3 client (aws-sdk v3) — left as adapter-swap surface
    return `s3://${bucket}/${hash}${extFromMime(mime)}`;
  }
  const dir = process.env.EVIDENCE_LOCAL_DIR ?? ".evidence-cache";
  const sub = join(dir, hash.slice(0, 2));
  await mkdir(sub, { recursive: true });
  const path = join(sub, hash + extFromMime(mime));
  await writeFile(path, buf);
  return `file://${path}`;
}

function extFromMime(mime: string): string {
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("html")) return ".html";
  if (mime.includes("json")) return ".json";
  if (mime.includes("xml")) return ".xml";
  if (mime.includes("text")) return ".txt";
  return ".bin";
}
