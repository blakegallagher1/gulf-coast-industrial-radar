#!/usr/bin/env tsx
/**
 * scripts/research-sources.ts — orchestrator that runs SourceSchemaResearcher
 * against every (or one) source profile and writes markdown artifacts.
 *
 * Usage:
 *   pnpm research:sources                       # all 14, fast-search preset
 *   pnpm research:sources -- --slug ldeq-edms   # one source
 *   pnpm research:sources -- --quality deep     # all 14, deep-research preset
 */

import { researchSource, SOURCE_PROFILES } from "../src/source-schema-researcher";

async function main() {
  const args = process.argv.slice(2);
  const slugArg = arg(args, "--slug");
  const qualityArg = arg(args, "--quality") as "deep" | "fast" | undefined;

  const slugs = slugArg ? [slugArg] : SOURCE_PROFILES.map((p) => p.slug);
  const quality = qualityArg ?? "fast";

  console.log(`Researching ${slugs.length} source(s) with model preset '${quality}'…`);
  let totalCost = 0;
  for (const slug of slugs) {
    process.stdout.write(`  · ${slug.padEnd(28)} `);
    try {
      const r = await researchSource({ slug, quality });
      totalCost += r.costUsd;
      console.log(`✓  ${r.cached ? "cached" : `${(r.costUsd).toFixed(3)}$`}  ${r.filePath}`);
    } catch (err) {
      console.log(`✗  ${(err as Error).message}`);
    }
  }
  console.log(`\nTotal cost: $${totalCost.toFixed(2)}`);
}

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  return argv[i + 1];
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
