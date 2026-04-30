/**
 * Site Fit Scoring Engine
 *
 * Scores how well a geographic location fits Gulf Coast industrial development.
 * Pure function — no DB or network calls.
 */

export interface SiteFitInput {
  /** Distance to nearest navigable waterway (km) */
  distanceToWaterwayKm?: number
  /** Distance to nearest Class I railroad (km) */
  distanceToRailKm?: number
  /** Distance to nearest interstate highway (km) */
  distanceToInterstateKm?: number
  /** Distance to nearest HV transmission line (km) */
  distanceToTransmissionKm?: number
  /** Distance to nearest natural gas pipeline (km) */
  distanceToGasPipelineKm?: number
  /** Whether site is in a designated industrial zone */
  inIndustrialZone: boolean
  /** Whether site is in a designated Opportunity Zone */
  inOpportunityZone: boolean
  /** Whether site is in a Foreign Trade Zone */
  inForeignTradeZone: boolean
  /** Whether site has FEMA flood zone designation of AE or higher */
  inFloodZoneAE: boolean
  /** Wetland fraction (0–1) */
  wetlandFraction?: number
}

export interface SiteFitScore {
  score: number // 0–1
  factors: {
    waterAccess: number
    infrastructure: number
    zoning: number
    incentives: number
    constraints: number
  }
}

function proximity(distKm: number | undefined, idealKm: number, maxKm: number): number {
  if (distKm === undefined) return 0.5 // neutral if unknown
  if (distKm <= idealKm) return 1
  if (distKm >= maxKm) return 0
  return 1 - (distKm - idealKm) / (maxKm - idealKm)
}

export function scoreSiteFit(input: SiteFitInput): SiteFitScore {
  // 1. Water access (barge & deep water)
  const waterAccess = proximity(input.distanceToWaterwayKm, 2, 30)

  // 2. Infrastructure (rail, highway, power, gas)
  const rail = proximity(input.distanceToRailKm, 5, 50)
  const highway = proximity(input.distanceToInterstateKm, 5, 40)
  const power = proximity(input.distanceToTransmissionKm, 2, 20)
  const gas = proximity(input.distanceToGasPipelineKm, 2, 25)
  const infrastructure = (rail + highway + power + gas) / 4

  // 3. Zoning
  const zoning = input.inIndustrialZone ? 1 : 0.3

  // 4. Incentive programmes
  const incentives =
    (input.inOpportunityZone ? 0.5 : 0) + (input.inForeignTradeZone ? 0.5 : 0)

  // 5. Constraints (negative factors)
  const floodPenalty = input.inFloodZoneAE ? 0.3 : 0
  const wetlandPenalty = (input.wetlandFraction ?? 0) * 0.5
  const constraints = Math.max(0, 1 - floodPenalty - wetlandPenalty)

  const score =
    waterAccess * 0.25 +
    infrastructure * 0.3 +
    zoning * 0.2 +
    incentives * 0.1 +
    constraints * 0.15

  return {
    score: Math.round(score * 1000) / 1000,
    factors: {
      waterAccess: Math.round(waterAccess * 1000) / 1000,
      infrastructure: Math.round(infrastructure * 1000) / 1000,
      zoning: Math.round(zoning * 1000) / 1000,
      incentives: Math.round(incentives * 1000) / 1000,
      constraints: Math.round(constraints * 1000) / 1000,
    },
  }
}
