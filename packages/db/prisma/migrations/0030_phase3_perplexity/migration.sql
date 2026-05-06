-- Phase 3: Perplexity validation pass + cache
-- Adds AssemblyValidator output columns to Alert and a 7-day cache table.

ALTER TABLE IF EXISTS "Alert"
  ADD COLUMN IF NOT EXISTS "supplementaryEvidence" JSONB,
  ADD COLUMN IF NOT EXISTS "publicCoverageFound"   BOOLEAN,
  ADD COLUMN IF NOT EXISTS "validationCostUsd"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "validatedAt"           TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Alert_publicCoverageFound_createdAt_idx"
  ON "Alert" ("publicCoverageFound", "createdAt");

CREATE TABLE IF NOT EXISTS "PerplexityCache" (
  "id"        TEXT NOT NULL,
  "cacheKey"  TEXT NOT NULL,
  "model"     TEXT NOT NULL,
  "response"  JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PerplexityCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PerplexityCache_cacheKey_key" ON "PerplexityCache" ("cacheKey");
CREATE INDEX IF NOT EXISTS "PerplexityCache_expiresAt_idx" ON "PerplexityCache" ("expiresAt");
