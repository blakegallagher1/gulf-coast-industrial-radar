/**
 * InvestorAction unit test — verifies pro-search preset routing and that
 * recommendActions() replaces pending actions with the agent's output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let lastBackendArgs: Record<string, unknown> | null = null;
let actionDeleteManyCalled = false;
const actionCreates: Array<Record<string, unknown>> = [];

vi.mock("@gcir/db", () => ({
  ActionKind: {
    MAP_ADJACENT_PARCELS: "MAP_ADJACENT_PARCELS",
    PREPARE_OPTION_STRATEGY: "PREPARE_OPTION_STRATEGY",
    CHECK_ZONING: "CHECK_ZONING",
    PASS: "PASS",
  },
  prisma: {
    project: {
      findUnique: vi.fn(async () => ({
        id: "prj-1",
        publicId: "PRJ-2026-08114",
        name: "Aurora Steel Donaldsonville",
        stage: "FINANCING_SURFACED",
        score: 94,
        estimatedCapex: "$4.2B",
        parishCounty: "Ascension",
        state: "LA",
        facilityType: "Primary metals / DRI",
        firstSignalAt: new Date("2025-09-14"),
        publicAnnouncedAt: null,
        signals: [
          {
            family: "LAND_CONTROL",
            predicate: "land.transfer",
            subjectLabel: "0414-007 · 173.4 ac",
            observedAt: new Date("2025-09-14"),
            confidence: 0.99,
          },
        ],
        sites: [],
      })),
    },
    recommendedAction: {
      deleteMany: vi.fn(async () => {
        actionDeleteManyCalled = true;
        return { count: 0 };
      }),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        actionCreates.push(args.data);
        return { id: `action-${actionCreates.length}` };
      }),
    },
  },
}));

vi.mock("../src/agent-backend", () => ({
  callBackend: vi.fn(async (args: { agent: string; perplexity: unknown }) => {
    lastBackendArgs = args as unknown as Record<string, unknown>;
    return {
      data: {
        actions: [
          {
            kind: "PREPARE_OPTION_STRATEGY",
            rank: 1,
            title: "Option-pursue 1.5-mile ring · 14 parcels · ~1,260 acres",
            rationale: "Adjacent owners likely option targets within 30-60 days.",
            confidence: 0.91,
            reasonCode: "land-control + reachable-owners",
            estTimeMin: 240,
          },
          {
            kind: "CHECK_ZONING",
            rank: 2,
            title: "Pull title and ownership history on parcel 0414-031",
            rationale: "Rail and river frontage breaks the assembly's southern corridor.",
            confidence: 0.74,
            reasonCode: "title-pull",
            estTimeMin: 60,
          },
        ],
      },
      costUsd: 0.42,
      latencyMs: 4200,
      model: "openai/gpt-5.1",
      backend: "perplexity" as const,
      cached: false,
    };
  }),
}));

import { recommendActions } from "../src/investor-action";

beforeEach(() => {
  lastBackendArgs = null;
  actionDeleteManyCalled = false;
  actionCreates.length = 0;
});

describe("recommendActions", () => {
  it("uses pro-search preset and replaces pending actions", async () => {
    const out = await recommendActions("prj-1");

    expect(out.written).toBe(2);

    // Routing: pro-search preset (web search needed for current zoning/filings)
    expect(lastBackendArgs).not.toBeNull();
    expect(lastBackendArgs!.agent).toBe("InvestorAction");
    const routing = lastBackendArgs!.perplexity as { preset?: string; rawModel?: string };
    expect(routing.preset).toBe("reason");
    expect(routing.rawModel).toBeUndefined();

    // Pending actions purged before insert
    expect(actionDeleteManyCalled).toBe(true);

    // Two new actions persisted with correct shape
    expect(actionCreates).toHaveLength(2);
    expect(actionCreates[0].kind).toBe("PREPARE_OPTION_STRATEGY");
    expect(actionCreates[0].rank).toBe(1);
    expect(actionCreates[1].kind).toBe("CHECK_ZONING");
  });

  it("throws when project is missing", async () => {
    const { prisma } = await import("@gcir/db");
    vi.mocked(prisma.project.findUnique).mockResolvedValueOnce(null as never);
    await expect(recommendActions("nope")).rejects.toThrow(/missing/);
  });
});
