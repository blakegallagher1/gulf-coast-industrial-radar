#!/usr/bin/env tsx
/**
 * CLI script: research a list of Gulf Coast industrial data sources
 * and print their inferred JSON schemas.
 *
 * Usage:
 *   pnpm tsx packages/agents/scripts/research-sources.ts [--preset fast|balanced|deep]
 *
 * Calls the Perplexity Agent API via SourceSchemaResearcher.
 * Default preset: balanced (pro-search, ~$0.005/source).
 */

import { SourceSchemaResearcher } from "../src/source-schema-researcher";
import type { PresetKey } from "../src/perplexity-client";

const SOURCES = [
  { name: "EPA TRI Form R", url: "https://www.epa.gov/toxics-release-inventory-tri-program" },
  { name: "TCEQ Air Quality Permits", url: "https://www.tceq.texas.gov/airquality/permits" },
  { name: "BOEM Gulf of Mexico Lease Sales", url: "https://www.boem.gov/oil-gas-energy/leasing" },
  { name: "EIA-914 Natural Gas Production Report" },
  { name: "PHMSA Hazmat Incident Reports" },
];

async function main() {
  const presetArg = process.argv.find((a) => a.startsWith("--preset="));
  const preset = (presetArg?.split("=")[1] ?? "balanced") as PresetKey;

  console.log(`\nResearching ${SOURCES.length} sources with preset: ${preset}\n`);

  const researcher = new SourceSchemaResearcher({ preset });
  const schemas = await researcher.inferSchemas(SOURCES);

  for (const s of schemas) {
    console.log(`\n--- ${s.title} (confidence: ${s.confidence}) ---`);
    console.log(JSON.stringify(s.schema, null, 2));
    if (s.notes) console.log(`Notes: ${s.notes}`);
    if (s.sources.length) console.log(`Sources: ${s.sources.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
