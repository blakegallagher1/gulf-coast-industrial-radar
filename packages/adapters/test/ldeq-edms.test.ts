import { describe, it, expect, afterEach, vi } from "vitest";
import { mockFetchOnce } from "./helpers/mockFetch";
import { fakeContext } from "./helpers/adapterContext";
import { ldeqEdmsAdapter } from "../src/ldeq-edms";

describe("ldeq-edms adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses an EDMS search response into ENVIRONMENTAL_PERMIT signals", async () => {
    mockFetchOnce("ldeq-edms-search.json", "application/json");
    const result = await ldeqEdmsAdapter.run(fakeContext("ldeq-edms"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("ENVIRONMENTAL_PERMIT");
    expect(r.predicate).toMatch(/^permit\./);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("maps WQ activity type to permit.water.NPDES predicate", async () => {
    mockFetchOnce("ldeq-edms-search.json", "application/json");
    const result = await ldeqEdmsAdapter.run(fakeContext("ldeq-edms"));
    const wq = result.records.find((r) => r.payload.activityType === "WQ");
    expect(wq).toBeDefined();
    expect(wq!.predicate).toBe("permit.water.NPDES");
  });

  it("maps AQ activity type to permit.air.NOI predicate", async () => {
    mockFetchOnce("ldeq-edms-search.json", "application/json");
    const result = await ldeqEdmsAdapter.run(fakeContext("ldeq-edms"));
    const aq = result.records.find((r) => r.payload.activityType === "AQ");
    expect(aq).toBeDefined();
    expect(aq!.predicate).toBe("permit.air.NOI");
  });

  it("sets externalId from DocumentId and includes parish in payload", async () => {
    mockFetchOnce("ldeq-edms-search.json", "application/json");
    const result = await ldeqEdmsAdapter.run(fakeContext("ldeq-edms"));
    expect(result.records[0].externalId).toBe("8901234");
    expect(result.records[0].payload.parish).toBe("St. James");
  });

  it("returns notes string with page number", async () => {
    mockFetchOnce("ldeq-edms-search.json", "application/json");
    const result = await ldeqEdmsAdapter.run(fakeContext("ldeq-edms"));
    expect(result.notes).toMatch(/EDMS page 1/);
  });

  it("has slug ldeq-edms and implemented:true", () => {
    expect(ldeqEdmsAdapter.slug).toBe("ldeq-edms");
    expect(ldeqEdmsAdapter.implemented).toBe(true);
    expect(ldeqEdmsAdapter.family).toBe("ENVIRONMENTAL_PERMIT");
  });
});
