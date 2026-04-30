import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Mock Perplexity client before importing the validator
vi.mock("../src/perplexity-client", () => ({
  structured: vi.fn(),
}));

// Mock prisma
vi.mock("@gcir/db", () => ({
  prisma: {
    alert: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { validateAssembly } from "../src/assembly-validator";
import { structured } from "../src/perplexity-client";

const mockStructured = structured as Mock;

const PUBLIC_CHECK_RESPONSE = {
  data: {
    publicCoverageFound: true,
    confidence: 0.85,
    projectName: "Venture Global Plaquemines Phase 2",
    announcementDate: "2025-03-01",
    estimatedValueUsd: 4_500_000_000,
    summary: "Venture Global announced Phase 2 expansion at Plaquemines LNG.",
  },
  citations: [
    { url: "https://example.com/vg-phase2", title: "Venture Global Phase 2 Announced" },
  ],
  costUsd: 0.0031,
  latencyMs: 820,
  model: "perplexity/sonar-pro",
  cached: false,
};

const ENTITY_RESPONSE = {
  data: {
    entityName: "Venture Global LNG",
    sector: "LNG Export",
    parentCompany: undefined,
    gulfCoastFootprint: true,
    recentActivity: "Completed Phase 1 at Plaquemines; Phase 2 FID expected Q2 2025.",
    confidence: 0.92,
  },
  citations: [],
  costUsd: 0.0029,
  latencyMs: 750,
  model: "perplexity/sonar-pro",
  cached: false,
};

describe("validateAssembly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns supplementaryEvidence with publicCheck and entities on success", async () => {
    mockStructured
      .mockResolvedValueOnce(PUBLIC_CHECK_RESPONSE)
      .mockResolvedValueOnce(ENTITY_RESPONSE);

    const result = await validateAssembly({
      alertId: "alert-001",
      clusterSummary: "3 land-control signals in Plaquemines Parish, buyer: Venture Global LNG",
      companyNames: ["Venture Global LNG"],
      location: "Plaquemines Parish, LA",
    });

    expect(result).not.toBeNull();
    expect(result!.publicCheck.publicCoverageFound).toBe(true);
    expect(result!.publicCheck.projectName).toBe("Venture Global Plaquemines Phase 2");
    expect(result!.entities).toHaveLength(1);
    expect(result!.entities[0].gulfCoastFootprint).toBe(true);
    expect(result!.publicCitations).toHaveLength(1);
    expect(result!.totalCostUsd).toBeCloseTo(0.006, 3);
  });

  it("returns null when Perplexity is disabled", async () => {
    const err = new Error("disabled");
    err.name = "PerplexityDisabledError";
    mockStructured.mockRejectedValueOnce(err);

    const result = await validateAssembly({
      alertId: "alert-002",
      clusterSummary: "test",
      companyNames: [],
      location: "St. James Parish, LA",
    });

    expect(result).toBeNull();
  });

  it("returns null when budget is exceeded", async () => {
    const err = new Error("budget exceeded");
    err.name = "PerplexityBudgetExceededError";
    mockStructured.mockRejectedValueOnce(err);

    const result = await validateAssembly({
      alertId: "alert-003",
      clusterSummary: "test",
      companyNames: ["Acme Corp"],
      location: "Calcasieu Parish, LA",
    });

    expect(result).toBeNull();
  });

  it("caps entity research at 3 companies", async () => {
    mockStructured.mockResolvedValue(PUBLIC_CHECK_RESPONSE);

    await validateAssembly({
      alertId: "alert-004",
      clusterSummary: "large cluster",
      companyNames: ["Co A", "Co B", "Co C", "Co D", "Co E"],
      location: "Ascension Parish, LA",
    });

    // 1 publicCheck + max 3 entity calls = 4 total
    expect(mockStructured).toHaveBeenCalledTimes(4);
  });
});
