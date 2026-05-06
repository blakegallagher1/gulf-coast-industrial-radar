import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";
import { requireUser } from "../../../_lib/require-user";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actions = await prisma.recommendedAction.findMany({
    where: { projectId: id, status: { in: ["pending", "accepted"] } },
    orderBy: { rank: "asc" },
    take: 12,
  });
  return NextResponse.json({
    actions: actions.map((a) => ({
      id: a.id,
      rank: a.rank,
      kind: a.kind,
      title: a.title,
      rationale: a.rationale,
      confidence: a.confidence,
      reasonCode: a.reasonCode,
      estTimeMin: a.estTimeMin,
    })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const { recommendActions } = await import("@gcir/agents");
  const out = await recommendActions(id);
  return NextResponse.json({ ok: true, ...out });
}
