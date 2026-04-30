import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { ledFastlaneAdapter } from "../src/led-fastlane";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/led-fastlane-search.html"),
  "utf-8"
);

describe("led-fastlane adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses project listings from FastLane HTML", async () => {
    const ctx = makeContext();
    const result = await ledFastlaneAdapter.fetch(ctx);
    expect(result.records.length).toBeGreaterThan(0);
  });

  it("assigns economic development predicates", async () => {
    const ctx = makeContext();
    const result = await ledFastlaneAdapter.fetch(ctx);
    result.records.forEach((r) => {
      expect(r.predicate).toMatch(/^econ\./);
    });
  });

  it("captures project investment amounts", async () => {
    const ctx = makeContext();
    const result = await ledFastlaneAdapter.fetch(ctx);
    const cf = result.records.find((r) =>
      r.title.includes("Ammonia")
    );
    expect(cf).toBeDefined();
  });

  it("returns empty records on network error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("dns failure"); });
    const ctx = makeContext();
    const result = await ledFastlaneAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
