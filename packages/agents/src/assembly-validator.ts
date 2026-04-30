/**
 * AssemblyValidator — Phase 3
 *
 * Two-step Perplexity Agent API validation for candidate assembly alerts:
 *
 * Step 1 (publicCheck): sonar-pro search for public project announcements
 *   that match the candidate cluster. Returns `publicCoverageFound` bool +
 *   list of citations.
 *
 * Step 2 (entityResearch): sonar-pro entity lookup for each unique company
 *   name in the cluster. Returns enriched entity metadata (sector, parent co,
 *   known Gulf Coast footprint).
 *
 * Results are merged into `supplementaryEvidence` on the Alert record.
 */

import { z } from "zod";
import { structured } from "./perplexity-client";
import { prisma } from "@gcir/db";

// ─── Schemas ─────────────────────────────────────────────────────────────

const PublicCheckSchema = z.object({
  publicCoverageFound: z.boolean(),
  confidence: z.number().min(0).max(1),
  projectName: z.string().optional(),
  announcementDate: z.string().optional(),
  estimatedValueUsd: z.number().optional(),
  summary: z.string(),
});

const EntityResearchSchema = z.object({
  entityName: z.string(),
  sector: z.string(),
  parentCompany: z.string().optional(),
  gulfCoastFootprint: z.boolean(),
  recentActivity: z.string(),
  confidence: z.number().min(0).max(1),
});

export type PublicCheckResult = z.infer<typeof PublicCheckSchema>;
export type EntityResearchResult = z.infer<typeof EntityResearchSchema>;

export type SupplementaryEvidence = {
  publicCheck: PublicCheckResult;
  publicCitations: { url: string; title?: string }[];
  entities: EntityResearchResult[];
  totalCostUsd: number;
  runAt: string;
};

// ─── Public API ────────────────────────────────────────────────────────────

export type ValidateInput = {
  /** Alert ID to enrich. */
  alertId: string;
  /** Human-readable cluster summary (from QLAD). */
  clusterSummary: string;
  /** Unique company names extracted from the signal cluster. */
  companyNames: string[];
  /** Primary parish / location. */
  location: string;
};

/**
 * Run AssemblyValidator for a QLAD alert and persist supplementaryEvidence.
 * Safe to call even if Perplexity is disabled (returns null, logs nothing).
 */
export async function validateAssembly(input: ValidateInput): Promise<SupplementaryEvidence | null> {
  let totalCost = 0;

  // Step 1 — public coverage check
  let publicCheck: PublicCheckResult;
  let publicCitations: { url: string; title?: string }[] = [];
  try {
    const res = await structured({
      agent: "AssemblyValidator.publicCheck",
      systemPrompt: [
        "You are a Gulf Coast industrial-project analyst.",
        "Given a signal cluster summary, determine whether there is credible public news coverage",
        "of an announced industrial project that matches this cluster.",
        "Be conservative: only return publicCoverageFound=true if you find a direct match.",
      ].join(" "),
      user: [
        `Signal cluster: ${input.clusterSummary}`,
        `Location: ${input.location}`,
        input.companyNames.length > 0 ? `Companies mentioned: ${input.companyNames.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      schema: PublicCheckSchema,
      schemaName: "PublicCheckResult",
      modelKey: "fast",
      tools: ["web_search"],
    });
    publicCheck = res.data;
    publicCitations = res.citations.map((c) => ({ url: c.url, title: c.title }));
    totalCost += res.costUsd;
  } catch (err) {
    // Perplexity disabled or budget exceeded — skip gracefully
    if ((err as Error).name === "PerplexityDisabledError" || (err as Error).name === "PerplexityBudgetExceededError") {
      return null;
    }
    throw err;
  }

  // Step 2 — entity research (one call per unique company, max 3)
  const entities: EntityResearchResult[] = [];
  const companies = input.companyNames.slice(0, 3);
  for (const company of companies) {
    try {
      const res = await structured({
        agent: "AssemblyValidator.entityResearch",
        systemPrompt:
          "You are an expert in Gulf Coast industrial companies. Research the given company and return structured metadata.",
        user: [
          `Company: ${company}`,
          `Context: This company appeared in a land-control signal cluster in ${input.location}.",
          "Provide sector, parent company (if any), whether they have known Gulf Coast industrial operations, and a brief summary of recent activity.",
        ].join("\n"),
        schema: EntityResearchSchema,
        schemaName: "EntityResearchResult",
        modelKey: "fast",
        tools: ["web_search"],
      });
      entities.push(res.data);
      totalCost += res.costUsd;
    } catch {
      // Individual entity lookup failure is non-fatal
    }
  }

  const evidence: SupplementaryEvidence = {
    publicCheck,
    publicCitations,
    entities,
    totalCostUsd: totalCost,
    runAt: new Date().toISOString(),
  };

  // Persist to Alert record
  await prisma.alert.update({
    where: { id: input.alertId },
    data: { supplementaryEvidence: evidence as never },
  });

  return evidence;
}
