import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      sites: { take: 1 },
      _count: { select: { signals: true, actions: true, milestones: true } },
    },
  });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  // 7-day delta
  const cutoff = new Date(Date.now() - 7 * 86400000);
  const oldMilestone = await prisma.projectMilestone.findFirst({
    where: { projectId: id, occurredAt: { lt: cutoff } },
    orderBy: { occurredAt: "desc" },
  });
  const scoreDelta = oldMilestone ? 0 : null;

  return NextResponse.json({
    id: project.id,
    publicId: project.publicId,
    name: project.name,
    stage: project.stage,
    score: project.score,
    scoreBreakdown: project.scoreBreakdown,
    parishCounty: project.parishCounty,
    state: project.state,
    facilityType: project.facilityType,
    estimatedCapex: project.estimatedCapex,
    estimatedJobs: project.estimatedJobs,
    firstSignalAt: project.firstSignalAt,
    publicAnnouncedAt: project.publicAnnouncedAt,
    signalCount: project._count.signals,
    actionCount: project._count.actions,
    scoreDelta,
    site: project.sites[0] ?? null,
    status: project.status,
  });
}
