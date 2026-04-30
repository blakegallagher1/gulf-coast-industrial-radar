/**
 * ProjectFormationScoringAgent — recomputes the formation score for a project
 * using the scoring engine + AI-enhanced interpretation.
 *
 * Returns both a raw numeric score and an AI-written interpretation.
 */

import { z } from "zod";
import { openai, MODEL } from "./openai-client";
import { scoreProjectFormation } from "@gcir/scoring";
import type { ProjectFormationInput } from "@gcir/scoring";

const ScoringInterpretationSchema = z.object({
  scoreInterpretation: z.string().max(400),
  topFactors: z.array(z.string()).max(5),
  nextSignalsToWatch: z.array(z.string()).max(5),
});

export type ScoringInterpretation = z.infer<typeof ScoringInterpretationSchema>;

export async function runProjectFormationScoringAgent(input: {
  projectId: string;
  scoringInput: ProjectFormationInput;
  projectName: string;
}): Promise<{ score: number; interpretation: ScoringInterpretation }> {
  const result = scoreProjectFormation(input.scoringInput);

  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a Gulf Coast industrial development analyst. Interpret this project formation scoring result and explain what the scores mean for an investor.",
      },
      {
        role: "user",
        content: JSON.stringify({ projectName: input.projectName, scoringResult: result }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scoring_interpretation",
        schema: ScoringInterpretationSchema._def,
        strict: true,
      },
    },
  });

  return {
    score: result.score,
    interpretation: completion.choices[0].message.parsed!,
  };
}
