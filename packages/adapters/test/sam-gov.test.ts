import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { samGovAdapter } from "../src/sam-gov";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/sam-gov-opportunities.json"),
  "utf-8"
);

describe("sam-gov adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE, { status: 200 }));
  });

  it("parses opportunity records from SAM.gov response", async () => {
    const ctx = makeContext();
    const result = await samGovAdapter.fetch(ctx);
    expect(result.records.length).toBe(2);
  });

  it("assigns contract.opportunity predicate for solicitations", async () => {
    const ctx = makeContext();
    const result = await samGovAdapter.fetch(ctx);
    const sol = result.records.find((r) =>
      r.sourceId.includes("NOTICE-2024-001")
    );
    expect(sol?.predicate).toBe("contract.opportunity");
  });

  it("assigns contract.award predicate for award notices", async () => {
    const ctx = makeContext();
    const result = await samGovAdapter.fetch(ctx);
    const award = result.records.find((r) =>
      r.sourceId.includes("NOTICE-2024-002")
    );
    expect(award?.predicate).toBe("contract.award");
  });

  it("includes state and city in location", async () => {
    const ctx = makeContext();
    const result = await samGovAdapter.fetch(ctx);
    const la = result.records.find((r) =>
      r.location?.state === "LA"
    );
    expect(la?.location?.city).toBe("Lake Charles");
  });

  it("returns empty records on fetch error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("503"); });
    const ctx = makeContext();
    const result = await samGovAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
