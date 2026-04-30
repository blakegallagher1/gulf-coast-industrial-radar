/**
 * DocumentExtractionAgent — pulls structured signals from a raw document.
 *
 * Accepts PDF text, HTML, or plain text. Returns a typed array of signal
 * candidates. Used downstream by source-watcher and evidence-archive.
 */

import { z } from "zod";
import { openai, MODEL } from "./openai-client";

const SignalCandidateSchema = z.object({
  type: z.enum(["PERMIT", "FILING", "PARCEL", "REGULATORY", "PROCUREMENT", "BOND", "CORPORATE", "MEDIA"]),
  title: z.string().max(200),
  summary: z.string().max(500),
  parish: z.string().optional(),
  county: z.string().optional(),
  state: z.string().length(2).default("LA"),
  industry: z.string().optional(),
  investmentUsd: z.number().int().optional(),
  jobsCreated: z.number().int().optional(),
  confidence: z.number().min(0).max(1),
  signalDate: z.string().optional().describe("ISO 8601 date"),
});

const ExtractionResultSchema = z.object({
  signals: z.array(SignalCandidateSchema),
  rawSummary: z.string().max(500),
});

export type SignalCandidate = z.infer<typeof SignalCandidateSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export async function runDocumentExtractionAgent(input: {
  documentText: string;
  sourceSlug: string;
  sourceUrl: string;
}): Promise<ExtractionResult> {
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an industrial intelligence extraction agent. Extract structured signals from the given document. Focus on permits, corporate filings, land transactions, procurement notices, and regulatory actions related to Gulf Coast industrial development (LA, TX, MS, AL). Return only high-confidence signals.",
      },
      {
        role: "user",
        content: `Source: ${input.sourceSlug} (${input.sourceUrl})\n\n${input.documentText.slice(0, 12000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extraction_result",
        schema: ExtractionResultSchema._def,
        strict: true,
      },
    },
  });
  return completion.choices[0].message.parsed!;
}
