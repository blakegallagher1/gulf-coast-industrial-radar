import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { laSosAdapter } from "../src/la-sos";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/la-sos-search.html"),
  "utf-8"
);

describe("la-sos adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses business registration records from HTML", async () => {
    const ctx = makeContext();
    const result = await laSosAdapter.fetch(ctx);
    expect(result.records.length).toBeGreaterThan(0);
  });

  it("assigns entity.registration predicate", async () => {
    const ctx = makeContext();
    const result = await laSosAdapter.fetch(ctx);
    result.records.forEach((r) => {
      expect(r.predicate).toMatch(/^entity\./);
    });
  });

  it("includes business name in title", async () => {
    const ctx = makeContext();
    const result = await laSosAdapter.fetch(ctx);
    const gulf = result.records.find((r) =>
      r.title.includes("Gulf Coast Petrochem")
    );
    expect(gulf).toBeDefined();
  });

  it("returns empty array on fetch error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("connection refused"); });
    const ctx = makeContext();
    const result = await laSosAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
