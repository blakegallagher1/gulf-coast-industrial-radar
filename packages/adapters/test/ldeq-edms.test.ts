import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { ldeqEdmsAdapter } from "../src/ldeq-edms";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/ldeq-edms-search.json"),
  "utf-8"
);

describe("ldeq-edms adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses permit records from EDMS JSON response", async () => {
    const ctx = makeContext();
    const result = await ldeqEdmsAdapter.fetch(ctx);
    expect(result.records.length).toBe(3);
  });

  it("maps Air ActivityType to permit.air.NOI predicate", async () => {
    const ctx = makeContext();
    const result = await ldeqEdmsAdapter.fetch(ctx);
    const air = result.records.find((r) => r.predicate === "permit.air.NOI");
    expect(air).toBeDefined();
    expect(air?.title).toBe("ExxonMobil Baton Rouge Complex");
  });

  it("maps Water ActivityType to permit.water.NPDES predicate", async () => {
    const ctx = makeContext();
    const result = await ldeqEdmsAdapter.fetch(ctx);
    const water = result.records.find((r) => r.predicate === "permit.water.NPDES");
    expect(water).toBeDefined();
  });

  it("includes full URL from UrlPath", async () => {
    const ctx = makeContext();
    const result = await ldeqEdmsAdapter.fetch(ctx);
    result.records.forEach((r) => {
      expect(r.url).toContain("edms.deq.louisiana.gov");
    });
  });

  it("returns empty records on fetch error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("timeout"); });
    const ctx = makeContext();
    const result = await ldeqEdmsAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
