/**
 * ProjectFormationScoringAgent — recomputes the composite formation score
 * for a project from its current set of signals. Persists the breakdown
 * to project.scoreBreakdown for the radar UI.
 */

import { prisma, type SignalFamily } from "@gcir/db";
import { scoreProjectFormation } from "@gcir/scoring";
import type { SignalFamily as SharedSignalFamily } from "@gcir/shared";

export async function scoreProjectById(projectId: string): Promise<{
  score: number;
  band: string;
}> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { signals: { orderBy: { observedAt: "desc" }, take: 200 } },
  });
  if (!project) throw new Error(`scoreProjectById: missing ${projectId}`);

  const announcedAt = project.publicAnnouncedAt;
  const publicPenalty = announcedAt ? clamp01((Date.now() - announcedAt.getTime()) / (90 * 24 * 60 * 60 * 1000)) : 0;

  const result = scoreProjectFormation({
    signals: project.signals.map((s) => ({
      family: s.family as unknown as SharedSignalFamily,
      confidence: s.confidence,
      saturation: 1.0,
    })),
    publicAnnouncementPenalty: publicPenalty,
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      score: result.score,
      scoreBreakdown: {
        contributions: result.contributions,
        rawSum: result.rawSum,
        penaltyApplied: result.penaltyApplied,
        band: result.band,
      } as never,
      scoreUpdatedAt: new Date(),
    },
  });

  return { score: result.score, band: result.band };
}

/** Recompute scores for every project — useful after a weight change. */
export async function rescoreAllProjects(): Promise<number> {
  const ids = await prisma.project.findMany({ select: { id: true } });
  let n = 0;
  for (const { id } of ids) {
    try {
      await scoreProjectById(id);
      n++;
    } catch {
      /* keep going */
    }
  }
  return n;
}

function clamp01(x: number): number {
  return Number.isNaN(x) ? 0 : Math.max(0, Math.min(1, x));
}

// Silence unused-type warning when consumers import the alias.
export type { SignalFamily };
