import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { lpscAdapter } from "../src/lpsc";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/lpsc-dockets.html"),
  "utf-8"
);

describe("lpsc adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses U-prefix utility dockets", async () => {
    const ctx = makeContext();
    const result = await lpscAdapter.fetch(ctx);
    const utility = result.records.find((r) => r.sourceId.includes("U-34567"));
    expect(utility).toBeDefined();
  });

  it("parses T-prefix transport dockets", async () => {
    const ctx = makeContext();
    const result = await lpscAdapter.fetch(ctx);
    const transport = result.records.find((r) => r.sourceId.includes("T-12345"));
    expect(transport).toBeDefined();
  });

  it("classifies rate filings correctly", async () => {
    const ctx = makeContext();
    const result = await lpscAdapter.fetch(ctx);
    const rate = result.records.find((r) => r.sourceId.includes("U-34567"));
    expect(rate?.predicate).toBe("regulatory.rate.filing");
  });

  it("classifies CPCN certificate applications correctly", async () => {
    const ctx = makeContext();
    const result = await lpscAdapter.fetch(ctx);
    const cert = result.records.find((r) => r.sourceId.includes("U-34568"));
    expect(cert?.predicate).toBe("regulatory.cert.filing");
  });

  it("returns empty records on fetch error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("timeout"); });
    const ctx = makeContext();
    const result = await lpscAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
