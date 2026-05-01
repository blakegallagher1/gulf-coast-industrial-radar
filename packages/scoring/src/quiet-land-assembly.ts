/**
 * Quiet Land Assembly Detector — the highest-leverage MVP detector.
 * Mirrors knowledge/product/quiet-land-assembly-detector.md.
 *
 * Trigger rule — flag when ALL of:
 *   - same buyer or related buyer entities control 200+ acres
 *   - within a rolling 24-month window
 *   - parcels contiguous OR within 0.5–2 miles of each other
 *   - near 2+ industrial-enabling assets
 *   - buyer is opaque/newly-formed/out-of-state/project-like
 *   - no public announcement already explains the land control
 */

import { QLAD } from "@gcir/shared";
import type { InfraAsset } from "@gcir/shared";

export type Acquisition = {
  parcelId: string;
  acres: number;
  acquiredAt: Date;
  buyerEntityId: string;
  /** Distance to centroid of cluster, miles. */
  distanceMiles: number;
  pricePerAcre?: number;
};

export type AssemblyInput = {
  acquisitions: Acquisition[];
  /** Distinct buyer entity ids that are linked (analyst- or deterministic-confirmed). */
  relatedBuyerEntityIds: Set<string>;
  /** Industrial-enabling assets within ~3 miles of cluster. */
  nearbyInfra: InfraAsset[];
  /** 0..1 — how opaque is the buyer (shell LLC, no business purpose, out-of-state mail). */
  buyerOpacityScore: number;
  /** Has a public announcement already explained this land control? */
  publicAnnouncementExplains: boolean;
  /** parish/county median price per acre, if known — for the price premium check. */
  parishMedianPricePerAcre?: number;
};

export type AssemblyResult = {
  triggered: boolean;
  totalAcres: number;
  windowMonths: number;
  reasons: string[];
  components: {
    acreage: number;       // 0..1
    contiguity: number;    // 0..1
    velocity: number;      // 0..1
    infrastructure: number;// 0..1
    opacity: number;       // 0..1
    pricePremium: number;  // 0..1
  };
};

export function detectQuietLandAssembly(input: AssemblyInput): AssemblyResult {
  const reasons: string[] = [];

  const totalAcres = input.acquisitions.reduce((s, a) => s + a.acres, 0);
  const acreageOk = totalAcres >= QLAD.minAcresControlled;
  if (!acreageOk) {
    reasons.push(
      `acreage ${totalAcres.toFixed(0)} below ${QLAD.minAcresControlled}-acre floor`,
    );
  }

  // Window
  let windowMonths = 0;
  if (input.acquisitions.length > 0) {
    const ts = input.acquisitions.map((a) => a.acquiredAt.getTime());
    windowMonths = (Math.max(...ts) - Math.min(...ts)) / (1000 * 60 * 60 * 24 * 30);
  }
  const windowOk = windowMonths <= QLAD.acquisitionWindowMonths;
  if (!windowOk) {
    reasons.push(
      `window ${windowMonths.toFixed(1)}mo exceeds ${QLAD.acquisitionWindowMonths}-month rolling threshold`,
    );
  }

  // Contiguity
  const maxDist = input.acquisitions.reduce(
    (m, a) => Math.max(m, a.distanceMiles),
    0,
  );
  const contigOk = maxDist <= QLAD.contiguityMaxMiles;
  if (!contigOk) {
    reasons.push(
      `cluster spread ${maxDist.toFixed(2)}mi exceeds ${QLAD.contiguityMaxMiles}mi cap`,
    );
  }

  // Infrastructure proximity
  const distinctInfra = new Set(input.nearbyInfra.map((i) => i.kind));
  const infraOk = distinctInfra.size >= QLAD.minInfraAssets;
  if (!infraOk) {
    reasons.push(
      `only ${distinctInfra.size} industrial-enabling assets nearby (need ${QLAD.minInfraAssets}+)`,
    );
  }

  // Opacity
  const opacityOk = input.buyerOpacityScore >= QLAD.buyerOpacityFloor;
  if (!opacityOk) {
    reasons.push(
      `buyer opacity ${input.buyerOpacityScore.toFixed(2)} below ${QLAD.buyerOpacityFloor} floor`,
    );
  }

  // Public announcement
  if (input.publicAnnouncementExplains) {
    reasons.push("public announcement already explains the land control");
  }

  // Component scores 0..1 (used by formation scoring callers)
  const components = {
    acreage: clamp01(totalAcres / 1500), // 1500ac saturates to 1.0
    contiguity: clamp01(1 - maxDist / QLAD.contiguityMaxMiles),
    velocity: clamp01(1 - windowMonths / QLAD.acquisitionWindowMonths),
    infrastructure: clamp01(distinctInfra.size / 4),
    opacity: clamp01(input.buyerOpacityScore),
    pricePremium: pricePremiumScore(input),
  };

  const triggered =
    acreageOk &&
    windowOk &&
    contigOk &&
    infraOk &&
    opacityOk &&
    !input.publicAnnouncementExplains;

  return { triggered, totalAcres, windowMonths, reasons, components };
}

function pricePremiumScore(input: AssemblyInput): number {
  if (!input.parishMedianPricePerAcre) return 0.5; // unknown → neutral
  const prices = input.acquisitions
    .map((a) => a.pricePerAcre)
    .filter((p): p is number => typeof p === "number");
  if (prices.length === 0) return 0.5;
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const ratio = avg / input.parishMedianPricePerAcre;
  // 1.5x median → 1.0; 1.0x → 0.5; 0.5x → 0.0
  return clamp01((ratio - 0.5) / 1.0);
}

function clamp01(x: number): number {
  return Number.isNaN(x) ? 0 : Math.max(0, Math.min(1, x));
}
