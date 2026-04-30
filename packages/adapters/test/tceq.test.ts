import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { tceqAdapter } from "../src/tceq";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/tceq-pending.html"),
  "utf-8"
);

describe("tceq adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses NSR permit records from HTML table", async () => {
    const ctx = makeContext();
    const result = await tceqAdapter.fetch(ctx);
    expect(result.records.length).toBeGreaterThan(0);
  });

  it("filters out alphabetical-index rows", async () => {
    const ctx = makeContext();
    const result = await tceqAdapter.fetch(ctx);
    result.records.forEach((r) => {
      // Single-letter rows should not be included
      expect(r.title.length).toBeGreaterThan(2);
    });
  });

  it("assigns permit.air.NSR predicate for NSR feed", async () => {
    const ctx = makeContext();
    const result = await tceqAdapter.fetch(ctx);
    result.records.forEach((r) => {
      expect(r.predicate).toMatch(/^permit\.air\./);
    });
  });

  it("uses permit number as sourceId key", async () => {
    const ctx = makeContext();
    const result = await tceqAdapter.fetch(ctx);
    const psdtx = result.records.find((r) =>
      r.sourceId.includes("PSDTX1798")
    );
    expect(psdtx).toBeDefined();
  });

  it("returns empty records on fetch error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("ENOTFOUND"); });
    const ctx = makeContext();
    const result = await tceqAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
