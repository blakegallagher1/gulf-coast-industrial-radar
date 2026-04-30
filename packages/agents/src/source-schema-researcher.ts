/**
 * SourceSchemaResearcher — dev-time utility that uses Perplexity Agent API
 * to research and recommend a data source schema (fields, types, sample
 * values) for a given Gulf Coast industrial data category.
 *
 * Usage:
 *   npx tsx packages/agents/scripts/research-sources.ts "port-authority-leases"
 *
 * Output: writes JSON to packages/agents/data/schemas/<slug>.json
 * and prints a Markdown summary to stdout.
 *
 * This is NOT a runtime agent — it runs once per data-source category
 * during development to bootstrap the Prisma schema and Zod validators.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import * as pplx from "./perplexity-client";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const FieldSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "date", "string[]", "number[]"]),
  description: z.string(),
  example: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  nullable: z.boolean(),
  sourceColumn: z.string().optional(),
});

const DataSourceSchemaResult = z.object({
  category: z.string(),
  description: z.string(),
  primaryKeyField: z.string(),
  fields: z.array(FieldSchema).min(3),
  sampleSources: z.array(z.string()).min(1),
  updateFrequency: z.enum(["realtime", "daily", "weekly", "monthly", "ad-hoc"]),
  notes: z.string().optional(),
});

export type DataSourceSchema = z.infer<typeof DataSourceSchemaResult>;

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function buildResearchPrompt(category: string): string {
  return [
    `You are a Gulf Coast industrial real-estate data architect.
`,
    `
`,
    `Research the data category: "${category}"
`,
    `
`,
    `Return a JSON object matching the DataSourceSchema schema:
`,
    `  category:         the normalised slug (lowercase-hyphen)
`,
    `  description:      one-sentence description of the data
`,
    `  primaryKeyField:  the best unique identifier field name
`,
    `  fields:           array of field definitions (at least 3)
`,
    `    name:           camelCase field name
`,
    `    type:           one of string | number | boolean | date | string[] | number[]
`,
    `    description:    what the field represents
`,
    `    example:        a realistic example value
`,
    `    nullable:       true if field may be absent
`,
    `    sourceColumn:   original column name in the source (if known)
`,
    `  sampleSources:    list of real public data sources (URLs or agency names)
`,
    `  updateFrequency:  one of realtime | daily | weekly | monthly | ad-hoc
`,
    `  notes:            any caveats or open questions (optional)
`,
  ].join("");
}

function schemaToMarkdown(schema: DataSourceSchema): string {
  const lines: string[] = [
    `# ${schema.category}`,
    ``,
    schema.description,
    ``,
    `**Primary key:** \`${schema.primaryKeyField}\`  `,
    `**Update frequency:** ${schema.updateFrequency}`,
    ``,
    `## Fields`,
    ``,
    `| Field | Type | Nullable | Description |`,
    `|-------|------|----------|-------------|`,
    ...schema.fields.map(
      (f) =>
        `| \`${f.name}\` | \`${f.type}\` | ${f.nullable ? "yes" : "no"} | ${f.description} |`,
    ),
    ``,
    `## Sample Sources`,
    ``,
    ...schema.sampleSources.map((s) => `- ${s}`),
  ];

  if (schema.notes) {
    lines.push(``, `## Notes`, ``, schema.notes);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface ResearchResult {
  schema: DataSourceSchema;
  markdown: string;
  outputPath: string;
}

/**
 * Research and persist a data source schema for the given category slug.
 *
 * @param category  e.g. "port-authority-leases", "industrial-permit-data"
 * @param outDir    directory to write the JSON schema (default: packages/agents/data/schemas)
 */
export async function researchSourceSchema(
  category: string,
  outDir = resolve(__dirname, "../../data/schemas"),
): Promise<ResearchResult> {
  const schema = await pplx.structured(
    DataSourceSchemaResult,
    buildResearchPrompt(category),
    "You are a strict data architect. Respond only with valid JSON. No markdown fences.",
  );

  const markdown = schemaToMarkdown(schema);

  mkdirSync(outDir, { recursive: true });
  const outputPath = resolve(outDir, `${schema.category}.json`);
  writeFileSync(outputPath, JSON.stringify(schema, null, 2), "utf8");

  return { schema, markdown, outputPath };
}
