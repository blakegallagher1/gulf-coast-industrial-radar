/**
 * AssemblyValidator unit test — mocks the Perplexity client to verify
 * the two-step validation flow without real API calls.
 *
 * Covers:
 *   1. Happy path: both steps succeed, DB writes are made.
 *   2. Budget exhausted: assertBudget throws → validateAssembly rejects.
 *   3. Structured parse failure: bad JSON from pplx.structured → rejects.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateAssembly } from "../src/assembly-validator";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@gcir/db", () => ({
  prisma: {
    assembly: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    validationResult: {
      create: vi.fn(),
    },
    agentRun: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { costUsd: 0 } }),
      create: vi.fn(),
    },
    perplexityCache: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../src/perplexity-client", () => ({
  structured: vi.fn(),
  text: vi.fn(),
  deepResearch: vi.fn(),
  PPLX_PRESETS: {
    structured: "gcir-structured-extraction",
    search: "gcir-web-search",
    deepResearch: "gcir-deep-research",
  },
}));

const { prisma } = await import("@gcir/db");
const pplx = await import("../src/perplexity-client");

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const ASSEMBLY_FIXTURE = {
  id: "00000000-0000-0000-0000-000000000001",
  districtName: "Bayou Industrial Corridor",
  totalAcreage: 120.5,
  zoningCodes: ["I-2", "I-3"],
  utilityStatus: "available",
  entitlementStatus: "entitled",
  lastSaleDate: "2024-01-15",
  ownerCount: 3,
};

const VALIDATION_RESULT_FIXTURE = {
  fieldErrors: {},
  confidence: 0.92,
  notes: "All fields match county records.",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateAssembly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.assembly.findUniqueOrThrow as ReturnType<typeof vi.fn>)
      .mockResolvedValue(ASSEMBLY_FIXTURE);
    (prisma.assembly.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.validationResult.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.agentRun.aggregate as ReturnType<typeof vi.fn>)
      .mockResolvedValue({ _sum: { costUsd: 0 } });
    (prisma.agentRun.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.perplexityCache.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.perplexityCache.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("happy path: validates and enriches an assembly", async () => {
    (pplx.structured as ReturnType<typeof vi.fn>)
      .mockResolvedValue(VALIDATION_RESULT_FIXTURE);
    (pplx.text as ReturnType<typeof vi.fn>)
      .mockResolvedValue("Recent permits show warehouse expansion activity.");

    const result = await validateAssembly(ASSEMBLY_FIXTURE.id);

    expect(result.assemblyId).toBe(ASSEMBLY_FIXTURE.id);
    expect(result.validation.confidence).toBe(0.92);
    expect(result.enrichmentNote).toContain("warehouse");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    expect(prisma.validationResult.create).toHaveBeenCalledOnce();
    expect(prisma.assembly.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ASSEMBLY_FIXTURE.id },
        data: expect.objectContaining({ validated: true }),
      }),
    );
  });

  it("rejects when structured() throws (e.g. budget exhausted)", async () => {
    (pplx.structured as ReturnType<typeof vi.fn>)
      .mockRejectedValue(new Error("Perplexity daily budget exhausted"));

    await expect(validateAssembly(ASSEMBLY_FIXTURE.id)).rejects.toThrow(
      "Perplexity daily budget exhausted",
    );

    expect(prisma.validationResult.create).not.toHaveBeenCalled();
    expect(prisma.assembly.update).not.toHaveBeenCalled();
  });

  it("rejects when structured() returns bad JSON shape", async () => {
    (pplx.structured as ReturnType<typeof vi.fn>)
      .mockRejectedValue(new SyntaxError("Unexpected token"));

    await expect(validateAssembly(ASSEMBLY_FIXTURE.id)).rejects.toThrow();
  });
});
