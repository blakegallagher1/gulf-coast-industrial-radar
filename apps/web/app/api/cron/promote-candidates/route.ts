import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";
import { findTopPromotableCandidates } from "../../candidates/_lib/find-top-candidates";
import { promoteCandidate } from "../../candidates/_lib/promote-candidate";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = process.env.CRON_SECRET ?? process.env.HEALTHCHECK_TOKEN;
  const expected = token ? `Bearer ${token}` : null;
  if (expected && auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const candidates = await findTopPromotableCandidates(3);
    const promoted = [];

    for (const candidate of candidates) {
      try {
        const result = await promoteCandidate({
          family: candidate.family,
          label: candidate.label,
          summary: candidate.summary,
          userId: null,
        });
        promoted.push({
          family: candidate.family,
          label: candidate.label,
          projectId: result.projectId,
          reused: result.reused,
          matchedSignals: result.matchedSignals,
        });
      } catch {
        // skip individual candidate failures so one bad row does not stop the cron pass
      }
    }

    await prisma.usageEvent.create({
      data: {
        eventType: "candidate_promote_batch",
        surface: "cron",
        targetType: "candidate_queue",
        metadata: {
          promotedCount: promoted.length,
          labels: promoted.map((item) => item.label),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      promotedCount: promoted.length,
      promoted,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST to trigger candidate promotion." });
}
