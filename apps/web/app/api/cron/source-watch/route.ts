import { NextResponse } from "next/server";
import { runSourceWatch } from "@gcir/agents";
import { prisma } from "@gcir/db";
import { verifyCronAuthorization } from "@/lib/cron-auth";

/**
 * Cron-callable endpoint — invokes the SourceWatcher on the staleness-prioritized
 * batch. Use Vercel Cron or any scheduler with Authorization: Bearer HEALTHCHECK_TOKEN.
 */
export async function POST(req: Request) {
  const authFailure = verifyCronAuthorization(req);
  if (authFailure) return authFailure;

  const sources = await prisma.source.findMany({
    where: { status: { in: ["ACTIVE", "DEGRADED"] } },
    orderBy: { lastRunAt: { sort: "asc", nulls: "first" } },
    take: 4,
  });

  const results = [] as Array<{ slug: string; ok: boolean; recordsNew?: number; error?: string }>;
  for (const s of sources) {
    try {
      const out = await runSourceWatch({ sourceSlug: s.slug });
      results.push({ slug: s.slug, ok: true, recordsNew: out.recordsNew });
    } catch (err) {
      results.push({ slug: s.slug, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({ runs: results });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST to trigger a tick." });
}
