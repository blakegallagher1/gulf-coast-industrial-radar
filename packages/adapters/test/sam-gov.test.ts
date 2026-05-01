import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { mockFetchOnce } from "./helpers/mockFetch";
import { fakeContext } from "./helpers/adapterContext";
import { samGovAdapter } from "../src/sam-gov";

describe("sam-gov adapter", () => {
  beforeEach(() => {
    process.env.SAM_GOV_API_KEY = "test-key-0000";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SAM_GOV_API_KEY;
  });

  it("parses opportunitiesData into PROCUREMENT signals", async () => {
    mockFetchOnce("sam-gov-opportunities.json", "application/json");
    const result = await samGovAdapter.run(fakeContext("sam-gov"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("PROCUREMENT");
    expect(r.predicate).toMatch(/^procurement\.federal\./);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("maps Solicitation type to procurement.federal.solicitation", async () => {
    mockFetchOnce("sam-gov-opportunities.json", "application/json");
    const result = await samGovAdapter.run(fakeContext("sam-gov"));
    const solicit = result.records.find((r) =>
      r.payload.type === "Solicitation",
    );
    expect(solicit!.predicate).toBe("procurement.federal.solicitation");
  });

  it("maps Award Notice type to procurement.federal.award", async () => {
    mockFetchOnce("sam-gov-opportunities.json", "application/json");
    const result = await samGovAdapter.run(fakeContext("sam-gov"));
    const award = result.records.find((r) =>
      (r.payload.type as string).toLowerCase().includes("award"),
    );
    expect(award!.predicate).toBe("procurement.federal.award");
  });

  it("externalId is noticeId", async () => {
    mockFetchOnce("sam-gov-opportunities.json", "application/json");
    const result = await samGovAdapter.run(fakeContext("sam-gov"));
    expect(result.records[0].externalId).toBe("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");
  });

  it("returns empty records and note when API key missing", async () => {
    delete process.env.SAM_GOV_API_KEY;
    const result = await samGovAdapter.run(fakeContext("sam-gov"));
    expect(result.records.length).toBe(0);
    expect(result.notes).toMatch(/SAM_GOV_API_KEY not set/);
  });

  it("has slug sam-gov and implemented:true", () => {
    expect(samGovAdapter.slug).toBe("sam-gov");
    expect(samGovAdapter.implemented).toBe(true);
    expect(samGovAdapter.family).toBe("PROCUREMENT");
  });
});
