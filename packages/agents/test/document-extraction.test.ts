/**
 * DocumentExtraction unit test — mocks callBackend to verify the agent
 * routes through the configured rawModel and persists ExtractedClaim rows.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let lastBackendArgs: Record<string, unknown> | null = null;
let lastCreateManyArgs: Record<string, unknown> | null = null;

vi.mock("@gcir/db", () => ({
  prisma: {
    rawDocument: {
      findUnique: vi.fn(async () => ({
        id: "doc-1",
        url: "https://opportunitylouisiana.gov/itep/abc",
        observedAt: new Date("2026-04-15T12:00:00Z"),
        title: "ITEP application — primary metals",
        excerpt:
          "Applicant: Crescent Industrial Holdings I LLC. Parish: Ascension. NAICS 331110. Proposed capex $4.2B; 412 jobs.",
        metadata: { applicantId: "44009122" },
      })),
    },
    extractedClaim: {
      createMany: vi.fn(async (args: unknown) => {
        lastCreateManyArgs = (args as { data: unknown }).data as Record<string, unknown>;
        return { count: 2 };
      }),
    },
  },
}));

vi.mock("../src/agent-backend", () => ({
  callBackend: vi.fn(async (args: { agent: string; perplexity: unknown }) => {
    lastBackendArgs = args as unknown as Record<string, unknown>;
    return {
      data: {
        claims: [
          {
            predicate: "incentive.itep.eligible",
            subject: "Crescent Industrial Holdings I LLC",
            value: { applicant: "Crescent Industrial Holdings I LLC", parish: "Ascension", capexTier: "$4.2B", jobs: 412, NAICS: "331110" },
            confidence: 0.92,
            reasonCode: null,
            evidenceSpan: "Proposed capex $4.2B; 412 jobs.",
            documentDate: null,
          },
          {
            predicate: "entity.formed",
            subject: "Crescent Industrial Holdings I LLC",
            value: { name: "Crescent Industrial Holdings I LLC", kind: "LLC" },
            confidence: 0.99,
            reasonCode: null,
            evidenceSpan: "Applicant: Crescent Industrial Holdings I LLC.",
            documentDate: null,
          },
        ],
        projectName: "Project Aurora",
        parishCounty: "Ascension",
        state: "LA",
      },
      costUsd: 0.045,
      latencyMs: 1820,
      model: "openai/gpt-5.4-mini",
      backend: "perplexity" as const,
      cached: false,
    };
  }),
}));

import { extractClaims } from "../src/document-extraction";

beforeEach(() => {
  lastBackendArgs = null;
  lastCreateManyArgs = null;
});

describe("extractClaims", () => {
  it("routes through callBackend with rawModel gpt5_4_mini and persists claims", async () => {
    const out = await extractClaims("doc-1");

    expect(out.claims).toBe(2);

    // Routing config must use rawModel (no web search needed for local extraction)
    expect(lastBackendArgs).not.toBeNull();
    expect(lastBackendArgs!.agent).toBe("DocumentExtraction");
    const routing = lastBackendArgs!.perplexity as { rawModel?: string; preset?: string };
    expect(routing.rawModel).toBe("gpt5_4_mini");
    expect(routing.preset).toBeUndefined();

    // Claims persisted with correct shape
    expect(lastCreateManyArgs).not.toBeNull();
    const persisted = lastCreateManyArgs as unknown as Array<{ rawDocumentId: string; predicate: string }>;
    expect(persisted).toHaveLength(2);
    expect(persisted[0].rawDocumentId).toBe("doc-1");
    expect(persisted[0].predicate).toBe("incentive.itep.eligible");
  });

  it("throws when the document is missing", async () => {
    const { prisma } = await import("@gcir/db");
    vi.mocked(prisma.rawDocument.findUnique).mockResolvedValueOnce(null as never);
    await expect(extractClaims("missing-doc")).rejects.toThrow(/missing doc/);
  });
});
