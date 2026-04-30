/**
 * EntityResolutionAgent — links shell LLCs, subsidiaries, and SPEs to known
 * parent companies or industrial project types.
 */

import { z } from "zod";
import { openai, MODEL } from "./openai-client";

const EntityResolutionSchema = z.object({
  resolvedName: z.string(),
  parentCompany: z.string().optional(),
  industry: z.string().optional(),
  isShellEntity: z.boolean(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(300),
});

export type EntityResolution = z.infer<typeof EntityResolutionSchema>;

export async function runEntityResolutionAgent(input: {
  entityName: string;
  registrationState?: string;
  registeredAgent?: string;
  knownEntities?: string[];
}): Promise<EntityResolution> {
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a corporate intelligence agent specializing in Gulf Coast industrial real estate. Resolve entity names to known parent companies and flag shell entities used in land assembly.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "entity_resolution",
        schema: EntityResolutionSchema._def,
        strict: true,
      },
    },
  });
  return completion.choices[0].message.parsed!;
}
