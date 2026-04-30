import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parcelAscensionAdapter } from "../src/parcel-ascension";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/ascension-parcels.json"),
  "utf-8"
);

describe("parcel-ascension adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses parcel features from ArcGIS JSON", async () => {
    const ctx = makeContext({ parish: "Ascension" });
    const result = await parcelAscensionAdapter.fetch(ctx);
    expect(result.records.length).toBe(2);
  });

  it("assigns parcel.sale when SALE_DATE is present", async () => {
    const ctx = makeContext({ parish: "Ascension" });
    const result = await parcelAscensionAdapter.fetch(ctx);
    const sold = result.records.find((r) =>
      r.sourceId.includes("000-00001")
    );
    expect(sold?.predicate).toBe("parcel.sale");
  });

  it("assigns parcel.rezone when SALE_DATE is absent", async () => {
    const ctx = makeContext({ parish: "Ascension" });
    const result = await parcelAscensionAdapter.fetch(ctx);
    const rezone = result.records.find((r) =>
      r.sourceId.includes("000-00002")
    );
    expect(rezone?.predicate).toBe("parcel.rezone");
  });

  it("returns empty on fetch error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("net::ERR_FAILED"); });
    const ctx = makeContext();
    const result = await parcelAscensionAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
