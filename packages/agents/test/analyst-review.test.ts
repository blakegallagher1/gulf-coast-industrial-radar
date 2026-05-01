/**
 * AnalystReview unit test — verifies suggestMerge() routes through callBackend
 * with the rawModel gpt5_4 (full, not mini) and returns the LLM's verdict.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let lastBackendArgs: Record<string, unknown> | null = null;

const PROJECT_A = {
  publicId: "PRJ-A",
  name: "Aurora Steel Donaldsonville",
  parishCounty: "Ascension",
  stage: "FINANCING_SURFACED",
  score: 94,
  signals: [
    { family: "LAND_CONTROL", predicate: "land.transfer", subjectLabel: "0414-007 · 173.4 ac" },
    { family: "ENTITY_FORMATION", predicate: "entity.formed", subjectLabel: "Crescent Industrial Holdings I LLC" },
  ],
};

const PROJECT_B = {
  publicId: "PRJ-B",
  name: "Quiet Assembly · Ascension",
  parishCounty: "Ascension",
  stage: "SITE_CONTROL",
  score: 60,
  signals: [
    { family: "LAND_CONTROL", predicate: "land.transfer", subjectLabel: "0414-008 · 121.2 ac" },
  ],
};

vi.mock("@gcir/db", () => ({
  AnalystState: {
    CONFIRMED: "CONFIRMED",
    FALSE_POSITIVE: "FALSE_POSITIVE",
    DISMISSED: "DISMISSED",
  },
  prisma: {
    project: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        id === "prj-a" ? PROJECT_A : id === "prj-b" ? PROJECT_B : null,
      ),
    },
    analystReview: {
      create: vi.fn(async () => ({ id: "ar-1" })),
    },
  },
}));

vi.mock("../src/agent-backend", () => ({
  callBackend: vi.fn(async (args: { agent: string; perplexity: unknown }) => {
    lastBackendArgs = args as unknown as Record<string, unknown>;
    return {
      data: {
        shouldMerge: true,
        reason: "Same parish + overlapping Crescent Industrial entity cluster + adjacent parcel ids.",
        confidence: 0.86,
      },
      costUsd: 0.21,
      latencyMs: 2100,
      model: "openai/gpt-5.4",
      backend: "perplexity" as const,
      cached: false,
    };
  }),
}));

import { suggestMerge } from "../src/analyst-review";

beforeEach(() => {
  lastBackendArgs = null;
});

describe("suggestMerge", () => {
  it("uses rawModel gpt5_4 (full, not mini) and returns the LLM verdict", async () => {
    const out = await suggestMerge("prj-a", "prj-b");

    expect(out.shouldMerge).toBe(true);
    expect(out.confidence).toBeGreaterThan(0.8);
    expect(out.reason).toMatch(/crescent/i);

    expect(lastBackendArgs).not.toBeNull();
    expect(lastBackendArgs!.agent).toBe("AnalystReview");
    const routing = lastBackendArgs!.perplexity as { rawModel?: string; preset?: string };
    expect(routing.rawModel).toBe("gpt5_4");
    expect(routing.preset).toBeUndefined();
  });

  it("throws when either project is missing", async () => {
    const { prisma } = await import("@gcir/db");
    vi.mocked(prisma.project.findUnique).mockResolvedValueOnce(PROJECT_A as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValueOnce(null as never);
    await expect(suggestMerge("prj-a", "missing")).rejects.toThrow(/missing project/);
  });
});
