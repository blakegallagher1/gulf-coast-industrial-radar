/**
 * EvidenceArchiveAgent — fetches the full content of a source URL,
 * stores it to the evidence store, and returns a structured summary.
 */

import { z } from "zod";
import { openai, MODEL } from "./openai-client";
import { fetchWithRetry } from "@gcir/adapters";
import { saveEvidence } from "@gcir/adapters";
import type { AdapterRecord } from "@gcir/adapters";

const EvidenceSummarySchema = z.object({
  title: z.string(),
  excerpt: z.string().max(500),
  documentType: z.string(),
  relevanceScore: z.number().min(0).max(1),
});

export type EvidenceSummary = z.infer<typeof EvidenceSummarySchema>;

export async function runEvidenceArchiveAgent(input: {
  sourceUrl: string;
  sourceSlug: string;
  projectContext?: string;
}): Promise<EvidenceSummary & { evidenceUri: string }> {
  const res = await fetchWithRetry(input.sourceUrl, {
    timeoutMs: 30_000,
    userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
  });
  const text = await res.text();
  const mime = res.headers.get("content-type") ?? "text/html";

  // Store raw bytes
  const mockRecord: AdapterRecord = {
    externalId: `evidence:${input.sourceUrl}`,
    family: "EVIDENCE",
    predicate: "evidence.archived",
    subjectLabel: input.sourceUrl,
    observedAt: new Date(),
    confidence: 1,
    url: input.sourceUrl,
    rawBytes: text,
    rawMime: mime,
    payload: {},
  };
  const evidenceRef = await saveEvidence(mockRecord);

  // Summarise via GPT-4o
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Summarise the industrial intelligence content from this document. Extract the title, a useful excerpt, document type, and relevance to Gulf Coast industrial development.",
      },
      {
        role: "user",
        content: `URL: ${input.sourceUrl}\n\nContext: ${input.projectContext ?? "general"}\n\n${text.slice(0, 10000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "evidence_summary",
        schema: EvidenceSummarySchema._def,
        strict: true,
      },
    },
  });

  const summary = completion.choices[0].message.parsed!;
  return { ...summary, evidenceUri: evidenceRef.uri };
}
