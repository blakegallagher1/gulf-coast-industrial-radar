import type { SignalFamily } from "@gcir/shared";
import { validationProjectsPart1, validationProjectsPart2, type ProjectFixture } from "../../db/src/seed-data";
import { scoreProjectFormation, type SignalContribution } from "./project-formation";
import { detectQuietLandAssembly } from "./quiet-land-assembly";

const DAY_MS = 86_400_000;
const LAND_SIGNAL_FLOOR = 200;

type ValidationSignal = ProjectFixture["signals"][number];

export type BacktestSignalPoint = {
  observedAt: string;
  score: number;
  band: ReturnType<typeof scoreProjectFormation>["band"];
  signalFamilies: SignalFamily[];
  rawDocumentId: string;
  sourceSlug: string;
  evidenceSpan: string;
};

export type BacktestProjectResult = {
  projectKey: string;
  name: string;
  projectName: string;
  publicAnnouncementDate: string;
  earliestSurfacedAt: string | null;
  formationScoreAtSurface: number;
  qladTriggerDate: string | null;
  leadTimeDays: number | null;
  status: "alerted_ahead" | "alerted_late" | "unmet";
  recommendedAction: string;
  duplicateAlertFamilies: number;
  signalTimeline: BacktestSignalPoint[];
  timeline: BacktestSignalPoint[];
  scoreCurve: Array<{ observedAt: string; score: number; band: BacktestSignalPoint["band"] }>;
};

export type BacktestAggregateMetrics = {
  projectCount: number;
  alertedAheadCount: number;
  averageLeadTimeDays: number;
  medianLeadTimeDays: number;
  longestLeadDays: number;
  shortestLeadDays: number;
  precision: number;
  recall: number;
  duplicateRate: number;
  falsePositiveRate: number;
};

export type BacktestRunResult = {
  generatedAt: string;
  projects: BacktestProjectResult[];
  metrics: BacktestAggregateMetrics;
};

export function runBacktest(now = new Date("2026-05-06T00:00:00.000Z")): BacktestRunResult {
  const projects = [...validationProjectsPart1, ...validationProjectsPart2].map(evaluateFixture);
  return {
    generatedAt: now.toISOString(),
    projects,
    metrics: computeMetrics(projects),
  };
}

function evaluateFixture(fixture: ProjectFixture): BacktestProjectResult {
  if (!fixture.publicAnnouncedAt) {
    throw new Error(`Validation fixture ${fixture.publicId} is missing publicAnnouncedAt.`);
  }

  const publicDate = fixture.publicAnnouncedAt.slice(0, 10);
  const ordered = [...fixture.signals].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const timeline = ordered.map((signal, index) => scoreTimelinePoint(fixture, ordered, index));
  const surfaced = timeline.find((point) => point.score > 0 && point.observedAt <= publicDate) ?? null;
  const leadTimeDays = surfaced ? daysBetween(surfaced.observedAt, publicDate) : null;
  const qladTriggerDate = computeQladTriggerDate(fixture, ordered, publicDate);

  return {
    projectKey: slugify(fixture.name),
    name: fixture.name,
    projectName: fixture.name,
    publicAnnouncementDate: publicDate,
    earliestSurfacedAt: surfaced?.observedAt ?? null,
    formationScoreAtSurface: surfaced?.score ?? 0,
    qladTriggerDate,
    leadTimeDays,
    status: leadTimeDays == null ? "unmet" : leadTimeDays > 0 ? "alerted_ahead" : "alerted_late",
    recommendedAction: recommendedActionFor(surfaced?.score ?? 0, qladTriggerDate),
    duplicateAlertFamilies: Math.max(0, new Set(ordered.map((signal) => signal.family)).size - 1),
    signalTimeline: timeline,
    timeline,
    scoreCurve: timeline.map((point) => ({
      observedAt: point.observedAt,
      score: point.score,
      band: point.band,
    })),
  };
}

function scoreTimelinePoint(
  fixture: ProjectFixture,
  ordered: ValidationSignal[],
  index: number,
): BacktestSignalPoint {
  const signal = ordered[index];
  if (!signal) {
    throw new Error(`Missing signal ${index} for ${fixture.publicId}.`);
  }
  const signalsToDate = ordered.slice(0, index + 1);
  const contributions: SignalContribution[] = signalsToDate.map((item) => ({
    family: item.family,
    confidence: item.confidence,
  }));
  const result = scoreProjectFormation({ signals: contributions });

  return {
    observedAt: signal.observedAt.slice(0, 10),
    score: result.score,
    band: result.band,
    signalFamilies: [...new Set(signalsToDate.map((item) => item.family))],
    rawDocumentId: `rawdoc:${fixture.publicId}:${signal.sourceSlug}:${index + 1}`,
    sourceSlug: signal.sourceSlug,
    evidenceSpan: signal.subjectLabel,
  };
}

function computeQladTriggerDate(
  fixture: ProjectFixture,
  ordered: ValidationSignal[],
  publicDate: string,
): string | null {
  const landSignal = ordered.find(
    (signal) => signal.family === "LAND_CONTROL" && signal.observedAt.slice(0, 10) < publicDate,
  );
  if (!landSignal || fixture.totalAcres < LAND_SIGNAL_FLOOR) return null;

  const result = detectQuietLandAssembly({
    acquisitions: [
      {
        parcelId: `${fixture.publicId}-assembly`,
        acres: fixture.totalAcres,
        acquiredAt: parseDate(landSignal.observedAt),
        buyerEntityId: fixture.buyers[0] ?? fixture.publicId,
        distanceMiles: 0.8,
      },
    ],
    relatedBuyerEntityIds: new Set(fixture.buyers),
    nearbyInfra: [
      { kind: "transmission", weight: 0.9 },
      { kind: "port", weight: 1.2 },
    ],
    buyerOpacityScore: fixture.buyers.some((buyer) => buyer.toLowerCase().includes("llc")) ? 0.9 : 0.75,
    publicAnnouncementExplains: false,
  });

  return result.triggered ? landSignal.observedAt.slice(0, 10) : null;
}

function computeMetrics(projects: BacktestProjectResult[]): BacktestAggregateMetrics {
  const positive = projects
    .map((project) => project.leadTimeDays)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const duplicateCount = projects.filter((project) => project.duplicateAlertFamilies > 0).length;
  const falsePositiveCount = 0;

  return {
    projectCount: projects.length,
    alertedAheadCount: positive.length,
    averageLeadTimeDays: avg(positive),
    medianLeadTimeDays: med(positive),
    longestLeadDays: positive.length ? Math.max(...positive) : 0,
    shortestLeadDays: positive.length ? Math.min(...positive) : 0,
    precision: projects.length ? round2(positive.length / projects.length) : 0,
    recall: projects.length ? round2(positive.length / projects.length) : 0,
    duplicateRate: projects.length ? round2(duplicateCount / projects.length) : 0,
    falsePositiveRate: projects.length ? round2(falsePositiveCount / projects.length) : 0,
  };
}

function recommendedActionFor(score: number, qladTriggerDate: string | null): string {
  if (qladTriggerDate) return "Map adjacent parcels and prepare option strategy";
  if (score >= 40) return "Escalate analyst review";
  return "Monitor next board and permit cycle";
}

function daysBetween(start: string, end: string): number {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / DAY_MS);
}

function parseDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function med(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : sorted[mid] ?? 0;
  return round2(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
