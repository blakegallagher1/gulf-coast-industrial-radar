CREATE TABLE IF NOT EXISTS "BacktestRun" (
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

CREATE INDEX IF NOT EXISTS "BacktestRun_completedAt_idx" ON "BacktestRun"("completedAt");
CREATE INDEX IF NOT EXISTS "BacktestRun_status_completedAt_idx" ON "BacktestRun"("status", "completedAt");
