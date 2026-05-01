import { describe, it, expect, afterEach, vi } from "vitest";
import { mockFetchOnce } from "./helpers/mockFetch";
import { fakeContext } from "./helpers/adapterContext";
import { lpscAdapter } from "../src/lpsc";

describe("lpsc adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses docket HTML into UTILITY_POWER signals", async () => {
    mockFetchOnce("lpsc-dockets.html", "text/html");
    const result = await lpscAdapter.run(fakeContext("lpsc"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("UTILITY_POWER");
    expect(r.predicate).toMatch(/^utility\./);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("assigns utility.interconnection for interconnection docket", async () => {
    mockFetchOnce("lpsc-dockets.html", "text/html");
    const result = await lpscAdapter.run(fakeContext("lpsc"));
    const interconnect = result.records.find((r) => r.payload.docketNo === "U-37812");
    expect(interconnect).toBeDefined();
    expect(interconnect!.predicate).toBe("utility.interconnection");
  });

  it("externalId uses lpsc: prefix and docket number", async () => {
    mockFetchOnce("lpsc-dockets.html", "text/html");
    const result = await lpscAdapter.run(fakeContext("lpsc"));
    expect(result.records[0].externalId).toMatch(/^lpsc:/);
  });

  it("parses T- prefixed transport dockets", async () => {
    mockFetchOnce("lpsc-dockets.html", "text/html");
    const result = await lpscAdapter.run(fakeContext("lpsc"));
    const transport = result.records.find((r) => (r.payload.docketNo as string).startsWith("T-"));
    expect(transport).toBeDefined();
  });

  it("has slug lpsc and implemented:true", () => {
    expect(lpscAdapter.slug).toBe("lpsc");
    expect(lpscAdapter.implemented).toBe(true);
    expect(lpscAdapter.family).toBe("UTILITY_POWER");
  });
});
