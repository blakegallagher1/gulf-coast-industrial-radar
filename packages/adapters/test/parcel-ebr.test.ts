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

  it("uses ASSESSMENT_NUM field as parcel identifier", async () => {
    mockFetchOnce("ebr-parcels.json", "application/json");
    const result = await ebrParcelAdapter.run(fakeContext("ebr-gis"));
    expect(result.records[0].externalId).toBe("ebr:01-0055-0001");
    expect(result.records[0].payload.parcelNumber).toBe("01-0055-0001");
    expect(result.records[0].payload.propertyNumber).toBe(10055);
  });

  it("emits land.parcel.update records (no sale price field on source layer)", async () => {
    mockFetchOnce("ebr-parcels.json", "application/json");
    const result = await ebrParcelAdapter.run(fakeContext("ebr-gis"));
    const update = result.records.find((r) => r.predicate === "land.parcel.update");
    expect(update!.predicate).toBe("land.parcel.update");
    expect(update!.payload).not.toHaveProperty("salePriceUsd");
    expect(update!.payload).not.toHaveProperty("saleDate");
  });

  it("has slug ebr-gis and implemented:true", () => {
    expect(ebrParcelAdapter.slug).toBe("ebr-gis");
    expect(ebrParcelAdapter.implemented).toBe(true);
    expect(ebrParcelAdapter.family).toBe("LAND_CONTROL");
  });
});
