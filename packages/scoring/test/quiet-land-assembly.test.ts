import { describe, it, expect } from "vitest";
import { runQladDetector, type QladSignal } from "../src/quiet-land-assembly-detector";

function makeSignal(overrides: Partial<QladSignal> = {}): QladSignal {
  return {
    id: `sig-${Math.random().toString(36).slice(2)}`,
    type: "LAND_CONTROL",
    createdAt: new Date(),
    normalised: {
      grantee: "Venture Global LNG",
      acreage: 120,
      parish: "Plaquemines",
      instrumentType: "servitude",
      considerationUsd: 2_500_000,
    },
    ...overrides,
  };
}

describe("QladDetector", () => {
  it("fires when 3+ signals exceed acreage threshold", async () => {
    const signals = [makeSignal(), makeSignal(), makeSignal()];
    const result = await runQladDetector(signals);
    expect(result.fired).toBe(true);
    expect(result.severity).toBe("high");
  });

  it("does not fire with fewer than 3 signals", async () => {
    const signals = [makeSignal(), makeSignal()];
    const result = await runQladDetector(signals);
    expect(result.fired).toBe(false);
  });

  it("does not fire below total acreage threshold", async () => {
    const signals = [
      makeSignal({ normalised: { grantee: "Co A", acreage: 10, parish: "Plaquemines", instrumentType: "sale", considerationUsd: 100_000 } }),
      makeSignal({ normalised: { grantee: "Co A", acreage: 10, parish: "Plaquemines", instrumentType: "sale", considerationUsd: 100_000 } }),
      makeSignal({ normalised: { grantee: "Co A", acreage: 10, parish: "Plaquemines", instrumentType: "sale", considerationUsd: 100_000 } }),
    ];
    const result = await runQladDetector(signals);
    // Total = 30 acres, below 100-acre threshold
    expect(result.fired).toBe(false);
  });

  it("includes location in result when fired", async () => {
    const signals = [makeSignal(), makeSignal(), makeSignal()];
    const result = await runQladDetector(signals);
    expect(result.location).toContain("Plaquemines");
  });

  it("sets medium severity for 200–499 total acres", async () => {
    const signals = Array.from({ length: 3 }, () =>
      makeSignal({ normalised: { grantee: "Co A", acreage: 80, parish: "St. James", instrumentType: "servitude", considerationUsd: 1_000_000 } }),
    );
    const result = await runQladDetector(signals);
    // 240 total acres => medium
    expect(result.fired).toBe(true);
    expect(result.severity).toBe("medium");
  });
});
