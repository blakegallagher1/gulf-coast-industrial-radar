-- Phase 3: Perplexity cache table + Alert supplementary evidence

-- PerplexityCache: memoises Perplexity Agent API calls (7-day TTL)
CREATE TABLE IF NOT EXISTS "PerplexityCache" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "cacheKey"   TEXT NOT NULL,
  "model"      TEXT NOT NULL,
  "response"   JSONB NOT NULL,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PerplexityCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PerplexityCache_cacheKey_key" ON "PerplexityCache"("cacheKey");
CREATE INDEX IF NOT EXISTS "PerplexityCache_expiresAt_idx" ON "PerplexityCache"("expiresAt");

-- Alert: add supplementaryEvidence column (JSONB, nullable)
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "supplementaryEvidence" JSONB;
