/**
 * Shared types for backtest project fixtures.
 */

import {
  Prisma,
  ProjectStage,
  Confidence,
  SignalFamily,
  ActionKind,
} from "../index";

export type ProjectFixture = {
  publicId: string;
  name: string;
  alias?: string;
  status: "suspected" | "confirmed" | "retired";
  stage: ProjectStage;
  confidence: Confidence;
  score: number;
  estimatedCapex?: string;
  estimatedJobs?: number;
  facilityType: string;
  parishCounty: string;
  state: string;
  corridor: string;
  centerLat: number;
  centerLng: number;
  totalAcres: number;
  buyers: string[];
  firstSignalAt: string;
  publicAnnouncedAt?: string;
  signals: Array<{
    family: SignalFamily;
    predicate: string;
    subjectLabel: string;
    observedAt: string;
    weight: number;
    confidence: number;
    sourceSlug: string;
    payload?: Prisma.JsonValue;
  }>;
  recommendedActions?: Array<{
    kind: ActionKind;
    title: string;
    rationale: string;
    confidence: number;
    rank: number;
  }>;
};
