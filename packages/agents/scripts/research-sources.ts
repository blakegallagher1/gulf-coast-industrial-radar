#!/usr/bin/env ts-node
/**
 * CLI entrypoint for the source-schema-researcher utility.
 *
 * Usage:
 *   npx ts-node packages/agents/scripts/research-sources.ts
 *   npx ts-node packages/agents/scripts/research-sources.ts --sources led-fastlane,la-sos
 *   npx ts-node packages/agents/scripts/research-sources.ts --output /tmp/research
 */

import path from "node:path";
import { researchAll } from "../src/source-schema-researcher";

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const rawSlugs = getArg("--sources");
const slugs = rawSlugs ? rawSlugs.split(",").map((s) => s.trim()) : undefined;

const outputDir =
  getArg("--output") ??
  path.resolve(__dirname, "../../../packages/adapters/src/research");

researchAll(outputDir, slugs)
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
