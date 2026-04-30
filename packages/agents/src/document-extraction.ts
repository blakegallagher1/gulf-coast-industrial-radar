/**
 * DocumentExtractionAgent — pulls structured facts out of a RawDocument.
 * Inputs: rawDocumentId. Outputs: ExtractedClaim rows + (sometimes) updated
 * Project / Site / Parcel / Entity associations.
 *
 * Predicate vocabulary (canonical names; agents elsewhere consume these):
 *   land.transfer            { parcelNumber, acres, buyer, pricePerAcre, saleDate }
 *   land.option              { parcelNumber, acres, buyer, optionExpiry }
 *   permit.air.NOI           { facility, parish, NAICS, emissionsTPY }
 *   permit.water.NPDES       { facility, parish, dischargeKind }
 *   permit.wetlands.404      { applicant, parish, acresImpacted }
 *   incentive.itep.eligible  { applicant, parish, capexTier, jobs, NAICS }
 *   incentive.itep.approved  { applicant, parish, jobs, capexFinal }
 *   utility.interconnection  { applicant, substation, megawatts, requestedYear }
 *   entity.formed            { name, kind, registeredAgent, mailingState }
 *   sec.filing.{form}        { cik, company, filingDate, pageRefs[], capexCallouts }
 *   financing.bond.disclosure{ issuer, parish, notional, projectAlias }
 *   procurement.federal      { agency, naics, county, type }
 */

import { z } from "zod";
import { prisma } from "@gcir/db";
import { callBackend } from "./agent-backend";

const SYSTEM_PROMPT = `You extract structured facts from a single Gulf Coast industrial-formation source document.

Return ONLY facts present in the text. Do NOT infer beyond it. If a field is unknown, return null.
Use canonical predicate names: land.transfer, land.option, permit.air.NOI, permit.water.NPDES,
permit.wetlands.404, incentive.itep.eligible, incentive.itep.approved, utility.interconnection,
entity.formed, sec.filing, financing.bond.disclosure, procurement.federal.

Confidence (0..1): higher for direct quotations and named parties; lower for inferred values.
Always include a verbatim evidenceSpan from the text.

Geographies of interest (boost confidence when matched): Ascension, St. James, Iberville,
St. John the Baptist, St. Charles, Plaquemines, St. Bernard, East Baton Rouge, Calcasieu,
Cameron (LA + TX), Jefferson (TX), Mobile (AL), Pascagoula (Jackson MS).`;

const ClaimSchema = z.object({
  predicate: z.string(),
  subject: z.string().nullable(),
  value: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  reasonCode: z.string().nullable(),
  evidenceSpan: z.string(),
  documentDate: z.string().nullable(),
});

const ExtractionSchema = z.object({
  claims: z.array(ClaimSchema),
  projectName: z.string().nullable(),
  parishCounty: z.string().nullable(),
  state: z.string().nullable(),
});

export async function extractClaims(rawDocumentId: string): Promise<{ claims: number }> {
  const doc = await prisma.rawDocument.findUnique({ where: { id: rawDocumentId } });
  if (!doc) throw new Error(`extract: missing doc ${rawDocumentId}`);

  // Build a compact text view of the document
  const head = (doc.title ?? "") + "\n\n" + (doc.excerpt ?? "");
  const meta = JSON.stringify(doc.metadata ?? {}, null, 2);
  const corpus =
    head.length > 200
      ? head + "\n\nMETADATA:\n" + meta
      : meta;

  const out = await callBackend({
    agent: "DocumentExtraction",
    systemPrompt: SYSTEM_PROMPT,
    user: `URL: ${doc.url}\nObserved: ${doc.observedAt.toISOString()}\n\nDOCUMENT:\n${corpus}`,
    schema: ExtractionSchema,
    schemaName: "GcirDocumentExtraction",
    temperature: 0.1,
    // High volume + structured extraction over local doc text — no web search
    // needed. gpt-5.4-mini is the cheapest model that handles complex JSON
    // schemas reliably (~$0.05/run at our typical doc size).
    perplexity: { rawModel: "gpt5_4_mini" },
  });

  // Persist claims
  const claimsToWrite = out.data.claims.map((c) => ({
    rawDocumentId: doc.id,
    predicate: c.predicate,
    subject: c.subject ?? undefined,
    value: c.value as never,
    confidence: c.confidence,
    reasonCode: c.reasonCode ?? undefined,
    evidenceSpan: c.evidenceSpan,
    documentDate: c.documentDate ? new Date(c.documentDate) : null,
    observedDate: doc.observedAt,
  }));
  if (claimsToWrite.length > 0) {
    await prisma.extractedClaim.createMany({ data: claimsToWrite });
  }

  return { claims: claimsToWrite.length };
}
