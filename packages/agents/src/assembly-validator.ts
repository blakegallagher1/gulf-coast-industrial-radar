/**
 * AssemblyValidatorAgent — 2-step Perplexity pass on every Quiet Land Assembly
 * Detector trigger.
 *
 *   Step 1 — Public-announcement check (pro-search preset · gpt-5.1 · 3 steps · web_search + fetch_url):
 *     "Given a multi-LLC land assembly of <N> acres in <parish>, has any
 *      public news / sponsor disclosure / FERC docket / press release already
 *      explained this assembly?"
 *     → returns publicCoverageFound + citations.
 *
 *   Step 2 — Entity research (pro-search preset, batched per LLC):
 *     For each detected LLC + its registered agent:
 *     "What public corporate context exists — sister companies, news mentions,
 *      this agent's other client patterns?"
 *     → returns one entity report per LLC with citations.
 *
 * Findings attach to the Alert as supplementaryEvidence. If publicCoverage
 * is found, the alert is suppressed (silenced) per the spec's
 * "publicAnnouncementExplains" predicate; otherwise the alert publishes
 * with the validator findings as supplementary evidence.
 */

import { z } from "zod";
import { prisma } from "@gcir/db";
import { structured, type Citation, PerplexityDisabledError } from "./perplexity-client";

// ─── public types ──────────────────────────────────────────────────────────

export type ValidationInput = {
  /** The QLAD trigger that needs validation. */
  projectId: string;
  parishCounty: string;
  state: string;
  totalAcres: number;
  windowMonths: number;
  buyerEntityIds: string[];      // Entity ids in our DB
  /** Spatial bounding box of the assembled cluster (lat/lng pairs). */
  bbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number };
};

export type ValidationOutput = {
  publicCoverageFound: boolean;
  publicCheck: z|
    summary: string;
    confidence: number;
    citations: Citation[];
  };
  entityResearch: Array<{
    entityName: string;
    summary: string;
    sisterCompanies: string[];
    citations: Citation[];
  }>;
  totalCostUsd: number;
  modelMix: string[];
};

// ─── public API ────────────────────────────────────────────────────────────

const PublicCheckSchema = z.object({
  publicCoverageFound: z.boolean(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  evidenceQuotes: z.array(z.string()).max(5),
});

const EntityResearchSchema = z.object({
  entityName: z.string(),
  summary: z.string(),
  sisterCompanies: z.array(z.string()).max(20),
  redFlags: z.array(z.string()).max(20),
});

export async function validateAssembly(input: ValidationInput): Promise<ValidationOutput> {
  if (process.env.FEATURE_PERPLEXITY_VALIDATION !== "true") {
    throw new PerplexityDisabledError();
  }

  const buyers = await prisma.entity.findMany({
    where: { id: { in: input.buyerEntityIds } },
    select: { id: true, name: true, registeredAgent: true, mailingAddress: true, formedAt: true, kind: true },
  });

  // Step 1: public-announcement check
  const buyerList = buyers.map((b) => `${b.name} (${b.kind})`).join(", ");
  const publicSystem = `You are a senior CRE intelligence analyst checking whether a quiet land assembly has been publicly explained.

Decide whether ANY credible public source already explains the land control pattern. Sources to consider: news articles, press releases, SEC filings, FERC dockets, state Bond Commission agendas, Industrial Development Bond notices, USACE public notices, LDEQ permit announcements, sponsor capex slides, earnings transcripts.

Return strict JSON. Only set publicCoverageFound=true if a credible source explicitly identifies this site / project / sponsor with the same parish + acreage profile.`;

  const publicUser = `Multi-LLC land assembly under investigation:
  Parish:     ${input.parishCounty}, ${input.state}
  Acreage:    ${Math.round(input.totalAcres).toLocaleString()} acres
  Window:     ${input.windowMonths.toFixed(1)} months
  Entities:   ${buyerList}

Has any credible public source — news, SEC, FERC, Bond Commission, USACE, LDEQ, port commission, county agenda — explicitly explained this assembly? If yes, summarize the disclosure and cite. If no, say so explicitly.`;

  const publicCheck = await structured({
    agent: "AssemblyValidator.publicCheck",
    systemPrompt: publicSystem,
    user: publicUser,
    schema: PublicCheckSchema,
    schemaName: "GcirPublicCoverageCheck",
    // pro-search preset: openai/gpt-5.1, 3 reasoning steps, web_search + fetch_url
    modelKey: "reason",
    tools: ["web_search", "url_fetch"],
  });

  // Step 2: entity research (parallel, capped at 6 to control cost/time)
  const entityCap = Math.min(buyers.length, 6);
  const entityWork = await Promise.all(
    buyers.slice(0, entityCap).map(async (b) => {
      const entSystem = `You are doing background research on a Louisiana / Gulf Coast LLC that may be part of a coordinated industrial-land assembly.

Pull what's actually visible on the open web: state SOS records, news mentions, the registered agent's other client patterns, sister-company filings, prior real-estate transactions, litigation, principals when disclosed. Cite primary sources. If little is known, say so explicitly — do NOT invent.`;

      const entUser = `Entity: ${b.name}
  Kind:             ${b.kind}
  Registered agent: ${b.registeredAgent ?? "unknown"}
  Mailing address:  ${b.mailingAddress ?? "unknown"}
  Formed:           ${b.formedAt?.toISOString().slice(0, 10) ?? "unknown"}

Return what you know about this entity, its sister companies (LLCs sharing agent / address / officers), notable news mentions, and any red flags or opacity-busting evidence.`;

      try {
        const r = await structured({
          agent: `AssemblyValidator.entityResearch.${b.id}`,
          systemPrompt: entSystem,
          user: entUser,
          schema: EntityResearchSchema,
          schemaName: "GcirEntityResearch",
          // pro-search preset — same depth as the public-check pass
          modelKey: "reason",
          tools: ["web_search", "url_fetch"],
        });
        return {
          entityName: r.data.entityName || b.name,
          summary: r.data.summary,
          sisterCompanies: r.data.sisterCompanies,
          citations: r.citations,
          costUsd: r.costUsd,
          model: r.model,
        };
      } catch (err) {
        return {
          entityName: b.name,
          summary: `(research failed: ${(err as Error).message})`,
          sisterCompanies: [] as string[],
          citations: [] as Citation[],
          costUsd: 0,
          model: "error",
        };
      }
    }),
  );

  const totalCostUsd = publicCheck.costUsd + entityWork.reduce((s, e) => s + e.costUsd, 0);
  const modelMix = Array.from(
    new Set([publicCheck.model, ...entityWork.map((e) => e.model)]),
  );

  return {
    publicCoverageFound: publicCheck.data.publicCoverageFound,
    publicCheck: {
      summary: publicCheck.data.summary,
      confidence: publicCheck.data.confidence,
      citations: publicCheck.citations,
    },
    entityResearch: entityWork.map((e) => ({
      entityName: e.entityName,
      summary: e.summary,
      sisterCompanies: e.sisterCompanies,
      citations: e.citations,
    })),
    totalCostUsd,
    modelMix,
  };
}
