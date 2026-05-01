/**
 * Site Fit Score — does this site/parcel cluster look industrially viable
 * independent of the project formation evidence?
 *
 * Inputs: infrastructure proximity, zoning, flood/wetlands constraint,
 * acreage, corridor context.
 *
 * Output: 0..10, the same scale users see in the drawer "Infrastructure score".
 */

import type { InfraAsset } from "@gcir/shared";

export type SiteFitInput = {
  totalAcres: number;
  riverFrontageMi?: number;
  zoning?: string;          // "M-1","M-2","M-3","A-1",...
  floodZone?: string;       // "X","AE","VE",...
  wetlandsAcres?: number;
  nearbyInfra: InfraAsset[];
  /** Penalty if the site is in a coastal-permitting zone with long timelines. */
  coastalPermittingZone?: boolean;
};

const ZONING_FIT: Record<string, number> = {
  "M-3": 1.0,
  "M-2": 0.95,
  "M-1": 0.85,
  IL: 0.85,
  IH: 0.95,
  IG: 0.9,
  "A-1": 0.55,
  "A-2": 0.5,
  PUD: 0.6,
  R: 0.2,
};

const FLOOD_PENALTY: Record<string, number> = {
  X: 0,
  B: 0.05,
  C: 0.05,
  AE: 0.25,
  AO: 0.3,
  VE: 0.55,
};

export function scoreSiteFit(input: SiteFitInput): {
  score: number;
  components: {
    infra: number;
    zoning: number;
    flood: number;
    acreage: number;
    waterway: number;
  };
} {
  const infra = clamp01(
    Math.min(
      1,
      input.nearbyInfra.reduce((s, i) => s + (i.weight ?? 1), 0) / 4,
    ),
  );

  const z = (input.zoning ?? "").toUpperCase();
  const zoning = ZONING_FIT[z] ?? 0.4;

  const fz = (input.floodZone ?? "X").toUpperCase();
  const floodHit = FLOOD_PENALTY[fz] ?? 0.1;
  const wetlandsHit = Math.min(0.4, (input.wetlandsAcres ?? 0) * 0.05);
  const flood = clamp01(1 - floodHit - wetlandsHit);

  const acreage = clamp01(Math.log10(Math.max(1, input.totalAcres)) / 3.5); // 1..3500ac
  const waterway = clamp01((input.riverFrontageMi ?? 0) / 1.5);

  const composite =
    infra * 0.35 +
    zoning * 0.2 +
    flood * 0.2 +
    acreage * 0.15 +
    waterway * 0.1 -
    (input.coastalPermittingZone ? 0.1 : 0);

  return {
    score: Math.round(clamp01(composite) * 100) / 10, // 0..10
    components: { infra, zoning, flood, acreage, waterway },
  };
}

function clamp01(x: number): number {
  return Number.isNaN(x) ? 0 : Math.max(0, Math.min(1, x));
}
