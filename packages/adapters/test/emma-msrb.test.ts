import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { emmaMsrbAdapter } from "../src/emma-msrb";
import { makeContext } from "./helpers/adapterContext";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures/emma-msrb-feed.xml"),
  "utf-8"
);

describe("emma-msrb adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async (url: string) => {
      return new Response(FIXTURE, { status: 200 });
    });
  });

  it("parses new-issue records from RSS feed", async () => {
    const ctx = makeContext();
    const result = await emmaMsrbAdapter.fetch(ctx);
    expect(result.records.length).toBeGreaterThan(0);
  });

  it("assigns bond.issuance.new predicate to regular bond", async () => {
    const ctx = makeContext();
    const result = await emmaMsrbAdapter.fetch(ctx);
    const newIssue = result.records.find((r) =>
      r.title.includes("Revenue Bond Series")
    );
    expect(newIssue?.predicate).toBe("bond.issuance.new");
  });

  it("assigns bond.issuance.refunding predicate to refunding bond", async () => {
    const ctx = makeContext();
    const result = await emmaMsrbAdapter.fetch(ctx);
    const refunding = result.records.find((r) =>
      r.title.toLowerCase().includes("refunding")
    );
    expect(refunding?.predicate).toBe("bond.issuance.refunding");
  });

  it("returns empty records if feed returns 404", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
    const ctx = makeContext();
    const result = await emmaMsrbAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });

  it("returns empty records if fetch throws", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("network error"); });
    const ctx = makeContext();
    const result = await emmaMsrbAdapter.fetch(ctx);
    expect(result.records).toEqual([]);
  });
});
