-- Enable PostGIS so geometry(MultiPolygon, 4326) columns compile.
-- Baseline schema snapshot for clean shadow-database migration rebuilds.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SignalFamily" AS ENUM ('LAND_CONTROL', 'ENTITY_FORMATION', 'ENVIRONMENTAL_PERMIT', 'INCENTIVE', 'UTILITY_POWER', 'PORT_TERMINAL', 'PUBLIC_COMPANY', 'LOCAL_AGENDA', 'FINANCING', 'PROCUREMENT');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('WATCH', 'SITE_CONTROL', 'ENTITY_FORMED', 'INCENTIVE_SURFACED', 'PERMIT_SURFACED', 'WETLANDS_WATERWAY_SURFACED', 'UTILITY_SURFACED', 'PORT_AGENDA_SURFACED', 'FINANCING_SURFACED', 'PUBLIC_ANNOUNCED', 'FID', 'EPC', 'CONSTRUCTION');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "AnalystState" AS ENUM ('UNREVIEWED', 'VALID', 'FALSE_POSITIVE', 'DUPLICATE', 'MERGED', 'SPLIT', 'WATCH', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "SourceCadence" AS ENUM ('REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'DEGRADED', 'PAUSED', 'TODO', 'RETIRED');

-- CreateEnum
CREATE TYPE "AccessMethod" AS ENUM ('HTTP_API', 'ARCGIS_REST', 'SOCRATA', 'HTML_SCRAPE', 'RSS', 'EMAIL_DIGEST', 'BULK_DOWNLOAD', 'PDF_AGENDA');

-- CreateEnum
CREATE TYPE "ParcelInterestKind" AS ENUM ('FEE_SIMPLE', 'OPTION', 'LEASE', 'MEMORANDUM', 'EASEMENT', 'EXCLUSIVE_NEGOTIATION');

