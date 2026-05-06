/**
 * QLAD pipeline integration smoke test.
 *
 * Mocks @gcir/db (full Prisma surface) and perplexity-client, then calls
 * tickQlad() with a seeded set of LAND_CONTROL signals matching the Aurora
 * Steel Donaldsonville fixture (Ascension parish, 1247 total acres, 5 related
 * Crescent Industrial Holdings LLCs).
 *
 * Two scenarios:
 *   1. publicCoverageFound = false  → alert created
 *   2. publicCoverageFound = true   → alert silenced
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";

// ─── Shared canned Perplexity responses ───────────────────────────────────

const CANNED_PUBLIC_CHECK = {
  publicCoverageFound: false,
  summary: "No credible public source explains this assembly yet.",
  confidence: 0.88,
  evidenceQuotes: [] as string[],
};

const CANNED_ENTITY_RESEARCH = {
  entityName: "Crescent Industrial Holdings I LLC",
  summary: "Recently-formed LLC; agent is a national filing service. No notable disclosures.",
  sisterCompanies: [
    "Crescent Industrial Holdings II LLC",
    "Crescent Industrial Holdings III LLC",
    "Crescent Industrial Holdings IV LLC",
    "Crescent Industrial Holdings V LLC",
  ],
  redFlags: ["Series-LLC pattern", "Rapid sequential formations"],
};

const CANNED_VALIDATION_BASE = {
  publicCheck: { ...CANNED_PUBLIC_CHECK, citations: [{ url: "https://example.com/news", title: "Local paper" }] },
  entityResearch: [CANNED_ENTITY_RESEARCH],
  publicCoverageFound: false,
  totalCostUsd: 0.03,
  modelMix: ["openai/gpt-5.1"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Build a deterministic cluster alert id the same way qlad-evaluate does. */
function mockAlertId(parish: string, state: string, entityIds: string[]): string {
  const sorted = [...entityIds].sort().join("|");
  const sig = createHash("sha256").update(`${state}::${parish}::${sorted}`).digest("hex");
  return `qlad_${sig.slice(0, 24)}`;
}

/** 7 LAND_CONTROL signals for Ascension parish — Aurora Steel Donaldsonville fixture. */
function makeSignals() {
  const entityIds = ["e-1", "e-2", "e-3", "e-4", "e-5"];
  const parcelDefs = [
    { parcelId: "0140002200", acres: 245.7, entityIdx: 0, price: 4800000 },
    { parcelId: "0140002201", acres: 312.4, entityIdx: 1, price: 6100000 },
    { parcelId: "0140002202", acres: 189.2, entityIdx: 2, price: 3700000 },
    { parcelId: "0140002203", acres: 198.8, entityIdx: 3, price: 3900000 },
    { parcelId: "0140002204", acres: 150.5, entityIdx: 4, price: 2950000 },
    { parcelId: "0140002205", acres: 100.4, entityIdx: 0, price: 1960000 },
    { parcelId: "0140002206", acres: 50.0, entityIdx: 1, price: 980000 },
  ];
  // Total = 1247.0 ac

  return parcelDefs.map((p, i) => ({
    id: `sig-${i}`,
    family: "LAND_CONTROL" as const,
    observedAt: new Date("2026-04-15T12:00:00Z"),
    documentDate: new Date("2026-04-10T00:00:00Z"),
    source: { slug: "ascension-assessor" },
    payload: {
      parishCounty: "Ascension",
      parcelId: p.parcelId,
      acres: p.acres,
      buyerEntityId: entityIds[0],
      pricePerAcre: p.price / p.acres,
      geometry: {
        rings: [[
          [-90.99 - i * 0.01, 30.07],
          [-90.98 - i * 0.01, 30.07],
          [-90.98 - i * 0.01, 30.06],
          [-90.99 - i * 0.01, 30.06],
          [-90.99 - i * 0.01, 30.07],
        ]],
      },
    },
  }));
}

