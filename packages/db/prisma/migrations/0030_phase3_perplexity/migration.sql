-- Phase 3: Perplexity validation pass + cache
-- Adds AssemblyValidator output columns to Alert and a 7-day cache table.

ALTER TABLE "Alert"
  ADD COLUMN "supplementaryEvidence" JSONB,
  ADD COLUMN "publicCoverageFound"   BOOLEAN,
  ADD COLUMN "validationCostUsd"     DOUBLE PRECISION,
  ADD COLUMN "validatedAt"           TIMESTAMP(3);

CREATE INDEX "Alert_publicCoverageFound_createdAt_idx"
  ON "Alert" ("publicCoverageFound", "createdAt");

CREATE TABLE "PerplexityCache" (
  "id"        TEXT NOT NULL,
  "cacheKey"  TEXT NOT NULL,
  "model"     TEXT NOT NULL,
  "response"  JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PerplexityCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PerplexityCache_cacheKey_key" ON "PerplexityCache" ("cacheKey");
CREATE INDEX "PerplexityCache_expiresAt_idx" ON "PerplexityCache" ("expiresAt");
