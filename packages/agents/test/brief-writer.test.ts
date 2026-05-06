/**
 * BriefWriter unit test — verifies deep-research preset routing and that
 * writeWeeklyBrief() persists a Brief row with monotonically-increasing issueNumber.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let lastBackendArgs: Record<string, unknown> | null = null;
let lastBriefCreate: Record<string, unknown> | null = null;
let projectFindManyMock: ReturnType<typeof vi.fn>;
let watchlistFindManyMock: ReturnType<typeof vi.fn>;

const TOP_PROJECTS = [
  { publicId: "PRJ-2026-08114", name: "Aurora Steel Donaldsonville", parishCounty: "Ascension", stage: "FINANCING_SURFACED", score: 94 },
  { publicId: "PRJ-2024-01001", name: "Hyundai Steel Donaldsonville", parishCounty: "Ascension", stage: "PUBLIC_ANNOUNCED", score: 100 },
];

const SOURCES = [
  { name: "LED FastLane", status: "ACTIVE", lastError: null },
  { name: "Calcasieu CPPJ", status: "DEGRADED", lastError: "ECONNRESET at 06:14" },
];

vi.mock("@gcir/db", () => ({
  prisma: {
    project: {
      findMany: (...args: unknown[]) => projectFindManyMock(...args),
    },
    watchlist: {
      findMany: (...args: unknown[]) => watchlistFindManyMock(...args),
    },
    source: {
      findMany: vi.fn(async () => SOURCES),
    },
    brief: {
      findFirst: vi.fn(async () => ({ issueNumber: 26 })),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        lastBriefCreate = args.data;
        return { id: "brief-27", issueNumber: 27 };
      }),
    },
  },
}));

vi.mock("../src/agent-backend", () => ({
  callBackend: vi.fn(async (args: { agent: string; perplexity: unknown }) => {
    lastBackendArgs = args as unknown as Record<string, unknown>;
    return {
      data: {
        title: "River corridor: a steel-class assembly is forming.",
        narrative:
          "The defining move of the week was an Industrial Development Bond agenda item posting on Tuesday for 'Project Aurora' — $4.2B notional, Ascension Parish.",
        topMovers: [
          {
            publicId: "PRJ-2026-08114",
            name: "Aurora Steel Donaldsonville",
            stage: "FINANCING_SURFACED",
            score: 94,
            delta: 11,
            headline: "IDB notice posted Tuesday",
          },
        ],
        recommendedActions: [
          {
            rank: 1,
            title: "Pull title on Aurora Steel adjacent ring · 14 parcels · 1.5-mile",
            why: "30-60 day acquisition window before public announcement",
            timeBudgetMin: 240,
          },
        ],
      },
      costUsd: 2.85,
      latencyMs: 28000,
      model: "openai/gpt-5.2",
      backend: "perplexity" as const,
      cached: false,
    };
  }),
}));

import { writeWeeklyBrief } from "../src/brief-writer";

beforeEach(() => {
  lastBackendArgs = null;
  lastBriefCreate = null;
  projectFindManyMock = vi.fn(async ({ take }: { take?: number } = {}) => {
    if (take === 5) {
      return TOP_PROJECTS.slice(0, 1);
    }
    return TOP_PROJECTS;
  });
  watchlistFindManyMock = vi.fn(async () => [
    {
      id: "wl-1",
      name: "Quiet Assembly Focus",
      items: [
        {
          project: {
            id: "project-aurora",
            publicId: "PRJ-2026-08114",
            name: "Aurora Steel Donaldsonville",
            parishCounty: "Ascension",
            stage: "FINANCING_SURFACED",
            score: 94,
          },
        },
      ],
    },
  ]);
});

describe("writeWeeklyBrief", () => {
  it("uses deep-research preset and increments issueNumber", async () => {
    const out = await writeWeeklyBrief();

    expect(out.issueNumber).toBe(27);
    expect(out.briefId).toBe("brief-27");

    expect(lastBackendArgs).not.toBeNull();
    expect(lastBackendArgs!.agent).toBe("BriefWriter");
    const routing = lastBackendArgs!.perplexity as { preset?: string; rawModel?: string };
    expect(routing.preset).toBe("deep");
    expect(routing.rawModel).toBeUndefined();
    expect(lastBackendArgs!.user).toEqual(expect.stringContaining("FOLLOWED_WATCHLIST"));

    // Brief row contains the agent's output + computed source health
    expect(lastBriefCreate).not.toBeNull();
    expect(lastBriefCreate!.title).toMatch(/river corridor/i);
    expect(lastBriefCreate!.issueNumber).toBe(27);
    const movers = lastBriefCreate!.topMovers as Array<{ publicId: string }>;
    expect(movers[0].publicId).toBe("PRJ-2026-08114");
    const sourceHealth = lastBriefCreate!.sourceHealth as {
      followedWatchlists?: Array<{ name: string }>;
      watchlistFocus?: Array<{ projectPublicId: string }>;
    };
    expect(sourceHealth.followedWatchlists?.[0]?.name).toBe("Quiet Assembly Focus");
    expect(sourceHealth.watchlistFocus?.[0]?.projectPublicId).toBe("PRJ-2026-08114");
  });

  it("starts at issueNumber=1 when no prior briefs exist", async () => {
    const { prisma } = await import("@gcir/db");
    vi.mocked(prisma.brief.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(prisma.brief.create).mockResolvedValueOnce({ id: "brief-1", issueNumber: 1 } as never);
    const out = await writeWeeklyBrief();
    expect(out.issueNumber).toBe(1);
  });
});
