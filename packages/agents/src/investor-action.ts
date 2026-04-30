/**
 * InvestorActionAgent — produces 3-7 ranked, concrete next actions for a
 * real-estate investor based on the current project state and brief.
 */

import { z } from "zod";
import { openai, MODEL } from "./openai-client";

const ActionSchema = z.object({
  rank: z.number().int().min(1).max(7),
  action: z.string().max(200),
  rationale: z.string().max(300),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  category: z.enum(["SITE", "LEGAL", "FINANCIAL", "INTELLIGENCE", "RELATIONSHIP"]),
  dueDate: z.string().optional().describe("ISO 8601 date"),
});

const ActionListSchema = z.object({
  actions: z.array(ActionSchema).min(3).max(7),
});

export type InvestorAction = z.infer<typeof ActionSchema>;

export async function runInvestorActionAgent(input: {
  project: Record<string, unknown>;
  brief?: Record<string, unknown>;
  signals: Record<string, unknown>[];
}): Promise<InvestorAction[]> {
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a Gulf Coast industrial real-estate investment strategist. Produce 3 to 7 ranked, concrete next actions for an investor tracking this project. Each action should be specific, time-bound where possible, and categorized.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "investor_action_list",
        schema: ActionListSchema._def,
        strict: true,
      },
    },
  });
  return completion.choices[0].message.parsed!.actions;
}
