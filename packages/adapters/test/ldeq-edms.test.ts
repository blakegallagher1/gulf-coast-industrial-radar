import { describe, it, expect, afterEach, vi } from "vitest";
import { mockFetchOnce } from "./helpers/mockFetch";
import { fakeContext } from "./helpers/adapterContext";
import { ldeqEdmsAdapter } from "../src/ldeq-edms";

describe("ldeq-edms adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns empty records while EDMS anonymous search is auth-gated", async () => {
    mockFetchOnce("ldeq-edms-search.json", "application/json");
    const result = await ldeqEdmsAdapter.run(fakeContext("ldeq-edms"));
    expect(result.records.length).toBe(0);
    expect(result.notes).toBeDefined();
  });

  it("keeps the ENVIRONMENTAL_PERMIT family metadata", async () => {
    expect(ldeqEdmsAdapter.family).toBe("ENVIRONMENTAL_PERMIT");
  });

  it("notes mention EDMS status for operators", async () => {
    mockFetchOnce("ldeq-edms-search.json", "application/json");
    const result = await ldeqEdmsAdapter.run(fakeContext("ldeq-edms"));
    expect(result.notes).toMatch(/EDMS/i);
  });

  it("has slug ldeq-edms and implemented:false", () => {
    expect(ldeqEdmsAdapter.slug).toBe("ldeq-edms");
    expect(ldeqEdmsAdapter.implemented).toBe(false);
    expect(ldeqEdmsAdapter.family).toBe("ENVIRONMENTAL_PERMIT");
  });
});
