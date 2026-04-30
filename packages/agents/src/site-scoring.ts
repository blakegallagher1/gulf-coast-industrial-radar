/**
 * SiteScoringAgent — applies the site-fit scoring engine and interprets the result.
 */

import { z } from "zod";
import { openai, MODEL } from "./openai-client";
import { scoreSiteFit } from "@gcir/scoring";
import type { SiteFitInput } from "@gcir/scoring";

const SiteScoringOutputSchema = z.object({
  interpretation: z.string().max(400),
  keyStrengths: z.array(z.string()).max(5),
  keyWeaknesses: z.array(z.string()).max(5),
  recommendedUseTypes: z.array(z.string()).max(5),
});

export type SiteScoringOutput = z.infer<typeof SiteScoringOutputSchema>;

export async function runSiteScoringAgent(input: {
  siteFitInput: SiteFitInput;
  locationDescription: string;
}): Promise<{ score: number; output: SiteScoringOutput }> {
  const result = scoreSiteFit(input.siteFitInput);

  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a Gulf Coast industrial site analyst. Interpret this site fitness score for an industrial real-estate investor.",
      },
      {
        role: "user",
        content: JSON.stringify({ location: input.locationDescription, result }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "site_scoring_output",
        schema: SiteScoringOutputSchema._def,
        strict: true,
      },
    },
  });

  return { score: result.score, output: completion.choices[0].message.parsed! };
}
