/**
 * AssemblyValidator unit test — mocks the Perplexity client to verify
 * the validator wires both steps and aggregates citations + cost correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── mocks ────────────────────────────────────────────────────────────────
//
// We mock both @gcir/db and ./perplexity-client at the module boundary so the
// validator runs without a real DB or API key.

vi.mock("@gcir/db", () => {
  return {
    prisma: {
      entity: {
        findMany: vi.fn(async () => [
          {
            id: "e-1",
            name: "Crescent Industrial Holdings I LLC",
            registeredAgent: "National Registered Agents Inc (Houston)",
            mailingAddress: "Houston, TX",
            formedAt: new Date("2025-09-25"),
            kind: "LLC",
          },
          {
            id: "e-2",
            name: "Crescent Industrial Holdings II LLC",
            registeredAgent: "National Registered Agents Inc (Houston)",
            mailingAddress: "Houston, TX",
            formedAt: new Date("2025-09-26"),
            kind: "LLC",
          },
        ]),
      },
    },
  };
});

vi.mock("../src/perplexity-client", () => {
  const PerplexityDisabledError = class extends Error {};
  return {
    PerplexityDisabledError,
    structured: vi.fn(async ({ schemaName }: { schemaName: string }) => {
      if (schemaName === "GcirPublicCoverageCheck") {
        return {
          data: {
            publicCoverageFound: false,
            summary: "No credible public source explains this assembly yet.",
            confidence: 0.88,
            evidenceQuotes: [],
          },
          citations: [{ url: "https://example.com/news", title: "Local paper" }],
          costUsd: 0.012,
          latencyMs: 320,
          model: "openai/gpt-5.1",
          inputTokens: 800,
          outputTokens: 200,
          cached: false,
        };
      }
      return {
        data: {
          entityName: "Crescent Industrial Holdings I LLC",
          summary: "Recently-formed LLC; agent is a national filing service. No notable disclosures.",
          sisterCompanies: ["Crescent Industrial Holdings II LLC"],
          redFlags: ["Series-LLC pattern"],
        },
        citations: [{ url: "https://sos.la.gov/entity/44009122", title: "LA SOS entity" }],
        costUsd: 0.018,
        latencyMs: 410,
        model: "openai/gpt-5.1",
        inputTokens: 600,
        outputTokens: 250,
        cached: false,
      };
    }),
  };
});

// ─── tests ────────────────────────────────────────────────────────────────

import { validateAssembly } from "../src/assembly-validator";

beforeEach(() => {
  process.env.FEATURE_PERPLEXITY_VALIDATION = "true";
});

describe("validateAssembly", () => {
  it("runs both steps, aggregates cost, returns supplementary evidence", async () => {
    const out = await validateAssembly({
      projectId: "PRJ-test",
      parishCounty: "Ascension",
      state: "LA",
      totalAcres: 1247,
      windowMonths: 6.5,
      buyerEntityIds: ["e-1", "e-2"],
    });

    expect(out.publicCoverageFound).toBe(false);
    expect(out.publicCheck.summary).toMatch(/no credible public source/i);
    expect(out.publicCheck.citations.length).toBeGreaterThan(0);
    expect(out.entityResearch.length).toBe(2);
    expect(out.entityResearch[0].sisterCompanies.length).toBeGreaterThan(0);
    expect(out.totalCostUsd).toBeGreaterThan(0);
    expect(out.modelMix).toContain("openai/gpt-5.1");
  });

  it("throws when feature flag is disabled", async () => {
    process.env.FEATURE_PERPLEXITY_VALIDATION = "false";
    await expect(
      validateAssembly({
        projectId: "PRJ-test",
        parishCounty: "Ascension",
        state: "LA",
        totalAcres: 1000,
        windowMonths: 4,
        buyerEntityIds: ["e-1"],
      }),
    ).rejects.toThrow();
  });
});
