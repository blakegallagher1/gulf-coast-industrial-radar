/**
 * Evidence store — persists raw bytes (PDF/HTML/JSON) and creates a
 * RawDocument row that every Signal/ExtractedClaim can link back to.
 *
 * Two backends:
 *   - local filesystem (dev) — controlled by EVIDENCE_LOCAL_DIR
 *   - object storage (prod) — backed by EVIDENCE_BUCKET (S3-compatible)
 *
 * Local storage is the development fallback. S3-compatible storage is used
 * whenever EVIDENCE_BUCKET is configured.
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Prisma, prisma } from "@gcir/db";

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

  try {
    return await prisma.rawDocument.create({
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
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const raced = await prisma.rawDocument.findUnique({
        where: { contentHash: hash },
      });
      if (raced) return raced;
    }
    throw err;
  }
}

async function writeBlob(hash: string, buf: Buffer, mime: string): Promise<string> {
  const bucket = process.env.EVIDENCE_BUCKET;
  if (bucket) {
    const region = process.env.EVIDENCE_REGION ?? "us-east-1";
    const accessKeyId = process.env.EVIDENCE_ACCESS_KEY;
    const secretAccessKey = process.env.EVIDENCE_SECRET_KEY;
    const endpoint = process.env.EVIDENCE_ENDPOINT?.trim() || undefined;
    const forcePathStyle = process.env.EVIDENCE_FORCE_PATH_STYLE === "true";
    const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

    const client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      ...(credentials ? { credentials } : {}),
    });

    const key = `${hash.slice(0, 2)}/${hash}${extFromMime(mime)}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: mime,
        ContentLength: buf.byteLength,
      }),
    );
    return `s3://${bucket}/${key}`;
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
