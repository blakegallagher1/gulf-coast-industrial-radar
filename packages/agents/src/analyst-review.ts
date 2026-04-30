/**
 * AnalystReviewAgent — supports merge / split / discard decisions for
 * candidate projects. Presents a structured recommendation that the analyst
 * confirms or overrides in the UI.
 */

import { z } from "zod";
import { openai } from "./openai-client";
import { MODEL } from "./openai-client";

const ReviewDecisionSchema = z.object({
  decision: z.enum(["MERGE", "SPLIT", "DISCARD", "KEEP"]),
  rationale: z.string().max(500),
  mergeTargetId: z.string().optional().describe("If MERGE, the target project ID to merge into"),
  splitGroups: z
    .array(z.object({ name: z.string(), signalIds: z.array(z.string()) }))
    .optional()
    .describe("If SPLIT, the proposed sub-project groupings"),
  confidence: z.number().min(0).max(1),
});

export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

export async function runAnalystReviewAgent(input: {
  project: Record<string, unknown>;
  candidateProjects: Record<string, unknown>[];
  signals: Record<string, unknown>[];
}): Promise<ReviewDecision> {
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an industrial real-estate intelligence analyst. You review candidate projects and recommend whether to merge, split, discard, or keep them as separate intelligence items.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    response_format: zodResponseFormat(ReviewDecisionSchema, "review_decision"),
  });
  return completion.choices[0].message.parsed!;
}

function zodResponseFormat<T extends z.ZodTypeAny>(schema: T, name: string) {
  return { type: "json_schema" as const, json_schema: { name, schema: schema._def, strict: true } };
}
