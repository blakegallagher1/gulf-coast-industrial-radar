-- Cover nullable foreign keys flagged by Supabase's performance advisor.
CREATE INDEX IF NOT EXISTS "RawDocument_sourceRunId_idx" ON "RawDocument" ("sourceRunId");
CREATE INDEX IF NOT EXISTS "ExtractedClaim_rawDocumentId_idx" ON "ExtractedClaim" ("rawDocumentId");
CREATE INDEX IF NOT EXISTS "ParcelSnapshot_rawDocumentId_idx" ON "ParcelSnapshot" ("rawDocumentId");
CREATE INDEX IF NOT EXISTS "ParcelInterest_buyerEntityId_idx" ON "ParcelInterest" ("buyerEntityId");
CREATE INDEX IF NOT EXISTS "Signal_entityId_idx" ON "Signal" ("entityId");
CREATE INDEX IF NOT EXISTS "Signal_rawDocumentId_idx" ON "Signal" ("rawDocumentId");
CREATE INDEX IF NOT EXISTS "Signal_sourceId_idx" ON "Signal" ("sourceId");
CREATE INDEX IF NOT EXISTS "Signal_sourceRunId_idx" ON "Signal" ("sourceRunId");
CREATE INDEX IF NOT EXISTS "Alert_watchlistId_idx" ON "Alert" ("watchlistId");
CREATE INDEX IF NOT EXISTS "AnalystReview_reviewerId_idx" ON "AnalystReview" ("reviewerId");
CREATE INDEX IF NOT EXISTS "Watchlist_userId_idx" ON "Watchlist" ("userId");
CREATE INDEX IF NOT EXISTS "WatchlistItem_projectId_idx" ON "WatchlistItem" ("projectId");
CREATE INDEX IF NOT EXISTS "BriefRecipient_userId_idx" ON "BriefRecipient" ("userId");
