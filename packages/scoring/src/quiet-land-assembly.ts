/**
 * Quiet Land Assembly Detector (QLAD)
 *
 * Detects patterns consistent with developers quietly acquiring parcels
 * to assemble a large industrial site. Pure function — no DB or network calls.
 */

export interface QladInput {
  /** Number of parcels transacted in the area */
  parcelTransactionCount: number
  /** Total acreage transacted */
  totalAcreage: number
  /** Days over which transactions occurred */
  transactionWindowDays: number
  /** Number of distinct buyers */
  distinctBuyerCount: number
  /** Number of distinct sellers */
  distinctSellerCount: number
  /** Whether any buyer is a shell / LLC with no online presence */
  hasShellBuyer: boolean
  /** Whether transaction prices are significantly above assessed value */
  pricesAboveAssessed: boolean
  /** Fraction of parcels that are contiguous */
  contiguousFraction?: number
}

export interface QladScore {
  score: number // 0–1
  signals: {
    transactionVelocity: number
    buyerConcentration: number
    parcelScale: number
    shellIndicator: number
    premiumPricing: number
    contiguity: number
  }
  isHighAlert: boolean
}

export function scoreQuietLandAssembly(input: QladInput): QladScore {
  // 1. Transaction velocity: many parcels in a short window
  const pacePerMonth = input.parcelTransactionCount / Math.max(input.transactionWindowDays / 30, 1)
  const transactionVelocity = Math.min(pacePerMonth / 5, 1)

  // 2. Buyer concentration: few buyers, many sellers = coordinated assembly
  const buyerRatio =
    input.distinctSellerCount > 0 ? input.distinctBuyerCount / input.distinctSellerCount : 1
  const buyerConcentration = Math.max(0, 1 - buyerRatio)

  // 3. Parcel scale: 500 acres is a large industrial site
  const parcelScale = Math.min(input.totalAcreage / 500, 1)

  // 4. Shell buyer indicator
  const shellIndicator = input.hasShellBuyer ? 1 : 0

  // 5. Premium pricing
  const premiumPricing = input.pricesAboveAssessed ? 0.8 : 0

  // 6. Contiguity bonus
  const contiguity = input.contiguousFraction ?? 0.5

  const score =
    transactionVelocity * 0.25 +
    buyerConcentration * 0.2 +
    parcelScale * 0.2 +
    shellIndicator * 0.15 +
    premiumPricing * 0.1 +
    contiguity * 0.1

  return {
    score: Math.round(score * 1000) / 1000,
    signals: {
      transactionVelocity: Math.round(transactionVelocity * 1000) / 1000,
      buyerConcentration: Math.round(buyerConcentration * 1000) / 1000,
      parcelScale: Math.round(parcelScale * 1000) / 1000,
      shellIndicator,
      premiumPricing: Math.round(premiumPricing * 1000) / 1000,
      contiguity: Math.round(contiguity * 1000) / 1000,
    },
    isHighAlert: score >= 0.7,
  }
}
