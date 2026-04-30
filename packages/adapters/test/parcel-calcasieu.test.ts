import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parcelCalcasieuAdapter } from "../src/parcel-calcasieu";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/calcasieu-parcels.json"),
  "utf-8"
);

describe("parcel-calcasieu adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses parcel features from ArcGIS JSON", async () => {
    const ctx = makeContext({ parish: "Calcasieu" });
    const result = await parcelCalcasieuAdapter.fetch(ctx);
    expect(result.records.length).toBe(2);
  });

  it("assigns parcel.sale predicate for sold parcels", async () => {
    const ctx = makeContext({ parish: "Calcasieu" });
    const result = await parcelCalcasieuAdapter.fetch(ctx);
    const sold = result.records.find((r) =>
      r.sourceId.includes("CAL-10001")
    );
    expect(sold?.predicate).toBe("parcel.sale");
  });

  it("assigns parcel.rezone predicate for parcels without sale date", async () => {
    const ctx = makeContext({ parish: "Calcasieu" });
    const result = await parcelCalcasieuAdapter.fetch(ctx);
    const rezone = result.records.find((r) =>
      r.sourceId.includes("CAL-10002")
    );
    expect(rezone?.predicate).toBe("parcel.rezone");
  });

  it("includes parish in location", async () => {
    const ctx = makeContext({ parish: "Calcasieu" });
    const result = await parcelCalcasieuAdapter.fetch(ctx);
    result.records.forEach((r) => {
      expect(r.location?.parish).toBe("Calcasieu");
    });
  });

  it("returns empty on fetch error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("connection reset"); });
    const ctx = makeContext();
    const result = await parcelCalcasieuAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
