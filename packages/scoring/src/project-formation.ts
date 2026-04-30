/**
 * Project Formation Scoring Engine
 *
 * Scores how likely a cluster of signals represents a real industrial project
 * forming on the Gulf Coast. Pure function — no DB or network calls.
 */
import type { SignalType } from '@gcir/shared'

export interface ProjectFormationInput {
  /** Number of signals in the cluster */
  signalCount: number
  /** Unique source types present (e.g. ["PERMIT", "FILING"]) */
  signalTypes: SignalType[]
  /** Estimated total investment in USD */
  estimatedInvestmentUsd?: number
  /** Estimated jobs */
  estimatedJobs?: number
  /** Days since first signal */
  daysSinceFirstSignal: number
  /** Days since most recent signal */
  daysSinceLastSignal: number
  /** Geographic spread of signals (km) */
  geographicSpreadKm?: number
}

export interface ProjectFormationScore {
  score: number // 0–1
  factors: {
    signalDiversity: number
    signalVolume: number
    recency: number
    investmentScale: number
    geographic: number
  }
  confidence: number
}

const HIGH_VALUE_SIGNAL_TYPES: SignalType[] = ['PERMIT', 'FILING', 'REGULATORY', 'PROCUREMENT']

export function scoreProjectFormation(input: ProjectFormationInput): ProjectFormationScore {
  // 1. Signal diversity (0–1): reward presence of multiple types
  const diverseTypes = input.signalTypes.filter((t) => HIGH_VALUE_SIGNAL_TYPES.includes(t))
  const signalDiversity = Math.min(diverseTypes.length / 3, 1)

  // 2. Signal volume (0–1): log scale capped at 20
  const signalVolume = Math.min(Math.log10(input.signalCount + 1) / Math.log10(21), 1)

  // 3. Recency (0–1): penalise stale signals
  const recency = Math.max(0, 1 - input.daysSinceLastSignal / 180)

  // 4. Investment scale (0–1): $100M = 0.5, $1B = 0.8, $5B+ = 1.0
  let investmentScale = 0
  if (input.estimatedInvestmentUsd) {
    const b = input.estimatedInvestmentUsd / 1_000_000_000
    investmentScale = Math.min(b / 5, 1)
  }

  // 5. Geographic coherence (0–1): tighter clusters score higher
  let geographic = 0.5
  if (input.geographicSpreadKm !== undefined) {
    geographic = Math.max(0, 1 - input.geographicSpreadKm / 50)
  }

  const score =
    signalDiversity * 0.3 +
    signalVolume * 0.2 +
    recency * 0.2 +
    investmentScale * 0.2 +
    geographic * 0.1

  const confidence = Math.min((input.signalCount / 5) * 0.8 + 0.2, 1)

  return {
    score: Math.round(score * 1000) / 1000,
    factors: {
      signalDiversity: Math.round(signalDiversity * 1000) / 1000,
      signalVolume: Math.round(signalVolume * 1000) / 1000,
      recency: Math.round(recency * 1000) / 1000,
      investmentScale: Math.round(investmentScale * 1000) / 1000,
      geographic: Math.round(geographic * 1000) / 1000,
    },
    confidence: Math.round(confidence * 1000) / 1000,
  }
}
