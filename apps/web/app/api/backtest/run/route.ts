import { prisma } from "@gcir/db";
import type { Prisma } from "@gcir/db";
import { runBacktest } from "@gcir/scoring";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = runBacktest(new Date());
    const row = await prisma.backtestRun.create({
      data: {
        status: "ok",
        generatedAt: new Date(result.generatedAt),
        projectCount: result.metrics.projectCount,
        alertedAheadCount: result.metrics.alertedAheadCount,
        averageLeadTimeDays: result.metrics.averageLeadTimeDays,
        medianLeadTimeDays: result.metrics.medianLeadTimeDays,
        longestLeadDays: result.metrics.longestLeadDays,
        shortestLeadDays: result.metrics.shortestLeadDays,
        precision: result.metrics.precision,
        recall: result.metrics.recall,
        duplicateRate: result.metrics.duplicateRate,
        falsePositiveRate: result.metrics.falsePositiveRate,
        resultJson: result as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        completedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      runId: row.id,
      completedAt: row.completedAt.toISOString(),
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
