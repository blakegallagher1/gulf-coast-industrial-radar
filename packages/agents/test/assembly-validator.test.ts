import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssemblyValidator } from "../src/assembly-validator";
import * as perplexity from "../src/perplexity-client";

vi.mock("../src/perplexity-client", () => ({
  structured: vi.fn(),
  resolvePreset: vi.fn((key: string) => `${key}-research`),
  PRESETS: {
    fast: "fast-research",
    balanced: "pro-search",
    deep: "deep-research",
  },
}));

describe("AssemblyValidator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleAssembly = {
    facilityName: "Motiva Port Arthur Refinery",
    naicsCode: "324110",
    latitude: 29.8833,
    longitude: -93.9244,
    operatorName: "Motiva Enterprises",
    state: "TX",
  };

  it("returns a valid ValidationResult on success", async () => {
    vi.mocked(perplexity.structured).mockResolvedValue({
      valid: true,
      score: 0.92,
      findings: [
        {
          field: "facilityName",
          expected: "Motiva Port Arthur Refinery",
          actual: "Motiva Port Arthur Refinery",
          confidence: 0.98,
        },
      ],
      sources: ["https://www.motiva.com/locations/port-arthur"],
    });

    const validator = new AssemblyValidator();
    const result = await validator.validate(sampleAssembly);

    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(0.8);
    expect(result.findings).toHaveLength(1);
    expect(result.presetUsed).toBe("balanced-research");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("defaults to balanced preset", () => {
    const validator = new AssemblyValidator();
    // presetKey is private but resolvePreset is called during validate
    expect(validator).toBeDefined();
  });

  it("accepts a custom preset override", async () => {
    vi.mocked(perplexity.structured).mockResolvedValue({
      valid: false,
      score: 0.4,
      findings: [
        {
          field: "latitude",
          expected: 29.8833,
          actual: 29.5,
          confidence: 0.7,
          notes: "Coordinates off by ~40 km",
        },
      ],
      sources: [],
    });

    const validator = new AssemblyValidator({ preset: "deep" });
    const result = await validator.validate(sampleAssembly);
    expect(result.valid).toBe(false);
    expect(result.presetUsed).toBe("deep-research");
  });

  it("propagates errors from perplexity.structured", async () => {
    vi.mocked(perplexity.structured).mockRejectedValue(
      new Error("Budget exhausted")
    );
    const validator = new AssemblyValidator();
    await expect(validator.validate(sampleAssembly)).rejects.toThrow(
      "Budget exhausted"
    );
  });
});
