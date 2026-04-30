/**
 * AssemblyValidatorAgent — 2-step Perplexity pass on every Quiet Land Assembly
 * district that meets the qlad-pipeline threshold.
 *
 * Step 1 – structured(): Validate structured fields (acreage, zoning,
 *   utilities, entitlement status) against public records.
 * Step 2 – text(): Enrich with a freeform research note (recent permits,
 *   owner history, market comps).
 *
 * The validated/enriched assembly is written back to the DB and a
 * ValidationResult row is created for audit.
 */

import { z } from "zod";
import { prisma } from "@gcir/db";
import * as pplx from "./perplexity-client";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const AssemblySchema = z.object({
  id: z.string().uuid(),
  districtName: z.string(),
  totalAcreage: z.number().positive(),
  zoningCodes: z.array(z.string()),
  utilityStatus: z.enum(["available", "nearby", "unavailable", "unknown"]),
  entitlementStatus: z.enum(["entitled", "pending", "unentitled", "unknown"]),
  lastSaleDate: z.string().nullable(),
  ownerCount: z.number().int().nonnegative(),
});

type Assembly = z.infer<typeof AssemblySchema>;

const ValidationResultSchema = z.object({
  fieldErrors: z.record(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function buildStructuredPrompt(assembly: Assembly): string {
  return [
    `You are a commercial real-estate data validator.
`,
    `Validate the following Quiet Land Assembly district record against public
`,
    `county records, GIS data, and permit databases. Return JSON matching the
`,
    `ValidationResult schema.
`,
    `
`,
    `Record:
`,
    JSON.stringify(assembly, null, 2),
    `
`,
    `Schema fields:
`,
    `  fieldErrors: object mapping field name → error description (omit if valid)
`,
    `  confidence:  float 0–1 reflecting overall data quality
`,
    `  notes:       brief plain-text summary (optional)
`,
  ].join("");
}

function buildEnrichmentPrompt(assembly: Assembly): string {
  return [
    `Research the following Gulf Coast industrial land assembly and return a
`,
    `concise paragraph (3–5 sentences) covering:
`,
    `  - Recent permit activity (last 24 months)
`,
    `  - Known ownership consolidation history
`,
    `  - Comparable industrial land sales in the submarket
`,
    `
`,
    `Assembly: ${assembly.districtName} (${assembly.totalAcreage} ac)
`,
    `Zoning: ${assembly.zoningCodes.join(", ")}
`,
    `Entitlement: ${assembly.entitlementStatus}
`,
  ].join("");
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export interface AssemblyValidatorResult {
  assemblyId: string;
  validation: ValidationResult;
  enrichmentNote: string;
  durationMs: number;
}

/**
 * Validate and enrich a single assembly record.
 * Writes a ValidationResult row and updates the Assembly's `validated` flag.
 */
export async function validateAssembly(
  assemblyId: string,
): Promise<AssemblyValidatorResult> {
  const t0 = Date.now();

  // Fetch from DB
  const row = await prisma.assembly.findUniqueOrThrow({
    where: { id: assemblyId },
    select: {
      id: true,
      districtName: true,
      totalAcreage: true,
      zoningCodes: true,
      utilityStatus: true,
      entitlementStatus: true,
      lastSaleDate: true,
      ownerCount: true,
    },
  });

  const assembly = AssemblySchema.parse(row);

  // Step 1 — structured validation
  const validation = await pplx.structured(
    ValidationResultSchema,
    buildStructuredPrompt(assembly),
    "You are a strict commercial real-estate data auditor. Respond only with valid JSON.",
  );

  // Step 2 — freeform enrichment
  const enrichmentNote = await pplx.text(
    buildEnrichmentPrompt(assembly),
    "You are a Gulf Coast industrial real-estate analyst. Be concise and factual.",
  );

  const durationMs = Date.now() - t0;

  // Persist ValidationResult
  await prisma.validationResult.create({
    data: {
      assemblyId,
      confidence: validation.confidence,
      fieldErrors: validation.fieldErrors ?? {},
      notes: validation.notes ?? "",
      enrichmentNote,
      durationMs,
    },
  });

  // Mark assembly validated
  await prisma.assembly.update({
    where: { id: assemblyId },
    data: { validated: true, validatedAt: new Date() },
  });

  return { assemblyId, validation, enrichmentNote, durationMs };
}

/**
 * Batch-validate all assemblies that have not yet been validated.
 * Returns results in insertion order.
 */
export async function validatePendingAssemblies(): Promise<
  AssemblyValidatorResult[]
> {
  const pending = await prisma.assembly.findMany({
    where: { validated: false },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const results: AssemblyValidatorResult[] = [];
  for (const { id } of pending) {
    results.push(await validateAssembly(id));
  }
  return results;
}
