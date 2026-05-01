import { describe, it, expect, afterEach, vi } from "vitest";
import { mockFetchOnce } from "./helpers/mockFetch";
import { fakeContext } from "./helpers/adapterContext";
import { calcasieuParcelAdapter } from "../src/parcel-calcasieu";

describe("parcel-calcasieu adapter (calcasieu-assessor)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses ArcGIS JSON into LAND_CONTROL signals", async () => {
    mockFetchOnce("calcasieu-parcels.json", "application/json");
    const result = await calcasieuParcelAdapter.run(fakeContext("calcasieu-assessor"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("LAND_CONTROL");
    expect(r.predicate).toMatch(/^land\./);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("uses PARCEL_ID field (note: field name unconfirmed per research artifact)", async () => {
    mockFetchOnce("calcasieu-parcels.json", "application/json");
    const result = await calcasieuParcelAdapter.run(fakeContext("calcasieu-assessor"));
    expect(result.records[0].externalId).toMatch(/^calcasieu:/);
    expect(result.records[0].payload.parcelNumber).toBe("C-0041-0012-0003");
  });

  it("emits land.transfer when SALE_PRICE present", async () => {
    mockFetchOnce("calcasieu-parcels.json", "application/json");
    const result = await calcasieuParcelAdapter.run(fakeContext("calcasieu-assessor"));
    const sale = result.records.find((r) => r.payload.salePriceUsd != null);
    expect(sale!.predicate).toBe("land.transfer");
  });

  it("emits land.parcel.update when no SALE_PRICE", async () => {
    mockFetchOnce("calcasieu-parcels.json", "application/json");
    const result = await calcasieuParcelAdapter.run(fakeContext("calcasieu-assessor"));
    const update = result.records.find((r) => r.payload.salePriceUsd == null);
    expect(update!.predicate).toBe("land.parcel.update");
  });

  it("has slug calcasieu-assessor and implemented:true", () => {
    expect(calcasieuParcelAdapter.slug).toBe("calcasieu-assessor");
    expect(calcasieuParcelAdapter.implemented).toBe(true);
    expect(calcasieuParcelAdapter.family).toBe("LAND_CONTROL");
  });
});
