import { NextResponse } from "next/server";
import { requireUser } from "../../_lib/require-user";
import { findTopPromotableCandidates } from "../_lib/find-top-candidates";
import { promoteCandidate } from "../_lib/promote-candidate";

export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const groupedCandidates = await findTopPromotableCandidates(3);

  const promoted = [];
  for (const candidate of groupedCandidates) {
    try {
      const result = await promoteCandidate({
        family: candidate.family,
        label: candidate.label,
        summary: candidate.summary,
        userId: gate.userId,
      });
      promoted.push({
        family: candidate.family,
        label: candidate.label,
        projectId: result.projectId,
        reused: result.reused,
        matchedSignals: result.matchedSignals,
      });
    } catch {
      // skip individual candidate failures so one bad row does not stop the batch
    }
  }

  return NextResponse.json({
    ok: true,
    promotedCount: promoted.length,
    promoted,
  });
}
