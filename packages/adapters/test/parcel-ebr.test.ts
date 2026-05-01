import { describe, it, expect, afterEach, vi } from "vitest";
import { mockFetchOnce } from "./helpers/mockFetch";
import { fakeContext } from "./helpers/adapterContext";
import { ebrParcelAdapter } from "../src/parcel-ebr";

describe("parcel-ebr adapter (ebr-gis)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses ArcGIS JSON into LAND_CONTROL signals", async () => {
    mockFetchOnce("ebr-parcels.json", "application/json");
    const result = await ebrParcelAdapter.run(fakeContext("ebr-gis"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("LAND_CONTROL");
    expect(r.predicate).toMatch(/^land\./);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("uses ASMT field as parcel identifier (research-confirmed field name)", async () => {
    mockFetchOnce("ebr-parcels.json", "application/json");
    const result = await ebrParcelAdapter.run(fakeContext("ebr-gis"));
    expect(result.records[0].externalId).toMatch(/^ebr:/);
    expect(result.records[0].payload.parcelNumber).toBe("01-0055-0001");
  });

  it("emits land.transfer when SALE_PRICE present", async () => {
    mockFetchOnce("ebr-parcels.json", "application/json");
    const result = await ebrParcelAdapter.run(fakeContext("ebr-gis"));
    const sale = result.records.find((r) => r.payload.salePriceUsd != null);
    expect(sale!.predicate).toBe("land.transfer");
  });

  it("emits land.parcel.update when no SALE_PRICE", async () => {
    mockFetchOnce("ebr-parcels.json", "application/json");
    const result = await ebrParcelAdapter.run(fakeContext("ebr-gis"));
    const update = result.records.find((r) => r.payload.salePriceUsd == null);
    expect(update!.predicate).toBe("land.parcel.update");
  });

  it("has slug ebr-gis and implemented:true", () => {
    expect(ebrParcelAdapter.slug).toBe("ebr-gis");
    expect(ebrParcelAdapter.implemented).toBe(true);
    expect(ebrParcelAdapter.family).toBe("LAND_CONTROL");
  });
});
