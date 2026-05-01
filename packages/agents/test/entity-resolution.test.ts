/**
 * EntityResolution unit test — verifies the deterministic shared-agent
 * pass + the LLM-aided callBackend pass are both wired correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let lastBackendArgs: Record<string, unknown> | null = null;
let entityLinkCreates: Array<Record<string, unknown>> = [];

const ENTITIES = [
  { id: "e-1", name: "Crescent Industrial Holdings I LLC", kind: "LLC", registeredAgent: "NRA Houston", mailingAddress: "Houston, TX", formedAt: new Date("2025-09-25") },
  { id: "e-2", name: "Crescent Industrial Holdings II LLC", kind: "LLC", registeredAgent: "NRA Houston", mailingAddress: "Houston, TX", formedAt: new Date("2025-09-26") },
  { id: "e-3", name: "Crescent Industrial Holdings III LLC", kind: "LLC", registeredAgent: "NRA Houston", mailingAddress: "Houston, TX", formedAt: new Date("2025-09-27") },
];

vi.mock("@gcir/db", () => ({
  EntityRelationship: {
    SHARES_REGISTERED_AGENT: "SHARES_REGISTERED_AGENT",
    SHARES_MAILING_ADDRESS: "SHARES_MAILING_ADDRESS",
    AFFILIATE_OF: "AFFILIATE_OF",
    ANALYST_LINKED: "ANALYST_LINKED",
  },
  prisma: {
    entity: {
      findMany: vi.fn(async () => ENTITIES),
    },
    entityLink: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        entityLinkCreates.push(args.data);
        return { id: `link-${entityLinkCreates.length}` };
      }),
    },
  },
}));

vi.mock("../src/agent-backend", () => ({
  callBackend: vi.fn(async (args: { agent: string; perplexity: unknown }) => {
    lastBackendArgs = args as unknown as Record<string, unknown>;
    return {
      data: {
        links: [
          {
            fromName: "Crescent Industrial Holdings I LLC",
            toName: "Crescent Industrial Holdings III LLC",
            relationship: "AFFILIATE_OF",
            confidence: 0.91,
            reason: "Series-LLC numbering + sequential formation dates",
          },
        ],
      },
      costUsd: 0.005,
      latencyMs: 380,
      model: "openai/gpt-5.4-mini",
      backend: "perplexity" as const,
      cached: false,
    };
  }),
}));

import { runEntityResolution } from "../src/entity-resolution";

beforeEach(() => {
  lastBackendArgs = null;
  entityLinkCreates = [];
});

describe("runEntityResolution", () => {
  it("creates deterministic shared-agent links + agent-aided links", async () => {
    const out = await runEntityResolution({});

    // 3 entities with same registeredAgent → C(3,2) = 3 deterministic links
    expect(out.deterministicLinks).toBe(3);
    expect(out.agentSuggestedLinks).toBe(1);

    // Routing: rawModel for cheap structured matching
    expect(lastBackendArgs).not.toBeNull();
    expect(lastBackendArgs!.agent).toBe("EntityResolution");
    const routing = lastBackendArgs!.perplexity as { rawModel?: string };
    expect(routing.rawModel).toBe("gpt5_4_mini");

    // Verify deterministic links use SHARES_REGISTERED_AGENT
    const detLinks = entityLinkCreates.filter((l) => l.detectedBy === "deterministic");
    expect(detLinks.length).toBe(3);
    expect(detLinks[0].relationship).toBe("SHARES_REGISTERED_AGENT");
    expect(detLinks[0].confidence).toBe(1.0);

    // Agent-aided link uses correct relationship
    const agentLinks = entityLinkCreates.filter((l) => l.detectedBy === "agent");
    expect(agentLinks.length).toBe(1);
    expect(agentLinks[0].relationship).toBe("AFFILIATE_OF");
  });

  it("returns deterministic-only when entity list is empty", async () => {
    const { prisma } = await import("@gcir/db");
    vi.mocked(prisma.entity.findMany).mockResolvedValueOnce([] as never);
    const out = await runEntityResolution({});
    expect(out).toEqual({ deterministicLinks: 0, agentSuggestedLinks: 0 });
  });
});
