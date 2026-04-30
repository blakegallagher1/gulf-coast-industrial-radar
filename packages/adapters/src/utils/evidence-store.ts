/**
 * Evidence store — persists raw bytes (PDF/HTML/JSON) for every adapter record.
 *
 * Design: write-through to local disk during development; in production,
 * swap to S3 by setting EVIDENCE_S3_BUCKET. The interface is the same
 * either way, so adapters don't need to know which backend is active.
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { AdapterRecord } from "../types";

const LOCAL_DIR = process.env.EVIDENCE_LOCAL_DIR ?? "/tmp/gcir-evidence";
const S3_BUCKET = process.env.EVIDENCE_S3_BUCKET;

export interface EvidenceRef {
  /** Where the raw bytes live (file path or s3:// URI) */
  uri: string;
  /** Byte count */
  size: number;
  /** MIME type */
  mime: string;
  /** SHA-256 hex digest */
  sha256?: string;
}

/**
 * Save a record’s raw bytes to the evidence store.
 * Returns the URI where the bytes were written.
 */
export async function saveEvidence(record: AdapterRecord): Promise<EvidenceRef> {
  const bytes = Buffer.from(record.rawBytes, "utf-8");

  if (S3_BUCKET) {
    return saveToS3(record, bytes);
  } else {
    return saveToLocal(record, bytes);
  }
}

async function saveToLocal(record: AdapterRecord, bytes: Buffer): Promise<EvidenceRef> {
  const dir = join(LOCAL_DIR, record.family.toLowerCase());
  await mkdir(dir, { recursive: true });
  const filename = sanitize(record.externalId) + "." + extFor(record.rawMime);
  const path = join(dir, filename);
  await writeFile(path, bytes);
  return { uri: `file://${path}`, size: bytes.length, mime: record.rawMime };
}

async function saveToS3(record: AdapterRecord, bytes: Buffer): Promise<EvidenceRef> {
  // Lazy-import AWS SDK to keep the package optional in local dev
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({});
  const key = `evidence/${record.family.toLowerCase()}/${sanitize(record.externalId)}.${extFor(record.rawMime)}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET!,
      Key: key,
      Body: bytes,
      ContentType: record.rawMime,
    }),
  );
  return { uri: `s3://${S3_BUCKET}/${key}`, size: bytes.length, mime: record.rawMime };
}

function sanitize(id: string): string {
  return id.replace(/[^a-z0-9._-]/gi, "_").slice(0, 200);
}

function extFor(mime: string): string {
  if (mime.includes("html")) return "html";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("json")) return "json";
  return "bin";
}
