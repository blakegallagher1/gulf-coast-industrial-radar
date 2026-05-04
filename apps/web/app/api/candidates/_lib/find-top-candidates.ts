import { prisma } from "@gcir/db";

const CANDIDATE_STAGE: Record<string, string> = {
  ENVIRONMENTAL_PERMIT: "PERMIT_SURFACED",
  PUBLIC_COMPANY: "FINANCING_SURFACED",
};

export async function findTopPromotableCandidates(limit = 3) {
  const [signals, existingProjects] = await Promise.all([
    prisma.signal.findMany({
      where: {
        family: {
          in: ["ENVIRONMENTAL_PERMIT", "PUBLIC_COMPANY"],
        },
      },
      orderBy: [{ observedAt: "desc" }],
      take: 250,
      select: {
        family: true,
        subjectLabel: true,
        observedAt: true,
        payload: true,
      },
    }),
    prisma.project.findMany({
      where: {
        status: "suspected",
        stage: {
          in: ["PERMIT_SURFACED", "FINANCING_SURFACED"],
        },
      },
      select: {
        name: true,
        stage: true,
      },
    }),
  ]);

  return Array.from(
    signals.reduce((acc, signal) => {
      const payload = (signal.payload ?? {}) as {
        applicant?: string;
        company?: string;
        companyName?: string;
        facilityName?: string;
        form?: string;
        permitNo?: string;
      };
      const label =
        payload.applicant ??
        payload.company ??
        payload.companyName ??
        signal.subjectLabel.split("·")[0]?.trim() ??
        signal.subjectLabel;
      const summary =
        signal.family === "ENVIRONMENTAL_PERMIT"
          ? payload.facilityName
            ? `${payload.facilityName} · permit ${payload.permitNo ?? "pending"}`
            : signal.subjectLabel
          : payload.form
            ? `${payload.form} filing`
            : signal.subjectLabel;
      const key = `${signal.family}:${label}`;
      const existing = acc.get(key);
      if (existing) {
        existing.count += 1;
        if (signal.observedAt > existing.observedAt) {
          existing.observedAt = signal.observedAt;
          existing.summary = summary;
        }
        return acc;
      }
      acc.set(key, {
        family: signal.family,
        label,
        summary,
        count: 1,
        observedAt: signal.observedAt,
      });
      return acc;
    }, new Map<string, { family: string; label: string; summary: string; count: number; observedAt: Date }>()),
  )
    .map(([, candidate]) => candidate)
    .filter(
      (candidate) =>
        !existingProjects.some(
          (project) =>
            project.name === candidate.label &&
            project.stage === (CANDIDATE_STAGE[candidate.family] ?? "WATCH"),
        ),
    )
    .sort((a, b) => b.count - a.count || b.observedAt.getTime() - a.observedAt.getTime())
    .slice(0, limit);
}