// ─── Shared mock setup ────────────────────────────────────────────────────

/** Upserted alert accumulator — shared across tests via closure reset. */
let lastUpsertedAlert: Record<string, unknown> | null = null;
let alertUpsertCallCount = 0;

function buildDbMock(overrides: { publicCoverageFound?: boolean } = {}) {
  const signals = makeSignals();
  const publicCoverage = overrides.publicCoverageFound ?? false;

  vi.mock("@gcir/db", () => {
    const EntityRelationship = {
      SHARES_REGISTERED_AGENT: "SHARES_REGISTERED_AGENT",
      SHARES_MAILING_ADDRESS: "SHARES_MAILING_ADDRESS",
      AFFILIATE_OF: "AFFILIATE_OF",
      ANALYST_LINKED: "ANALYST_LINKED",
    };
    const ProjectStage = {
      PUBLIC_ANNOUNCED: "PUBLIC_ANNOUNCED",
      WATCH: "WATCH",
      SITE_CONTROL: "SITE_CONTROL",
      ENTITY_FORMED: "ENTITY_FORMED",
      INCENTIVE_SURFACED: "INCENTIVE_SURFACED",
      PERMIT_SURFACED: "PERMIT_SURFACED",
      WETLANDS_WATERWAY_SURFACED: "WETLANDS_WATERWAY_SURFACED",
      UTILITY_SURFACED: "UTILITY_SURFACED",
      PORT_AGENDA_SURFACED: "PORT_AGENDA_SURFACED",
      FINANCING_SURFACED: "FINANCING_SURFACED",
      FID: "FID",
      EPC: "EPC",
      CONSTRUCTION: "CONSTRUCTION",
    };
    const Confidence = {
      HIGH: "HIGH",
      MEDIUM: "MEDIUM",
      LOW: "LOW",
    };
    return {
      EntityRelationship,
      ProjectStage,
      Confidence,
      prisma: {
        signal: {
          findMany: vi.fn(async () => signals),
          updateMany: vi.fn(async () => ({ count: signals.length })),
        },
        entityLink: {
          findMany: vi.fn(async () => [
            // e-1 through e-5 are all linked via shared registered agent
            { fromId: "e-1", toId: "e-2" },
            { fromId: "e-2", toId: "e-3" },
            { fromId: "e-3", toId: "e-4" },
            { fromId: "e-4", toId: "e-5" },
          ]),
        },
        entity: {
          findMany: vi.fn(async () =>
            ["e-1", "e-2", "e-3", "e-4", "e-5"].map((id) => ({
              id,
              opacityScore: 0.82,
            })),
          ),
        },
        project: {
          findFirst: vi.fn(async () => null),
          upsert: vi.fn(async () => ({
            id: "prj-aurora-test",
            publicId: "PRJ-QLAD-test",
            score: 72,
          })),
        },
        alert: {
          upsert: vi.fn(async (args: unknown) => {
            lastUpsertedAlert = (args as { create: Record<string, unknown> }).create;
            alertUpsertCallCount++;
            return {
              id: (args as { where: { id: string } }).where.id,
              publicCoverageFound,
              silencedAt: publicCoverage ? new Date() : null,
            };
          }),
        },
        recommendedAction: {
          count: vi.fn(async () => 0),
          createMany: vi.fn(async () => ({ count: 3 })),
        },
      },
    };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("qlad-pipeline (Deliverable 3 smoke test)", () => {
  beforeEach(() => {
    lastUpsertedAlert = null;
    alertUpsertCallCount = 0;
    vi.resetModules();
    process.env.FEATURE_QLAD_LIVE_ALERTING = "true";
    process.env.FEATURE_PERPLEXITY_VALIDATION = "true";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.FEATURE_QLAD_LIVE_ALERTING;
    delete process.env.FEATURE_PERPLEXITY_VALIDATION;
  });

  it("Scenario 1: detector triggers, alert created, supplementaryEvidence contains publicCheck + entityResearch", async () => {
    vi.doMock("@gcir/db", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@gcir/db")>();
      const signals = makeSignals();
      const EntityRelationship = {
        SHARES_REGISTERED_AGENT: "SHARES_REGISTERED_AGENT",
        SHARES_MAILING_ADDRESS: "SHARES_MAILING_ADDRESS",
        AFFILIATE_OF: "AFFILIATE_OF",
        ANALYST_LINKED: "ANALYST_LINKED",
      };
      const ProjectStage = {
        PUBLIC_ANNOUNCED: "PUBLIC_ANNOUNCED",
        WATCH: "WATCH",
        SITE_CONTROL: "SITE_CONTROL",
        ENTITY_FORMED: "ENTITY_FORMED",
        INCENTIVE_SURFACED: "INCENTIVE_SURFACED",
        PERMIT_SURFACED: "PERMIT_SURFACED",
        WETLANDS_WATERWAY_SURFACED: "WETLANDS_WATERWAY_SURFACED",
        UTILITY_SURFACED: "UTILITY_SURFACED",
        PORT_AGENDA_SURFACED: "PORT_AGENDA_SURFACED",
        FINANCING_SURFACED: "FINANCING_SURFACED",
        FID: "FID",
        EPC: "EPC",
        CONSTRUCTION: "CONSTRUCTION",
      };
      const Confidence = {
        HIGH: "HIGH",
        MEDIUM: "MEDIUM",
        LOW: "LOW",
      };
      const SignalFamily = {
        LAND_CONTROL: "LAND_CONTROL",
      };
      const ActionKind = {
        RESEARCH_ENTITY: "RESEARCH_ENTITY",
        VERIFY_SOURCE: "VERIFY_SOURCE",
        PUBLIC_RECORDS_PULL: "PUBLIC_RECORDS_PULL",
      };
      return {
        ...actual,
        EntityRelationship,
        ProjectStage,
        Confidence,
        SignalFamily,
        ActionKind,
        prisma: {
          signal: {
            findMany: vi.fn(async () => signals),
            updateMany: vi.fn(async () => ({ count: signals.length })),
          },
          entityLink: {
            findMany: vi.fn(async () => [
              { fromId: "e-1", toId: "e-2" },
              { fromId: "e-2", toId: "e-3" },
              { fromId: "e-3", toId: "e-4" },
              { fromId: "e-4", toId: "e-5" },
            ]),
          },
          entity: {
            findMany: vi.fn(async () =>
              ["e-1", "e-2", "e-3", "e-4", "e-5"].map((id) => ({ id, opacityScore: 0.82 })),
            ),
            findUnique: vi.fn(async ({ where }: { where: { id?: string } }) =>
              where.id ? { id: where.id } : null,
            ),
            create: vi.fn(async ({ data }: { data: { name: string } }) => ({ id: `entity-${data.name}` })),
          },
          project: {
            findFirst: vi.fn(async () => null),
            upsert: vi.fn(async () => ({ id: "prj-aurora-test", publicId: "PRJ-QLAD-test", score: 72 })),
          },
          site: {
            findFirst: vi.fn(async () => null),
            create: vi.fn(async () => ({ id: "site-aurora-test" })),
          },
          parcel: {
            upsert: vi.fn(async ({ where }: { where: { state_parishCounty_parcelNumber: { parcelNumber: string } } }) => ({
              id: `parcel-${where.state_parishCounty_parcelNumber.parcelNumber}`,
            })),
          },
          parcelInterest: {
            findFirst: vi.fn(async () => null),
            create: vi.fn(async () => ({ id: "pi-test" })),
          },
          alert: {
            upsert: vi.fn(async (args: unknown) => {
              lastUpsertedAlert = (args as { create: Record<string, unknown> }).create;
              alertUpsertCallCount++;
              return { id: "test-alert-id", publicCoverageFound: false, silencedAt: null };
            }),
          },
          recommendedAction: {
            count: vi.fn(async () => 1),
            createMany: vi.fn(async () => ({ count: 3 })),
          },
        },
      };
    });

    vi.doMock("../src/perplexity-client", () => {
      const PerplexityDisabledError = class extends Error {};
      return {
        PerplexityDisabledError,
        structured: vi.fn(async ({ schemaName }: { schemaName: string }) => {
          if (schemaName === "GcirPublicCoverageCheck") {
            return {
              data: { ...CANNED_PUBLIC_CHECK },
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
            data: { ...CANNED_ENTITY_RESEARCH },
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

    vi.doMock("@gcir/agents", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@gcir/agents")>();
      return {
        ...actual,
        validateAssembly: vi.fn(async () => ({
          ...CANNED_VALIDATION_BASE,
          publicCoverageFound: false,
        })),
        recommendActions: vi.fn(async () => [
          { type: "OUTREACH", note: "Contact county assessor for ownership chain" },
        ]),
        PerplexityDisabledError: class extends Error {},
      };
    });

    const { tickQlad } = await import(
      "../../../apps/worker/src/jobs/qlad-evaluate"
    );

    const result = await tickQlad();

    // Detector should have triggered on ≥1 cluster
    expect(result.clustersTriggered).toBeGreaterThanOrEqual(1);

    // Alert should be created, not silenced
    expect(result.alertsCreated).toBe(1);
    expect(result.alertsSilenced).toBe(0);

    // Verify the upserted alert contains supplementaryEvidence
    expect(lastUpsertedAlert).not.toBeNull();
    const evidence = lastUpsertedAlert!.supplementaryEvidence as {
      publicCheck: typeof CANNED_PUBLIC_CHECK;
      entityResearch: typeof CANNED_ENTITY_RESEARCH[];
    } | undefined;
    expect(evidence).toBeDefined();
    expect(evidence!.publicCheck).toBeDefined();
    expect(evidence!.entityResearch).toBeDefined();
    expect(evidence!.publicCheck.summary).toMatch(/no credible public source/i);

    // Verify tick return shape
    expect(result).toMatchObject({
      clustersTriggered: 1,
      alertsCreated: 1,
      alertsSilenced: 0,
    });
  });

  it("Scenario 2: public coverage validation silences the alert", async () => {
    vi.resetModules();

    vi.doMock("@gcir/db", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@gcir/db")>();
      const signals = makeSignals();
      const EntityRelationship = {
        SHARES_REGISTERED_AGENT: "SHARES_REGISTERED_AGENT",
        SHARES_MAILING_ADDRESS: "SHARES_MAILING_ADDRESS",
        AFFILIATE_OF: "AFFILIATE_OF",
        ANALYST_LINKED: "ANALYST_LINKED",
      };
      const ProjectStage = {
        PUBLIC_ANNOUNCED: "PUBLIC_ANNOUNCED",
        WATCH: "WATCH",
        SITE_CONTROL: "SITE_CONTROL",
        ENTITY_FORMED: "ENTITY_FORMED",
        INCENTIVE_SURFACED: "INCENTIVE_SURFACED",
        PERMIT_SURFACED: "PERMIT_SURFACED",
        WETLANDS_WATERWAY_SURFACED: "WETLANDS_WATERWAY_SURFACED",
        UTILITY_SURFACED: "UTILITY_SURFACED",
        PORT_AGENDA_SURFACED: "PORT_AGENDA_SURFACED",
        FINANCING_SURFACED: "FINANCING_SURFACED",
        FID: "FID",
        EPC: "EPC",
        CONSTRUCTION: "CONSTRUCTION",
      };
      const Confidence = {
        HIGH: "HIGH",
        MEDIUM: "MEDIUM",
        LOW: "LOW",
      };
      const SignalFamily = {
        LAND_CONTROL: "LAND_CONTROL",
      };
      const ActionKind = {
        RESEARCH_ENTITY: "RESEARCH_ENTITY",
        VERIFY_SOURCE: "VERIFY_SOURCE",
        PUBLIC_RECORDS_PULL: "PUBLIC_RECORDS_PULL",
      };
      return {
        ...actual,
        EntityRelationship,
        ProjectStage,
        Confidence,
        SignalFamily,
        ActionKind,
        prisma: {
          signal: {
            findMany: vi.fn(async () => signals),
            updateMany: vi.fn(async () => ({ count: signals.length })),
          },
          entityLink: {
            findMany: vi.fn(async () => [
              { fromId: "e-1", toId: "e-2" },
              { fromId: "e-2", toId: "e-3" },
              { fromId: "e-3", toId: "e-4" },
              { fromId: "e-4", toId: "e-5" },
            ]),
          },
          entity: {
            findMany: vi.fn(async () =>
              ["e-1", "e-2", "e-3", "e-4", "e-5"].map((id) => ({ id, opacityScore: 0.82 })),
            ),
            findUnique: vi.fn(async ({ where }: { where: { id?: string } }) =>
              where.id ? { id: where.id } : null,
            ),
            create: vi.fn(async ({ data }: { data: { name: string } }) => ({ id: `entity-${data.name}` })),
          },
          project: {
            findFirst: vi.fn(async () => null),
            upsert: vi.fn(async () => ({ id: "prj-aurora-test", publicId: "PRJ-QLAD-test", score: 72 })),
          },
          site: {
            findFirst: vi.fn(async () => null),
            create: vi.fn(async () => ({ id: "site-aurora-test" })),
          },
          parcel: {
            upsert: vi.fn(async ({ where }: { where: { state_parishCounty_parcelNumber: { parcelNumber: string } } }) => ({
              id: `parcel-${where.state_parishCounty_parcelNumber.parcelNumber}`,
            })),
          },
          parcelInterest: {
            findFirst: vi.fn(async () => null),
            create: vi.fn(async () => ({ id: "pi-test" })),
          },
          alert: {
            upsert: vi.fn(async (args: unknown) => {
              lastUpsertedAlert = (args as { create: Record<string, unknown> }).create;
              alertUpsertCallCount++;
              return {
                id: "test-alert-id",
                publicCoverageFound: true,
                silencedAt: new Date(),
              };
            }),
          },
          recommendedAction: {
            count: vi.fn(async () => 0),
            createMany: vi.fn(async () => ({ count: 0 })),
          },
        },
      };
    });

    vi.doMock("../src/perplexity-client", () => {
      const PerplexityDisabledError = class extends Error {};
      return {
        PerplexityDisabledError,
        structured: vi.fn(async ({ schemaName }: { schemaName: string }) => {
          if (schemaName === "GcirPublicCoverageCheck") {
            return {
              data: {
                ...CANNED_PUBLIC_CHECK,
                publicCoverageFound: true,
                summary: "Aurora Steel publicly announced $2.1B direct reduction steelmill in Donaldsonville, LA.",
                confidence: 0.97,
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
            data: { ...CANNED_ENTITY_RESEARCH },
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

    vi.doMock("@gcir/agents", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@gcir/agents")>();
      return {
        ...actual,
        validateAssembly: vi.fn(async () => ({
          ...CANNED_VALIDATION_BASE,
          publicCoverageFound: true,
          publicCheck: {
            ...CANNED_VALIDATION_BASE.publicCheck,
            publicCoverageFound: true,
            summary: "Aurora Steel publicly announced $2.1B direct reduction steelmill in Donaldsonville, LA.",
            confidence: 0.97,
          },
        })),
        recommendActions: vi.fn(async () => []),
        PerplexityDisabledError: class extends Error {},
      };
    });

    const { tickQlad } = await import(
      "../../../apps/worker/src/jobs/qlad-evaluate"
    );

    const result = await tickQlad();

    expect(result.clustersTriggered).toBeGreaterThanOrEqual(1);

    expect(result.alertsSilenced).toBe(1);
    expect(result.alertsCreated).toBe(0);
  });
});
