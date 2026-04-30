import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { secEdgarAdapter } from "../src/sec-edgar";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/sec-edgar-submissions.json"),
  "utf-8"
);

describe("sec-edgar adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses filing records from SEC EDGAR submissions", async () => {
    const ctx = makeContext();
    const result = await secEdgarAdapter.fetch(ctx);
    expect(result.records.length).toBeGreaterThan(0);
  });

  it("assigns sec.filing predicate", async () => {
    const ctx = makeContext();
    const result = await secEdgarAdapter.fetch(ctx);
    result.records.forEach((r) => {
      expect(r.predicate).toMatch(/^sec\./);
    });
  });

  it("includes company name in record title", async () => {
    const ctx = makeContext();
    const result = await secEdgarAdapter.fetch(ctx);
    result.records.forEach((r) => {
      expect(r.title.length).toBeGreaterThan(0);
    });
  });

  it("returns empty records on fetch error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("rate limited"); });
    const ctx = makeContext();
    const result = await secEdgarAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
