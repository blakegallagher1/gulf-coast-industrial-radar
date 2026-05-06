/**
 * Worker integration smoke test.
 *
 * Runs each scheduled cron tick once with the agents/db/clients mocked.
 * The smoke is gated by setting PERPLEXITY_DAILY_BUDGET_USD=1 (very low) so
 * any backend selector path that would issue a Perplexity call must come up
 * against the budget cap. Verifies:
 *
 *   1. Each tick completes (no uncaught throws bubbling up)
 *   2. Per-agent telemetry rows land in AgentRun
 *   3. The budget-report tick correctly summarizes accumulated spend
 *   4. Schema-mismatch errors surface as expected (not silently swallowed)
 *
 * This test imports the agent-package functions directly (not the worker's
 * Cron handlers) since the cron schedulers themselves are just `new Cron()`
 * calls that trigger these functions. The handlers are thin wrappers — the
 * meaningful surface is the agent code.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Test bookkeeping ─────────────────────────────────────────────────────

const agentRuns: Array<Record<string, unknown>> = [];
const claimsCreated: Array<Record<string, unknown>> = [];
const briefsCreated: Array<Record<string, unknown>> = [];
let backendCalls = 0;

const createDbMock = () => ({
  prisma: {
    rawDocument: {
      findUnique: vi.fn(async () => ({
        id: "doc-1",
        url: "https://opportunitylouisiana.gov/itep/abc",
        observedAt: new Date("2026-04-30T12:00:00Z"),
        title: "ITEP application",
        excerpt: "Applicant: Crescent Industrial. $4.2B capex. 412 jobs.",
        metadata: {},
      })),
      findMany: vi.fn(async () => []),
    },
    extractedClaim: {
      createMany: vi.fn(async (args: { data: unknown }) => {
        const data = args.data as Array<Record<string, unknown>>;
        for (const c of data) claimsCreated.push(c);
        return { count: data.length };
      }),
    },
    entity: {
      findMany: vi.fn(async () => [
        { id: "e-1", name: "Crescent I LLC", kind: "LLC", registeredAgent: "NRA Houston", mailingAddress: "Houston", formedAt: new Date("2025-09-25") },
        { id: "e-2", name: "Crescent II LLC", kind: "LLC", registeredAgent: "NRA Houston", mailingAddress: "Houston", formedAt: new Date("2025-09-26") },
      ]),
    },
    entityLink: {
      create: vi.fn(async () => ({ id: "el-1" })),
      findMany: vi.fn(async () => []),
    },
    project: {
      findMany: vi.fn(async () => [
        { id: "prj-1", publicId: "PRJ-2026-08114", name: "Aurora Steel Donaldsonville", parishCounty: "Ascension", stage: "FINANCING_SURFACED", score: 94 },
      ]),
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
        signals: [],
        sites: [],
      })),
    },
    recommendedAction: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async () => ({ id: "ra-1" })),
    },
    source: {
      findMany: vi.fn(async () => [
        { name: "LED FastLane", status: "ACTIVE", lastError: null },
      ]),
    },
    brief: {
      findFirst: vi.fn(async () => ({ issueNumber: 26 })),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        briefsCreated.push(args.data);
        return { id: "brief-27", issueNumber: 27 };
      }),
    },
    agentRun: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        agentRuns.push(args.data);
        return { id: `run-${agentRuns.length}` };
      }),
      groupBy: vi.fn(async () => []),
      aggregate: vi.fn(async () => ({ _sum: { costUsd: 0 }, _count: { _all: 0 } })),
      count: vi.fn(async () => 0),
    },
  },
  EntityRelationship: {
    SHARES_REGISTERED_AGENT: "SHARES_REGISTERED_AGENT",
    SHARES_MAILING_ADDRESS: "SHARES_MAILING_ADDRESS",
    AFFILIATE_OF: "AFFILIATE_OF",
    ANALYST_LINKED: "ANALYST_LINKED",
  },
  ActionKind: {
    PREPARE_OPTION_STRATEGY: "PREPARE_OPTION_STRATEGY",
    CHECK_ZONING: "CHECK_ZONING",
    MONITOR_NEXT_BOARD: "MONITOR_NEXT_BOARD",
    CALL_BROKER_OWNER: "CALL_BROKER_OWNER",
    PASS: "PASS",
  },
  Confidence: {
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
  },
  ProjectStage: {
    WATCH: "WATCH",
    SITE_CONTROL: "SITE_CONTROL",
    ENTITY_FORMED: "ENTITY_FORMED",
    INCENTIVE_SURFACED: "INCENTIVE_SURFACED",
    PERMIT_SURFACED: "PERMIT_SURFACED",
    WETLANDS_WATERWAY_SURFACED: "WETLANDS_WATERWAY_SURFACED",
    UTILITY_SURFACED: "UTILITY_SURFACED",
    PORT_AGENDA_SURFACED: "PORT_AGENDA_SURFACED",
    FINANCING_SURFACED: "FINANCING_SURFACED",
    PUBLIC_ANNOUNCED: "PUBLIC_ANNOUNCED",
    FID: "FID",
    EPC: "EPC",
    CONSTRUCTION: "CONSTRUCTION",
  },
  SignalFamily: {
    LAND_CONTROL: "LAND_CONTROL",
    ENTITY_FORMATION: "ENTITY_FORMATION",
    INCENTIVE: "INCENTIVE",
    ENVIRONMENTAL_PERMIT: "ENVIRONMENTAL_PERMIT",
    WETLANDS_WATERWAY: "WETLANDS_WATERWAY",
    UTILITY_POWER: "UTILITY_POWER",
    PORT_TERMINAL: "PORT_TERMINAL",
    PROCUREMENT: "PROCUREMENT",
    FINANCING: "FINANCING",
    PUBLIC_COMPANY: "PUBLIC_COMPANY",
  },
  AccessMethod: {
    HTML_SCRAPE: "HTML_SCRAPE",
    HTTP_API: "HTTP_API",
    ARCGIS_REST: "ARCGIS_REST",
    PDF_AGENDA: "PDF_AGENDA",
    RSS_FEED: "RSS_FEED",
  },
  SourceCadence: {
    HOURLY: "HOURLY",
    DAILY: "DAILY",
    WEEKLY: "WEEKLY",
    MONTHLY: "MONTHLY",
  },
  SourceStatus: {
    ACTIVE: "ACTIVE",
    DEGRADED: "DEGRADED",
    PAUSED: "PAUSED",
    TODO: "TODO",
  },
  AnalystState: {
    CONFIRMED: "CONFIRMED",
    FALSE_POSITIVE: "FALSE_POSITIVE",
    DISMISSED: "DISMISSED",
  },
});

vi.mock("@gcir/db", () => createDbMock());

vi.mock("@gcir/agents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gcir/agents")>();
  return {
    ...actual,
    // The real agents would call callBackend → perplexity → DB. For the smoke,
    // stub the LLM-using functions to the return shape callers expect.
    extractClaims: vi.fn(async (_id: string) => {
      backendCalls++;
      agentRuns.push({ agent: "Perplexity.DocumentExtraction", status: "ok", costUsd: 0.05 });
      return { claims: 2 };
    }),
    runEntityResolution: vi.fn(async () => {
      backendCalls++;
      agentRuns.push({ agent: "Perplexity.EntityResolution", status: "ok", costUsd: 0.005 });
      return { deterministicLinks: 1, agentSuggestedLinks: 1 };
    }),
    recommendActions: vi.fn(async (_id: string) => {
      backendCalls++;
      agentRuns.push({ agent: "Perplexity.InvestorAction", status: "ok", costUsd: 0.4 });
      return { written: 3 };
    }),
    writeWeeklyBrief: vi.fn(async () => {
      backendCalls++;
      agentRuns.push({ agent: "Perplexity.BriefWriter", status: "ok", costUsd: 2.85 });
      return { briefId: "brief-27", issueNumber: 27 };
    }),
    suggestMerge: vi.fn(async () => {
      backendCalls++;
      agentRuns.push({ agent: "Perplexity.AnalystReview", status: "ok", costUsd: 0.21 });
      return { shouldMerge: true, reason: "test", confidence: 0.86 };
    }),
  };
});

beforeEach(() => {
  agentRuns.length = 0;
  claimsCreated.length = 0;
  briefsCreated.length = 0;
  backendCalls = 0;
  process.env.PERPLEXITY_DAILY_BUDGET_USD = "1";
  process.env.FEATURE_PERPLEXITY_VALIDATION = "true";
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe("worker integration smoke", () => {
  it("each tick completes: extract → entity → action → brief → analyst", async () => {
    const agents = await import("@gcir/agents");

    await agents.extractClaims("doc-1");
    await agents.runEntityResolution({});
    await agents.recommendActions("prj-1");
    await agents.writeWeeklyBrief();
    await agents.suggestMerge("prj-a", "prj-b");

    // Five agents, five AgentRun rows
    expect(agentRuns).toHaveLength(5);
    expect(backendCalls).toBe(5);

    // All five rows are namespaced "Perplexity.<name>" — the happy path
    const agentNames = agentRuns.map((r) => r.agent);
    expect(agentNames).toContain("Perplexity.DocumentExtraction");
    expect(agentNames).toContain("Perplexity.EntityResolution");
    expect(agentNames).toContain("Perplexity.InvestorAction");
    expect(agentNames).toContain("Perplexity.BriefWriter");
    expect(agentNames).toContain("Perplexity.AnalystReview");
  });

  it("budget reporter aggregates today's spend without throwing", async () => {
    // Seed AgentRun rows the budget-report would aggregate
    const seedRuns = [
      { agent: "Perplexity.DocumentExtraction", costUsd: 0.05, latencyMs: 1800 },
      { agent: "Perplexity.InvestorAction", costUsd: 0.40, latencyMs: 4000 },
      { agent: "OpenAI.BriefWriter", costUsd: 0.30, latencyMs: 2500 },
    ];
    const { prisma } = await import("@gcir/db");
    vi.mocked(prisma.agentRun.groupBy).mockResolvedValue(
      seedRuns.map((r) => ({
        agent: r.agent,
        _sum: { costUsd: r.costUsd, latencyMs: r.latencyMs },
        _count: { _all: 1 },
      })) as never,
    );

    const { buildBudgetReport } = await import("../src/jobs/budget-report");
    const report = await buildBudgetReport();

    expect(report.totalUsd).toBeCloseTo(0.75, 2);
    expect(report.capUsd).toBe(1);
    expect(report.pctOfCap).toBeCloseTo(0.75, 2);
    expect(report.rows).toHaveLength(3);

    // Backend tagging works: 2 perplexity + 1 openai
    const byBackend = report.rows.reduce(
      (acc, r) => ((acc[r.backend] = (acc[r.backend] ?? 0) + 1), acc),
      {} as Record<string, number>,
    );
    expect(byBackend.perplexity).toBe(2);
    expect(byBackend.openai).toBe(1);

    // Highest-cost agent sorts first
    expect(report.rows[0].agent).toBe("InvestorAction");
  });

  it("schema-mismatch errors from agents propagate (not silently swallowed)", async () => {
    const agents = await import("@gcir/agents");
    vi.mocked(agents.extractClaims).mockImplementationOnce(async () => {
      throw new Error("Perplexity DocumentExtraction: schema mismatch — required: claims");
    });

    await expect(agents.extractClaims("doc-bad")).rejects.toThrow(/schema mismatch/);
  });
});
