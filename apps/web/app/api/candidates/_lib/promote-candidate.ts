import { Confidence, ProjectStage, prisma } from "@gcir/db";
import { recommendActions } from "@gcir/agents";

type PromoteCandidateInput = {
  family: string;
  label: string;
  summary: string;
  userId?: string | null;
};

const FAMILY_STAGE: Record<string, ProjectStage> = {
  ENVIRONMENTAL_PERMIT: ProjectStage.PERMIT_SURFACED,
  PUBLIC_COMPANY: ProjectStage.FINANCING_SURFACED,
};

const FAMILY_SCORE: Record<string, number> = {
  ENVIRONMENTAL_PERMIT: 32,
  PUBLIC_COMPANY: 24,
};

async function ensureCandidateAlert(args: {
  projectId: string;
  family: string;
  label: string;
  summary: string;
  stage: ProjectStage;
  score: number;
  matchedSignals: number;
}) {
  const existingAlert = await prisma.alert.findFirst({
    where: {
      projectId: args.projectId,
      reasonCode: "candidate.promoted",
    },
    select: { id: true },
  });

  if (existingAlert) return;

  await prisma.alert.create({
    data: {
      projectId: args.projectId,
      title: `${args.family === "ENVIRONMENTAL_PERMIT" ? "Emerging Permit Candidate" : "Emerging Company Candidate"} · ${args.label}`,
      body: [
        `Candidate promoted from live ${args.family.toLowerCase()} signals.`,
        args.summary ? `Summary: ${args.summary}` : null,
        `Matched signals: ${args.matchedSignals}`,
        `Stage: ${args.stage.toLowerCase().replace(/_/g, "-")}`,
      ]
        .filter(Boolean)
        .join("\n"),
      reasonCode: "candidate.promoted",
      score: args.score,
      scoreDelta: 0,
      publishedAt: new Date(),
    },
  });
}

export async function promoteCandidate({
  family,
  label,
  summary,
  userId,
}: PromoteCandidateInput): Promise<{
  ok: true;
  projectId: string;
  reused: boolean;
  matchedSignals: number;
}> {
  const stage = FAMILY_STAGE[family] ?? ProjectStage.WATCH;
  const score = FAMILY_SCORE[family] ?? 20;

  const matchedSignals = await prisma.signal.findMany({
    where: {
      family: family as never,
      subjectLabel: {
        contains: label,
        mode: "insensitive",
      },
    },
    orderBy: [{ observedAt: "desc" }],
    take: 200,
    select: {
      id: true,
      observedAt: true,
    },
  });

  const [firstMatchedSignal] = matchedSignals;
  if (!firstMatchedSignal) {
    throw new Error("No matching signals found for candidate.");
  }

  const firstSignalAt = matchedSignals.reduce(
    (min, signal) => (signal.observedAt < min ? signal.observedAt : min),
    firstMatchedSignal.observedAt,
  );

  const existing = await prisma.project.findFirst({
    where: {
      name: label,
      stage,
      status: "suspected",
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await prisma.signal.updateMany({
      where: {
        id: {
          in: matchedSignals.map((signal) => signal.id),
        },
      },
      data: {
        projectId: existing.id,
      },
    });

    await ensureCandidateAlert({
      projectId: existing.id,
      family,
      label,
      summary,
      stage,
      score,
      matchedSignals: matchedSignals.length,
    });

    const existingActionCount = await prisma.recommendedAction.count({
      where: { projectId: existing.id },
    });
    if (existingActionCount === 0) {
      try {
        await recommendActions(existing.id);
      } catch {
        // keep the project even if action generation fails
      }
    }

    return {
      ok: true,
      projectId: existing.id,
      reused: true,
      matchedSignals: matchedSignals.length,
    };
  }

  const publicId = `PRJ-CAND-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  const project = await prisma.project.create({
    data: {
      publicId,
      name: label,
      alias: summary || null,
      status: "suspected",
      stage,
      confidence: Confidence.MEDIUM,
      score,
      scoreUpdatedAt: new Date(),
      firstSignalAt,
      notes: `Promoted from emerging ${family.toLowerCase()} candidate stream.`,
      milestones: {
        create: {
          toStage: stage,
          occurredAt: new Date(),
          rationale: `Promoted from emerging candidate: ${summary || label}`,
          changedBy: userId ?? "dev-bypass",
          evidenceIds: matchedSignals.map((signal) => signal.id),
        },
      },
    },
    select: { id: true },
  });

  await prisma.signal.updateMany({
    where: {
      id: {
        in: matchedSignals.map((signal) => signal.id),
      },
    },
    data: {
      projectId: project.id,
    },
  });

  await ensureCandidateAlert({
    projectId: project.id,
    family,
    label,
    summary,
    stage,
    score,
    matchedSignals: matchedSignals.length,
  });

  try {
    await recommendActions(project.id);
  } catch {
    // keep the project even if action generation fails
  }

  return {
    ok: true,
    projectId: project.id,
    reused: false,
    matchedSignals: matchedSignals.length,
  };
}
