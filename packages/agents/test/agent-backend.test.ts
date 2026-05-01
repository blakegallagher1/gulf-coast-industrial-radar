/**
 * agent-backend.test.ts — verifies the Perplexity → OpenAI fallback selector.
 *
 * Three critical paths for Phase 3.2:
 *   1. Default: Perplexity succeeds, OpenAI not touched, no fallback row written
 *   2. Budget exceeded: Perplexity throws, OpenAI fallback runs, AgentRun row written
 *   3. Disabled flag: same fallback path
 *   4. Schema mismatch: Perplexity throws, NOT a budget error → rethrown to caller
 *   5. AGENT_BACKEND_<NAME>=openai env: skips Perplexity entirely
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

let perplexityCalls = 0;
let openaiCalls = 0;
const agentRunCreates: Array<Record<string, unknown>> = [];

class MockPerplexityDisabledError extends Error {
  constructor() {
    super("disabled");
    this.name = "PerplexityDisabledError";
  }
}
class MockPerplexityBudgetExceededError extends Error {
  spent = 50;
  cap = 50;
  constructor() {
    super("Perplexity daily budget exhausted ($50.00 / $50.00)");
    this.name = "PerplexityBudgetExceededError";
  }
}

vi.mock("@gcir/db", () => ({
  prisma: {
    agentRun: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        agentRunCreates.push(args.data);
        return { id: `run-${agentRunCreates.length}` };
      }),
    },
  },
}));

vi.mock("../src/perplexity-client", () => ({
  PerplexityDisabledError: MockPerplexityDisabledError,
  PerplexityBudgetExceededError: MockPerplexityBudgetExceededError,
  PPLX_MODELS: {
    gpt5_4_mini: "openai/gpt-5.4-mini",
    gpt5_4: "openai/gpt-5.4",
  },
  structured: vi.fn(),
}));

vi.mock("../src/openai-client", () => ({
  structured: vi.fn(),
}));

const SCHEMA = z.object({ ok: z.boolean() });
const baseArgs = {
  agent: "TestAgent",
  systemPrompt: "system",
  user: "user",
  schema: SCHEMA,
  schemaName: "TestSchema",
  perplexity: { rawModel: "gpt5_4_mini" } as const,
};

beforeEach(() => {
  perplexityCalls = 0;
  openaiCalls = 0;
  agentRunCreates.length = 0;
  delete process.env.AGENT_BACKEND_TESTAGENT;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("callBackend", () => {
  it("routes through Perplexity by default and does NOT touch OpenAI", async () => {
    const pplx = await import("../src/perplexity-client");
    const openai = await import("../src/openai-client");
    vi.mocked(pplx.structured).mockImplementation(async () => {
      perplexityCalls++;
      return {
        data: { ok: true },
        citations: [],
        costUsd: 0.05,
        latencyMs: 500,
        model: "openai/gpt-5.4-mini",
        inputTokens: 100,
        outputTokens: 50,
        cached: false,
      };
    });
    vi.mocked(openai.structured).mockImplementation(async () => {
      openaiCalls++;
      throw new Error("OpenAI should not be called");
    });

    const { callBackend } = await import("../src/agent-backend");
    const out = await callBackend(baseArgs);

    expect(out.backend).toBe("perplexity");
    expect(out.data.ok).toBe(true);
    expect(perplexityCalls).toBe(1);
    expect(openaiCalls).toBe(0);
    // Perplexity writes its own AgentRun row inside structured() — not from
    // agent-backend. So no extra row from this layer on success.
    expect(agentRunCreates).toHaveLength(0);
  });

  it("falls back to OpenAI on PerplexityBudgetExceededError + writes telemetry row", async () => {
    const pplx = await import("../src/perplexity-client");
    const openai = await import("../src/openai-client");
    vi.mocked(pplx.structured).mockImplementation(async () => {
      perplexityCalls++;
      throw new MockPerplexityBudgetExceededError();
    });
    vi.mocked(openai.structured).mockImplementation(async () => {
      openaiCalls++;
      return {
        data: { ok: true },
        costUsd: 0.04,
        latencyMs: 800,
        model: "gpt-5.4",
        inputTokens: 100,
        outputTokens: 50,
      };
    });

    const { callBackend } = await import("../src/agent-backend");
    const out = await callBackend(baseArgs);

    expect(out.backend).toBe("openai");
    expect(perplexityCalls).toBe(1);
    expect(openaiCalls).toBe(1);

    // OpenAI fallback writes one AgentRun row (telemetry parity with Perplexity)
    expect(agentRunCreates).toHaveLength(1);
    expect(agentRunCreates[0].agent).toBe("OpenAI.TestAgent");
    expect(agentRunCreates[0].status).toBe("ok");
  });

  it("falls back to OpenAI when Perplexity is disabled by feature flag", async () => {
    const pplx = await import("../src/perplexity-client");
    const openai = await import("../src/openai-client");
    vi.mocked(pplx.structured).mockImplementation(async () => {
      perplexityCalls++;
      throw new MockPerplexityDisabledError();
    });
    vi.mocked(openai.structured).mockImplementation(async () => {
      openaiCalls++;
      return {
        data: { ok: true },
        costUsd: 0.04,
        latencyMs: 800,
        model: "gpt-5.4",
        inputTokens: 100,
        outputTokens: 50,
      };
    });

    const { callBackend } = await import("../src/agent-backend");
    const out = await callBackend(baseArgs);

    expect(out.backend).toBe("openai");
    expect(perplexityCalls).toBe(1);
    expect(openaiCalls).toBe(1);
  });

  it("rethrows non-budget Perplexity errors (e.g. schema mismatch) instead of falling back", async () => {
    const pplx = await import("../src/perplexity-client");
    const openai = await import("../src/openai-client");
    vi.mocked(pplx.structured).mockImplementation(async () => {
      perplexityCalls++;
      throw new Error("Perplexity TestAgent: schema mismatch — required: ok");
    });
    vi.mocked(openai.structured).mockImplementation(async () => {
      openaiCalls++;
      return {
        data: { ok: true },
        costUsd: 0.04,
        latencyMs: 800,
        model: "gpt-5.4",
        inputTokens: 100,
        outputTokens: 50,
      };
    });

    const { callBackend } = await import("../src/agent-backend");
    await expect(callBackend(baseArgs)).rejects.toThrow(/schema mismatch/);
    expect(perplexityCalls).toBe(1);
    // Schema mismatch is a real bug — surface it, don't silently downgrade.
    expect(openaiCalls).toBe(0);
  });

  it("AGENT_BACKEND_TESTAGENT=openai forces OpenAI without trying Perplexity", async () => {
    process.env.AGENT_BACKEND_TESTAGENT = "openai";

    const pplx = await import("../src/perplexity-client");
    const openai = await import("../src/openai-client");
    vi.mocked(pplx.structured).mockImplementation(async () => {
      perplexityCalls++;
      throw new Error("Perplexity should not be called");
    });
    vi.mocked(openai.structured).mockImplementation(async () => {
      openaiCalls++;
      return {
        data: { ok: true },
        costUsd: 0.04,
        latencyMs: 800,
        model: "gpt-5.4",
        inputTokens: 100,
        outputTokens: 50,
      };
    });

    const { callBackend } = await import("../src/agent-backend");
    const out = await callBackend(baseArgs);

    expect(out.backend).toBe("openai");
    expect(perplexityCalls).toBe(0);
    expect(openaiCalls).toBe(1);
    expect(agentRunCreates).toHaveLength(1);
  });
});
