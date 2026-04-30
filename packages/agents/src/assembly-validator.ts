/**
 * AssemblyValidator — validates a parsed assembly object against
 * live source data fetched via Perplexity (balanced / pro-search preset).
 *
 * Usage:
 *   import { AssemblyValidator } from "./assembly-validator";
 *   const v = new AssemblyValidator();
 *   const result = await v.validate(assembly);
 */

import { z } from "zod";
import * as perplexity from "./perplexity-client";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const ValidationFindingSchema = z.object({
  field: z.string(),
  expected: z.unknown(),
  actual: z.unknown().optional(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});
export type ValidationFinding = z.infer<typeof ValidationFindingSchema>;

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  score: z.number().min(0).max(1),
  findings: z.array(ValidationFindingSchema),
  sources: z.array(z.string()),
  presetUsed: z.string(),
  latencyMs: z.number().optional(),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

const VALIDATION_SCHEMA = z.object({
  valid: z.boolean(),
  score: z.number().min(0).max(1),
  findings: z.array(ValidationFindingSchema),
  sources: z.array(z.string()),
});

const SYSTEM_PROMPT = `
You are a Gulf Coast industrial data validator. You are given a parsed assembly object
(JSON) and must verify its key fields against publicly available sources.

For each field, determine whether the value is:
  - correct: matches public records / databases
  - plausible but unverified: no contradicting evidence found
  - likely wrong: contradicts a reliable source
  - unknown: insufficient public data

Respond ONLY with valid JSON matching the provided schema.
`.trim();

export class AssemblyValidator {
  private readonly presetKey: perplexity.PresetKey;

  constructor(
    opts: {
      /**
       * Preset to use for validation calls.
       * Defaults to "balanced" (pro-search) — good accuracy / cost balance.
       * Was previously "fast" but pro-search gives better field verification.
       */
      preset?: perplexity.PresetKey;
    } = {}
  ) {
    this.presetKey = opts.preset ?? "balanced";
  }

  async validate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assembly: Record<string, any>
  ): Promise<ValidationResult> {
    const start = Date.now();
    const preset = perplexity.resolvePreset(this.presetKey);

    const prompt = [
      "Validate the following Gulf Coast industrial assembly object.",
      "Return a JSON object with valid, score (0–1), findings[], and sources[].",
      "",
      "Assembly JSON:",
      JSON.stringify(assembly, null, 2),
    ].join("\n");

    const raw = await perplexity.structured(prompt, VALIDATION_SCHEMA, {
      preset: this.presetKey,
      systemPrompt: SYSTEM_PROMPT,
    });

    return {
      ...raw,
      presetUsed: preset,
      latencyMs: Date.now() - start,
    };
  }
}
