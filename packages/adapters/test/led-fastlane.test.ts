import { describe, it, expect, afterEach, vi } from "vitest";
import { mockFetchOnce } from "./helpers/mockFetch";
import { fakeContext } from "./helpers/adapterContext";
import { ledFastLaneAdapter } from "../src/led-fastlane";

describe("led-fastlane adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses IMS table rows into INCENTIVE signals", async () => {
    mockFetchOnce("led-fastlane-search.html", "text/html");
    const result = await ledFastLaneAdapter.run(fakeContext("led-fastlane"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("INCENTIVE");
    expect(r.predicate).toMatch(/^incentive\./);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("marks approved records with incentive.itep.approved predicate", async () => {
    mockFetchOnce("led-fastlane-search.html", "text/html");
    const result = await ledFastLaneAdapter.run(fakeContext("led-fastlane"));
    const approved = result.records.find((r) => r.predicate === "incentive.itep.approved");
    expect(approved).toBeDefined();
    expect(approved!.payload.company).toBe("Calcasieu LNG Expansions LLC");
  });

  it("marks submitted records with incentive.itep.eligible predicate", async () => {
    mockFetchOnce("led-fastlane-search.html", "text/html");
    const result = await ledFastLaneAdapter.run(fakeContext("led-fastlane"));
    const submitted = result.records.filter((r) => r.predicate === "incentive.itep.eligible");
    expect(submitted.length).toBeGreaterThan(0);
  });

  it("marks REDACTED companies with lower confidence", async () => {
    mockFetchOnce("led-fastlane-search.html", "text/html");
    const result = await ledFastLaneAdapter.run(fakeContext("led-fastlane"));
    const redacted = result.records.find((r) => r.payload.company === "REDACTED");
    expect(redacted).toBeDefined();
    expect(redacted!.confidence).toBeLessThan(0.9);
  });

  it("payload includes parish and capexTier", async () => {
    mockFetchOnce("led-fastlane-search.html", "text/html");
    const result = await ledFastLaneAdapter.run(fakeContext("led-fastlane"));
    const aurora = result.records.find((r) =>
      r.subjectLabel.includes("Aurora Steel"),
    );
    expect(aurora).toBeDefined();
    expect(aurora!.payload.parish).toBe("Ascension");
    expect(aurora!.payload.capexTier).toMatch(/\$500M/);
  });

  it("has slug led-fastlane and implemented:true", () => {
    expect(ledFastLaneAdapter.slug).toBe("led-fastlane");
    expect(ledFastLaneAdapter.implemented).toBe(true);
    expect(ledFastLaneAdapter.family).toBe("INCENTIVE");
  });
});
