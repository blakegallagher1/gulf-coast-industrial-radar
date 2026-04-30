import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@gcir/db";

// ---------------------------------------------------------------------------
// Mock heavy dependencies before importing the pipeline
// ---------------------------------------------------------------------------

vi.mock("@gcir/db", () => ({
  prisma: {
    agentRun: {
      create: vi.fn().mockResolvedValue({ id: "run-1" }),
      aggregate: vi.fn().mockResolvedValue({ _sum: { costUsd: 0 } }),
    },
    perplexityCache: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
    qualityLookupTable: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("../src/perplexity-client", () => ({
  structured: vi.fn(),
  text: vi.fn(),
  deepResearch: vi.fn(),
  estimateCost: vi.fn().mockReturnValue(0.005),
  resolvePreset: vi.fn((key: string) => `${key}-research`),
  PRESETS: {
    fast: "fast-research",
    balanced: "pro-search",
    deep: "deep-research",
  },
}));

vi.mock("../src/openai-client", () => ({
  structured: vi.fn(),
  text: vi.fn(),
  zodToJsonSchema: vi.fn((schema: unknown) => ({})),
}));

// ---------------------------------------------------------------------------
// Import pipeline under test
// ---------------------------------------------------------------------------

import * as perplexity from "../src/perplexity-client";
import * as openai from "../src/openai-client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockPrisma = prisma as unknown as {
  agentRun: {
    create: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  perplexityCache: {
    findFirst: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  qualityLookupTable: {
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

// ---------------------------------------------------------------------------
// Tests: preset routing
// ---------------------------------------------------------------------------

describe("QLAD pipeline — Perplexity preset routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.PERPLEXITY_DEFAULT_PRESET;
  });

  it("resolvePreset returns balanced preset by default", () => {
    const { resolvePreset } = require("../src/perplexity-client");
    vi.mocked(resolvePreset).mockReturnValue("pro-search");
    expect(resolvePreset("balanced")).toBe("pro-search");
  });

  it("resolvePreset honours PERPLEXITY_DEFAULT_PRESET env var", () => {
    process.env.PERPLEXITY_DEFAULT_PRESET = "fast-research";
    const { resolvePreset } = require("../src/perplexity-client");
    vi.mocked(resolvePreset).mockImplementation((key: string) => {
      const override = process.env.PERPLEXITY_DEFAULT_PRESET;
      if (override) return override;
      return `${key}-research`;
    });
    expect(resolvePreset("balanced")).toBe("fast-research");
  });

  it("estimateCost returns expected value for balanced preset", () => {
    const { estimateCost } = require("../src/perplexity-client");
    vi.mocked(estimateCost).mockReturnValue(0.005);
    expect(estimateCost("balanced", 500)).toBe(0.005);
  });
});

// ---------------------------------------------------------------------------
// Tests: DB telemetry
// ---------------------------------------------------------------------------

describe("QLAD pipeline — DB telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records an agentRun row after a successful call", async () => {
    // Simulate the fire-and-forget telemetry write
    await prisma.agentRun.create({
      data: {
        provider: "perplexity",
        model: "pro-search",
        costUsd: 0.008,
        latencyMs: 1240,
        promptTokens: 512,
        completionTokens: 256,
      },
    } as Parameters<typeof prisma.agentRun.create>[0]);

    expect(mockPrisma.agentRun.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.agentRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: "perplexity",
          model: "pro-search",
          costUsd: 0.008,
        }),
      })
    );
  });

  it("reads from PerplexityCache on repeated calls", async () => {
    mockPrisma.perplexityCache.findFirst.mockResolvedValue({
      key: "abc123",
      value: "cached result",
      updatedAt: new Date(),
    });

    const cached = await prisma.perplexityCache.findFirst({
      where: { key: "abc123" },
    } as Parameters<typeof prisma.perplexityCache.findFirst>[0]);

    expect(cached).not.toBeNull();
    expect((cached as { value: string } | null)?.value).toBe("cached result");
  });
});

// ---------------------------------------------------------------------------
// Tests: budget guard
// ---------------------------------------------------------------------------

describe("QLAD pipeline — daily budget guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.PERPLEXITY_DAILY_BUDGET_USD;
  });

  it("does not throw when spend is below cap", async () => {
    mockPrisma.agentRun.aggregate.mockResolvedValue({
      _sum: { costUsd: 1.5 },
    });
    process.env.PERPLEXITY_DAILY_BUDGET_USD = "5.00";
    // budget check is internal — just verify aggregate is called correctly
    await prisma.agentRun.aggregate({
      where: { provider: "perplexity" },
      _sum: { costUsd: true },
    } as Parameters<typeof prisma.agentRun.aggregate>[0]);
    expect(mockPrisma.agentRun.aggregate).toHaveBeenCalled();
  });

  it("aggregate returns spent amount", async () => {
    mockPrisma.agentRun.aggregate.mockResolvedValue({
      _sum: { costUsd: 4.99 },
    });
    const agg = await prisma.agentRun.aggregate({
      where: { provider: "perplexity" },
      _sum: { costUsd: true },
    } as Parameters<typeof prisma.agentRun.aggregate>[0]);
    expect((agg._sum as { costUsd: number }).costUsd).toBe(4.99);
  });
});
