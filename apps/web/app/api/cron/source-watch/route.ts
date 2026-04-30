import { NextResponse } from "next/server";
import { runSourceWatch } from "@gcir/agents";
import { prisma } from "@gcir/db";

/**
 * Cron-callable endpoint — invokes the SourceWatcher on the staleness-prioritized
 * batch. Use Vercel Cron or any scheduler with Authorization: Bearer HEALTHCHECK_TOKEN.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.HEALTHCHECK_TOKEN}`;
  if (process.env.HEALTHCHECK_TOKEN && auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
