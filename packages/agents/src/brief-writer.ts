/**
 * BriefWriterAgent — produces the weekly investment brief for a project.
 *
 * Uses GPT-4o structured outputs to generate a typed brief object that
 * maps 1:1 to the Brief model in the DB schema.
 */

import { z } from "zod";
import { openai, MODEL } from "./openai-client";

const BriefSchema = z.object({
  title: z.string().max(140),
  executiveSummary: z.string().max(2000),
  keySignals: z.array(
    z.object({
      signalId: z.string(),
      headline: z.string(),
      significance: z.string(),
    }),
  ),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  recommendedActions: z.array(
    z.object({
      action: z.string(),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
      dueDate: z.string().optional(),
    }),
  ),
});

export type BriefOutput = z.infer<typeof BriefSchema>;

export async function runBriefWriterAgent(input: {
  project: Record<string, unknown>;
  signals: Record<string, unknown>[];
  previousBrief?: Record<string, unknown>;
}): Promise<BriefOutput> {
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a Gulf Coast industrial real-estate intelligence analyst. Write a concise, action-oriented weekly brief for the given industrial project. Focus on what’s new, what it means for site acquisition strategy, and what actions the analyst should take this week.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "weekly_brief",
        schema: BriefSchema._def,
        strict: true,
      },
    },
  });
  return completion.choices[0].message.parsed!;
}