-- CreateEnum
CREATE TYPE "EntityKind" AS ENUM ('COMPANY', 'LLC', 'TRUST', 'PARTNERSHIP', 'SPONSOR', 'REGISTERED_AGENT', 'CLOSING_ATTORNEY', 'CONSULTANT', 'AGENCY', 'PORT', 'UTILITY', 'LENDER', 'RELATED_BUYER', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "EntityRelationship" AS ENUM ('SHARES_REGISTERED_AGENT', 'SHARES_MAILING_ADDRESS', 'SHARES_OFFICER', 'SUBSIDIARY_OF', 'AFFILIATE_OF', 'CLOSED_THROUGH', 'REPRESENTED_BY', 'FUNDED_BY', 'OWNS', 'OPTIONS', 'LEASES', 'REGISTERED_AGENT_FOR', 'ANALYST_LINKED');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('IN_APP', 'EMAIL', 'SLACK', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "ActionKind" AS ENUM ('MAP_ADJACENT_PARCELS', 'IDENTIFY_OWNERS', 'ESTIMATE_ASSEMBLAGE_VALUE', 'CHECK_ZONING', 'CHECK_FLOOD_WETLANDS', 'CALL_BROKER_OWNER', 'MONITOR_NEXT_BOARD', 'PREPARE_OPTION_STRATEGY', 'PURSUE_ENTITLEMENT', 'PASS', 'ESCALATE_ANALYST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "org" TEXT,
    "role" TEXT NOT NULL DEFAULT 'analyst',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "planExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "state" TEXT,
    "family" "SignalFamily" NOT NULL,
    "url" TEXT NOT NULL,
    "cost" TEXT NOT NULL DEFAULT 'free',
    "license" TEXT,
    "termsReview" TEXT,
    "cadence" "SourceCadence" NOT NULL DEFAULT 'DAILY',
    "accessMethod" "AccessMethod" NOT NULL,
    "fields" JSONB,
    "notes" TEXT,
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "lastOkAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "recordsSeen" INTEGER NOT NULL DEFAULT 0,
    "recordsNew" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "cursor" JSONB,

    CONSTRAINT "SourceRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawDocument" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceRunId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentDate" TIMESTAMP(3),
    "url" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "title" TEXT,
    "excerpt" TEXT,
    "metadata" JSONB,

    CONSTRAINT "RawDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedClaim" (
    "id" TEXT NOT NULL,
    "rawDocumentId" TEXT NOT NULL,
    "predicate" TEXT NOT NULL,
    "subject" TEXT,
    "value" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasonCode" TEXT,
    "evidenceSpan" TEXT,
    "documentDate" TIMESTAMP(3),
    "observedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "status" TEXT NOT NULL DEFAULT 'suspected',
    "stage" "ProjectStage" NOT NULL DEFAULT 'WATCH',
    "confidence" "Confidence" NOT NULL DEFAULT 'MEDIUM',
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" JSONB,
    "scoreUpdatedAt" TIMESTAMP(3),
    "estimatedCapex" TEXT,
    "estimatedJobs" INTEGER,
    "facilityType" TEXT,
    "parishCounty" TEXT,
    "state" TEXT,
    "corridor" TEXT,
    "firstSignalAt" TIMESTAMP(3),
    "publicAnnouncedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "geom" geometry(MultiPolygon, 4326),
    "totalAcres" DOUBLE PRECISION,
    "contiguousAcres" DOUBLE PRECISION,
    "riverFrontageMi" DOUBLE PRECISION,
    "zoning" TEXT,
    "floodZone" TEXT,
    "wetlandsAcres" DOUBLE PRECISION,
    "infrastructureScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL,
    "parishCounty" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "parcelNumber" TEXT NOT NULL,
    "acres" DOUBLE PRECISION,
    "zoning" TEXT,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "geom" geometry(MultiPolygon, 4326),
    "ownerSnapshotId" TEXT,
    "legalDescription" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelSnapshot" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "ownerName" TEXT,
    "ownerEntityId" TEXT,
    "saleDate" TIMESTAMP(3),
    "salePriceUsd" DECIMAL(14,2),
    "acres" DOUBLE PRECISION,
    "zoning" TEXT,
    "assessedValueUsd" DECIMAL(14,2),
    "rawDocumentId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ParcelSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelInterest" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "kind" "ParcelInterestKind" NOT NULL DEFAULT 'FEE_SIMPLE',
    "acquiredAt" TIMESTAMP(3),
    "buyerEntityId" TEXT,
    "pricePerAcre" DECIMAL(12,2),
    "totalPriceUsd" DECIMAL(14,2),
    "notes" TEXT,

    CONSTRAINT "ParcelInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "EntityKind" NOT NULL DEFAULT 'LLC',
    "state" TEXT,
    "registrationNo" TEXT,
    "formedAt" TIMESTAMP(3),
    "registeredAgent" TEXT,
    "mailingAddress" TEXT,
    "officers" JSONB,
    "opacityScore" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLink" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relationship" "EntityRelationship" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "evidenceUrls" JSONB,
    "detectedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "entityId" TEXT,
    "family" "SignalFamily" NOT NULL,
    "predicate" TEXT NOT NULL,
    "subjectLabel" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "documentDate" TIMESTAMP(3),
    "weight" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "payload" JSONB NOT NULL,
    "rawDocumentId" TEXT,
    "sourceId" TEXT,
    "sourceRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromStage" "ProjectStage",
    "toStage" "ProjectStage" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "rationale" TEXT,
    "changedBy" TEXT,
    "evidenceIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "reasonCode" TEXT,
    "channel" "AlertChannel" NOT NULL DEFAULT 'IN_APP',
    "score" INTEGER NOT NULL,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "silencedAt" TIMESTAMP(3),
    "watchlistId" TEXT,
    "supplementaryEvidence" JSONB,
    "publicCoverageFound" BOOLEAN,
    "validationCostUsd" DOUBLE PRECISION,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendedAction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ActionKind" NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasonCode" TEXT,
    "estTimeMin" INTEGER,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendedAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalystReview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "reviewerId" TEXT,
    "state" "AnalystState" NOT NULL DEFAULT 'UNREVIEWED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalystReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "filter" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL,
    "issueNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "narrative" TEXT NOT NULL,
    "topMovers" JSONB NOT NULL,
    "recommendedActions" JSONB NOT NULL,
    "sourceHealth" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefRecipient" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "BriefRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'landing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "projectId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "inputHash" TEXT,
    "outputJson" JSONB,
    "costUsd" DOUBLE PRECISION,
    "latencyMs" INTEGER,
    "errorMsg" TEXT,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacktestRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectCount" INTEGER NOT NULL,
    "alertedAheadCount" INTEGER NOT NULL,
    "averageLeadTimeDays" DOUBLE PRECISION NOT NULL,
    "medianLeadTimeDays" DOUBLE PRECISION NOT NULL,
    "longestLeadDays" INTEGER NOT NULL,
    "shortestLeadDays" INTEGER NOT NULL,
    "precision" DOUBLE PRECISION NOT NULL,
    "recall" DOUBLE PRECISION NOT NULL,
    "duplicateRate" DOUBLE PRECISION NOT NULL,
    "falsePositiveRate" DOUBLE PRECISION NOT NULL,
    "resultJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacktestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerplexityCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerplexityCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_slug_key" ON "Source"("slug");

-- CreateIndex
CREATE INDEX "Source_family_status_idx" ON "Source"("family", "status");

-- CreateIndex
CREATE INDEX "Source_state_idx" ON "Source"("state");

-- CreateIndex
CREATE INDEX "SourceRun_sourceId_startedAt_idx" ON "SourceRun"("sourceId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RawDocument_contentHash_key" ON "RawDocument"("contentHash");

-- CreateIndex
CREATE INDEX "RawDocument_sourceId_observedAt_idx" ON "RawDocument"("sourceId", "observedAt");

-- CreateIndex
CREATE INDEX "RawDocument_sourceRunId_idx" ON "RawDocument"("sourceRunId");

-- CreateIndex
CREATE INDEX "ExtractedClaim_predicate_idx" ON "ExtractedClaim"("predicate");

-- CreateIndex
CREATE INDEX "ExtractedClaim_subject_idx" ON "ExtractedClaim"("subject");

-- CreateIndex
CREATE INDEX "ExtractedClaim_rawDocumentId_idx" ON "ExtractedClaim"("rawDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_publicId_key" ON "Project"("publicId");

-- CreateIndex
CREATE INDEX "Project_stage_score_idx" ON "Project"("stage", "score");

-- CreateIndex
CREATE INDEX "Project_state_parishCounty_idx" ON "Project"("state", "parishCounty");

-- CreateIndex
CREATE INDEX "Site_projectId_idx" ON "Site"("projectId");

-- CreateIndex
CREATE INDEX "Parcel_state_parishCounty_idx" ON "Parcel"("state", "parishCounty");

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_state_parishCounty_parcelNumber_key" ON "Parcel"("state", "parishCounty", "parcelNumber");

-- CreateIndex
CREATE INDEX "ParcelSnapshot_parcelId_observedAt_idx" ON "ParcelSnapshot"("parcelId", "observedAt");

-- CreateIndex
CREATE INDEX "ParcelSnapshot_rawDocumentId_idx" ON "ParcelSnapshot"("rawDocumentId");

-- CreateIndex
CREATE INDEX "ParcelInterest_siteId_idx" ON "ParcelInterest"("siteId");

-- CreateIndex
CREATE INDEX "ParcelInterest_parcelId_idx" ON "ParcelInterest"("parcelId");

-- CreateIndex
CREATE INDEX "ParcelInterest_buyerEntityId_idx" ON "ParcelInterest"("buyerEntityId");

-- CreateIndex
CREATE INDEX "Entity_name_idx" ON "Entity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_state_registrationNo_key" ON "Entity"("state", "registrationNo");

-- CreateIndex
CREATE INDEX "EntityLink_toId_idx" ON "EntityLink"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityLink_fromId_toId_relationship_key" ON "EntityLink"("fromId", "toId", "relationship");

-- CreateIndex
CREATE INDEX "Signal_projectId_observedAt_idx" ON "Signal"("projectId", "observedAt");

-- CreateIndex
CREATE INDEX "Signal_family_observedAt_idx" ON "Signal"("family", "observedAt");

-- CreateIndex
CREATE INDEX "Signal_entityId_idx" ON "Signal"("entityId");

-- CreateIndex
CREATE INDEX "Signal_rawDocumentId_idx" ON "Signal"("rawDocumentId");

-- CreateIndex
CREATE INDEX "Signal_sourceId_idx" ON "Signal"("sourceId");

-- CreateIndex
CREATE INDEX "Signal_sourceRunId_idx" ON "Signal"("sourceRunId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_occurredAt_idx" ON "ProjectMilestone"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "Alert_projectId_createdAt_idx" ON "Alert"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_publicCoverageFound_createdAt_idx" ON "Alert"("publicCoverageFound", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_watchlistId_idx" ON "Alert"("watchlistId");

-- CreateIndex
CREATE INDEX "RecommendedAction_projectId_rank_idx" ON "RecommendedAction"("projectId", "rank");

-- CreateIndex
CREATE INDEX "AnalystReview_projectId_state_idx" ON "AnalystReview"("projectId", "state");

-- CreateIndex
CREATE INDEX "AnalystReview_reviewerId_idx" ON "AnalystReview"("reviewerId");

-- CreateIndex
CREATE INDEX "Watchlist_userId_idx" ON "Watchlist"("userId");

-- CreateIndex
CREATE INDEX "WatchlistItem_projectId_idx" ON "WatchlistItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_watchlistId_projectId_key" ON "WatchlistItem"("watchlistId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Brief_issueNumber_key" ON "Brief"("issueNumber");

-- CreateIndex
CREATE INDEX "BriefRecipient_briefId_idx" ON "BriefRecipient"("briefId");

-- CreateIndex
CREATE INDEX "BriefRecipient_userId_idx" ON "BriefRecipient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE INDEX "UsageEvent_eventType_createdAt_idx" ON "UsageEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_surface_createdAt_idx" ON "UsageEvent"("surface", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_targetType_targetId_idx" ON "UsageEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_createdAt_idx" ON "UsageEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentRun_agent_startedAt_idx" ON "AgentRun"("agent", "startedAt");

-- CreateIndex
CREATE INDEX "BacktestRun_completedAt_idx" ON "BacktestRun"("completedAt");

-- CreateIndex
CREATE INDEX "BacktestRun_status_completedAt_idx" ON "BacktestRun"("status", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PerplexityCache_cacheKey_key" ON "PerplexityCache"("cacheKey");

-- CreateIndex
CREATE INDEX "PerplexityCache_expiresAt_idx" ON "PerplexityCache"("expiresAt");

-- AddForeignKey
ALTER TABLE "SourceRun" ADD CONSTRAINT "SourceRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawDocument" ADD CONSTRAINT "RawDocument_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawDocument" ADD CONSTRAINT "RawDocument_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "SourceRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedClaim" ADD CONSTRAINT "ExtractedClaim_rawDocumentId_fkey" FOREIGN KEY ("rawDocumentId") REFERENCES "RawDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelSnapshot" ADD CONSTRAINT "ParcelSnapshot_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelSnapshot" ADD CONSTRAINT "ParcelSnapshot_rawDocumentId_fkey" FOREIGN KEY ("rawDocumentId") REFERENCES "RawDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelInterest" ADD CONSTRAINT "ParcelInterest_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelInterest" ADD CONSTRAINT "ParcelInterest_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelInterest" ADD CONSTRAINT "ParcelInterest_buyerEntityId_fkey" FOREIGN KEY ("buyerEntityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_rawDocumentId_fkey" FOREIGN KEY ("rawDocumentId") REFERENCES "RawDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "SourceRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendedAction" ADD CONSTRAINT "RecommendedAction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystReview" ADD CONSTRAINT "AnalystReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystReview" ADD CONSTRAINT "AnalystReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefRecipient" ADD CONSTRAINT "BriefRecipient_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefRecipient" ADD CONSTRAINT "BriefRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

