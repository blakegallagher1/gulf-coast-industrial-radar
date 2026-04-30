import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { usaceMvnAdapter } from "../src/usace-mvn";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/usace-mvn-notices.html"),
  "utf-8"
);

describe("usace-mvn adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses public notice records from USACE MVN HTML", async () => {
    const ctx = makeContext();
    const result = await usaceMvnAdapter.fetch(ctx);
    expect(result.records.length).toBe(2);
  });

  it("uses permit number as sourceId", async () => {
    const ctx = makeContext();
    const result = await usaceMvnAdapter.fetch(ctx);
    const notice = result.records.find((r) =>
      r.sourceId.includes("MVN-2024-00123-P")
    );
    expect(notice).toBeDefined();
  });

  it("assigns permit.wetlands.404 predicate", async () => {
    const ctx = makeContext();
    const result = await usaceMvnAdapter.fetch(ctx);
    result.records.forEach((r) => {
      expect(r.predicate).toBe("permit.wetlands.404");
    });
  });

  it("extracts location from Location column", async () => {
    const ctx = makeContext();
    const result = await usaceMvnAdapter.fetch(ctx);
    const iberville = result.records.find((r) =>
      r.location?.raw?.includes("Iberville")
    );
    expect(iberville).toBeDefined();
  });

  it("returns empty records on fetch error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("ETIMEDOUT"); });
    const ctx = makeContext();
    const result = await usaceMvnAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
