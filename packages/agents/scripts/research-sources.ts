#!/usr/bin/env tsx
/**
 * scripts/research-sources.ts — orchestrator that runs SourceSchemaResearcher
 * for one or more data categories provided as CLI args.
 *
 * Usage:
 *   npx tsx packages/agents/scripts/research-sources.ts \
 *     port-authority-leases industrial-permit-data heavy-haul-corridors
 */

import { researchSourceSchema } from "../src/source-schema-researcher";

const categories = process.argv.slice(2);

if (categories.length === 0) {
  console.error(
    "Usage: research-sources.ts <category> [<category> ...]\n" +
      'Example: research-sources.ts port-authority-leases industrial-permit-data',
  );
  process.exit(1);
}

(async () => {
  for (const cat of categories) {
    console.log(`\n## Researching: ${cat}`);
    try {
      const { markdown, outputPath } = await researchSourceSchema(cat);
      console.log(markdown);
      console.log(`\n✓ Written to ${outputPath}`);
    } catch (err) {
      console.error(`Error researching ${cat}:`, err);
      process.exitCode = 1;
    }
  }
})();
