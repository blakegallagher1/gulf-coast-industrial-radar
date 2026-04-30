import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parcelEbrAdapter } from "../src/parcel-ebr";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/ebr-parcels.json"),
  "utf-8"
);

describe("parcel-ebr adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses parcel features from EBR GeoJSON", async () => {
    const ctx = makeContext({ parish: "East Baton Rouge" });
    const result = await parcelEbrAdapter.fetch(ctx);
    expect(result.records.length).toBe(2);
  });

  it("uses ASMT as primary identifier", async () => {
    const ctx = makeContext({ parish: "East Baton Rouge" });
    const result = await parcelEbrAdapter.fetch(ctx);
    expect(result.records[0].sourceId).toBe("parcel-ebr:1234567890");
  });

  it("assigns parcel.sale when SALE_DATE present", async () => {
    const ctx = makeContext({ parish: "East Baton Rouge" });
    const result = await parcelEbrAdapter.fetch(ctx);
    const sold = result.records.find((r) => r.sourceId.includes("1234567890"));
    expect(sold?.predicate).toBe("parcel.sale");
  });

  it("assigns parcel.rezone when SALE_DATE absent or empty", async () => {
    const ctx = makeContext({ parish: "East Baton Rouge" });
    const result = await parcelEbrAdapter.fetch(ctx);
    const rezone = result.records.find((r) =>
      r.sourceId.includes("9876543210")
    );
    expect(rezone?.predicate).toBe("parcel.rezone");
  });

  it("returns empty records on fetch error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("ECONNREFUSED"); });
    const ctx = makeContext();
    const result = await parcelEbrAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
