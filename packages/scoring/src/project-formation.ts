/**
 * Project Formation Score — weighted composite across signal families.
 * Mirrors the scoring weights in knowledge/sources/signal-taxonomy.md.
 *
 * Inputs:
 *   - signals: distinct signal families that fire for the project,
 *              each with a 0..1 confidence
 *   - penalties: contradictory evidence, public-announcement penalty
 */

import { SIGNAL_WEIGHTS, type SignalFamily, scoreBand, type ScoreBand } from "@gcir/shared";

export type SignalContribution = {
  family: SignalFamily;
  /** 0..1, how confident we are that this family fired for THIS project. */
  confidence: number;
  /** Optional sub-weight (default 1.0) for partial firings (e.g., NOI vs. permit grant). */
  saturation?: number;
};

export type FormationInput = {
  signals: SignalContribution[];
  /** Subtract for stale or already-public information. */
  publicAnnouncementPenalty?: number; // 0..1; 1.0 = full subtraction
  /** Subtract when contradictory evidence is observed. */
  contradictoryEvidencePenalty?: number; // 0..1
  /** Bump for cross-corridor entity matches that strengthen the signal. */
  crossCorridorBoost?: number; // 0..15
};

export type FormationResult = {
  score: number;          // 0..100, integer
  band: ScoreBand;
  contributions: Array<{
    family: SignalFamily;
    weight: number;
    confidence: number;
    saturation: number;
    contribution: number;
  }>;
  penaltyApplied: number;
  rawSum: number;
};

export function scoreProjectFormation(input: FormationInput): FormationResult {
  // Aggregate by family — only highest contribution per family counts.
  const byFamily = new Map<SignalFamily, SignalContribution>();
  for (const s of input.signals) {
    const prev = byFamily.get(s.family);
    if (!prev || prev.confidence * (prev.saturation ?? 1) < s.confidence * (s.saturation ?? 1)) {
      byFamily.set(s.family, s);
    }
  }

  const contributions: FormationResult["contributions"] = [];
  let rawSum = 0;

  for (const [family, sig] of byFamily) {
    const w = SIGNAL_WEIGHTS[family] ?? 0;
    const sat = sig.saturation ?? 1;
    const c = clamp01(sig.confidence) * clamp01(sat);
    const contribution = w * c;
    rawSum += contribution;
    contributions.push({
      family,
      weight: w,
      confidence: clamp01(sig.confidence),
      saturation: clamp01(sat),
      contribution,
    });
  }

  // Penalties (additive, applied as % of raw sum).
  const pa = clamp01(input.publicAnnouncementPenalty ?? 0);
  const cp = clamp01(input.contradictoryEvidencePenalty ?? 0);
  const penaltyApplied = rawSum * (pa * 0.6 + cp * 0.4);
  const cross = Math.max(0, Math.min(15, input.crossCorridorBoost ?? 0));

  const composite = Math.max(0, Math.min(100, Math.round(rawSum + cross - penaltyApplied)));

  return {
    score: composite,
    band: scoreBand(composite),
    contributions: contributions.sort((a, b) => b.contribution - a.contribution),
    penaltyApplied,
    rawSum,
  };
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
