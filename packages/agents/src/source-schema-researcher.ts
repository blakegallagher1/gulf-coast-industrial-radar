/**
 * SourceSchemaResearcher — uses Perplexity to infer the JSON schema
 * of an industrial data source from its documentation / public spec.
 *
 * Usage (CLI / pipeline):
 *   import { SourceSchemaResearcher } from "./source-schema-researcher";
 *   const r = new SourceSchemaResearcher();
 *   const schema = await r.inferSchema("EPA TRI Form R", "https://...");
 *
 * Calls the Perplexity Agent API via the helper in `perplexity-client.ts`.
 * Uses the "balanced" preset by default (pro-search, ~$0.005/call).
 * Switch to "deep" for complex / poorly documented sources.
 */

import { z } from "zod";
import * as perplexity from "./perplexity-client";

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

const JsonSchemaNodeSchema: z.ZodType<JsonSchemaNode> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    description: z.string().optional(),
    properties: z.record(JsonSchemaNodeSchema).optional(),
    items: JsonSchemaNodeSchema.optional(),
    required: z.array(z.string()).optional(),
    enum: z.array(z.unknown()).optional(),
    format: z.string().optional(),
    examples: z.array(z.unknown()).optional(),
  })
);

export interface JsonSchemaNode {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  required?: string[];
  enum?: unknown[];
  format?: string;
  examples?: unknown[];
}

export const InferredSchemaSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  schema: JsonSchemaNodeSchema,
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
  sources: z.array(z.string()),
});
export type InferredSchema = z.infer<typeof InferredSchemaSchema>;

// ---------------------------------------------------------------------------
// Researcher
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are an expert in industrial data formats and regulatory reporting schemas.
Given a data source name and optional URL, infer the likely JSON schema for records
from that source, drawing on publicly available documentation, regulatory filings,
and industry standards.

Include:
  - Top-level fields with their types and descriptions
  - Nested objects / arrays where appropriate
  - Required fields
  - Any enumerated values for categorical fields
  - Confidence score (0–1) based on available documentation quality

Respond ONLY with valid JSON matching the provided schema.
`.trim();

export class SourceSchemaResearcher {
  private readonly presetKey: perplexity.PresetKey;

  constructor(
    opts: {
      /**
       * Preset key to use. Defaults to "balanced" (pro-search).
       * Use "deep" for obscure or poorly documented sources.
       */
      preset?: perplexity.PresetKey;
    } = {}
  ) {
    this.presetKey = opts.preset ?? "balanced";
  }

  async inferSchema(
    sourceName: string,
    sourceUrl?: string
  ): Promise<InferredSchema> {
    const parts = [
      `Infer the JSON schema for records from the following industrial data source:`,
      `Name: ${sourceName}`,
    ];
    if (sourceUrl) {
      parts.push(`URL: ${sourceUrl}`);
    }
    parts.push(
      "",
      "Return a JSON object with: title, description, schema, confidence, notes, sources."
    );

    const prompt = parts.join("\n");

    return perplexity.structured(prompt, InferredSchemaSchema, {
      preset: this.presetKey,
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  /**
   * Research multiple sources in parallel (capped at 3 concurrent to stay
   * within the Perplexity rate limit).
   */
  async inferSchemas(
    sources: Array<{ name: string; url?: string }>,
    concurrency = 3
  ): Promise<InferredSchema[]> {
    const results: InferredSchema[] = [];
    for (let i = 0; i < sources.length; i += concurrency) {
      const batch = sources.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((s) => this.inferSchema(s.name, s.url))
      );
      results.push(...batchResults);
    }
    return results;
  }
}
