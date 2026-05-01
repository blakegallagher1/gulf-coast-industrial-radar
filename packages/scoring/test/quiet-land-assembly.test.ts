/**
 * QLAD detector — deterministic component scoring tests.
 * Anchored on the Aurora Steel Donaldsonville fixture from seed.ts.
 */
import { describe, it, expect } from "vitest";
import { detectQuietLandAssembly } from "../src/quiet-land-assembly";

const D = (s: string) => new Date(s);

describe("detectQuietLandAssembly", () => {
  it("triggers on the Aurora Steel Donaldsonville fixture", () => {
    const result = detectQuietLandAssembly({
      acquisitions: [
        { parcelId: "0414-007", acres: 173.4, acquiredAt: D("2025-09-14"), buyerEntityId: "cih-1", distanceMiles: 0.0, pricePerAcre: 26800 },
        { parcelId: "0414-008", acres: 121.2, acquiredAt: D("2025-11-19"), buyerEntityId: "cih-2", distanceMiles: 0.2, pricePerAcre: 31200 },
        { parcelId: "0414-009", acres: 211.7, acquiredAt: D("2025-12-11"), buyerEntityId: "cih-2", distanceMiles: 0.4, pricePerAcre: 24400 },
        { parcelId: "0414-010", acres: 199.0, acquiredAt: D("2025-12-11"), buyerEntityId: "cih-3", distanceMiles: 0.5, pricePerAcre: 25600 },
        { parcelId: "0414-011", acres: 201.3, acquiredAt: D("2025-12-11"), buyerEntityId: "cih-3", distanceMiles: 0.6, pricePerAcre: 25100 },
        { parcelId: "0414-013", acres: 142.0, acquiredAt: D("2026-02-18"), buyerEntityId: "cih-4", distanceMiles: 0.7, pricePerAcre: 28400 },
        { parcelId: "0414-014", acres: 198.4, acquiredAt: D("2026-03-04"), buyerEntityId: "cih-5", distanceMiles: 0.8, pricePerAcre: 24400 },
      ],
      relatedBuyerEntityIds: new Set(["cih-1", "cih-2", "cih-3", "cih-4", "cih-5"]),
      nearbyInfra: [
        { kind: "rail", weight: 1.0 },
        { kind: "navigable_water", weight: 1.1 },
        { kind: "transmission", weight: 0.9 },
        { kind: "industrial_cluster", weight: 1.0 },
      ],
      buyerOpacityScore: 0.85,
      publicAnnouncementExplains: false,
      parishMedianPricePerAcre: 12000,
    });

    expect(result.triggered).toBe(true);
    expect(result.totalAcres).toBeGreaterThanOrEqual(1240);
    expect(result.windowMonths).toBeLessThanOrEqual(7);
    expect(result.components.acreage).toBeGreaterThan(0.7);
    expect(result.components.contiguity).toBeGreaterThan(0.5);
    expect(result.components.infrastructure).toBeGreaterThan(0.7);
    expect(result.components.opacity).toBeGreaterThan(0.7);
  });

  it("backs off when public announcement already explains", () => {
    const baseline = {
      acquisitions: [
        { parcelId: "p-1", acres: 800, acquiredAt: D("2024-01-01"), buyerEntityId: "e-1", distanceMiles: 0 },
      ],
      relatedBuyerEntityIds: new Set(["e-1"]),
      nearbyInfra: [
        { kind: "rail" as const, weight: 1.0 },
        { kind: "port" as const, weight: 1.0 },
      ],
      buyerOpacityScore: 0.9,
    };
    const triggered = detectQuietLandAssembly({ ...baseline, publicAnnouncementExplains: false });
    const suppressed = detectQuietLandAssembly({ ...baseline, publicAnnouncementExplains: true });
    expect(triggered.triggered).toBe(true);
    expect(suppressed.triggered).toBe(false);
    expect(suppressed.reasons.some((r) => r.toLowerCase().includes("public announcement"))).toBe(true);
  });

  it("does NOT trigger when acreage is under 200", () => {
    const r = detectQuietLandAssembly({
      acquisitions: [
        { parcelId: "p", acres: 80, acquiredAt: new Date(), buyerEntityId: "e", distanceMiles: 0 },
      ],
      relatedBuyerEntityIds: new Set(["e"]),
      nearbyInfra: [
        { kind: "rail", weight: 1 },
        { kind: "port", weight: 1 },
      ],
      buyerOpacityScore: 0.9,
      publicAnnouncementExplains: false,
    });
    expect(r.triggered).toBe(false);
    expect(r.reasons.some((reason) => reason.includes("200-acre"))).toBe(true);
  });

  it("does NOT trigger when buyer is transparent", () => {
    const r = detectQuietLandAssembly({
      acquisitions: [
        { parcelId: "p", acres: 1000, acquiredAt: new Date(), buyerEntityId: "e", distanceMiles: 0 },
      ],
      relatedBuyerEntityIds: new Set(["e"]),
      nearbyInfra: [
        { kind: "rail", weight: 1 },
        { kind: "port", weight: 1 },
      ],
      buyerOpacityScore: 0.2,
      publicAnnouncementExplains: false,
    });
    expect(r.triggered).toBe(false);
  });
});
