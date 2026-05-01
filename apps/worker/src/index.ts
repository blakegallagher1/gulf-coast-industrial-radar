/**
 * Gulf Coast Industrial Radar — worker entry.
 *
 * Schedules:
 *   - source-watch         every 10m  · pulls all enabled adapters
 *   - evidence-archive     every 5m   · deepens stub RawDocuments
 *   - extraction           every 7m   · pulls ExtractedClaims off recent docs
 *   - scoring              every 15m  · rescore active projects
 *   - qlad-evaluate        every 20m  · runs Quiet Land Assembly Detector
 *                                       on new LAND_CONTROL signal clusters
 *                                       (gated on FEATURE_QLAD_LIVE_ALERTING +
 *                                       optional FEATURE_PERPLEXITY_VALIDATION)
 *   - actions              every 1h   · regenerate top-of-feed actions
 *   - brief                Mon 06:00  · weekly investor brief draft
 *   - budget-report        every 4h   · daily AgentRun cost rollup +
 *                                       Slack alert at ≥75% of daily cap
 */

import "dotenv/config";
import { Cron } from "croner";
import { prisma } from "@gcir/db";
import {
  runSourceWatch,
  deepenEvidenceBatch,
  extractClaims,
  runEntityResolution,
  scoreProjectById,
  rescoreAllProjects,
  recommendActions,
  writeWeeklyBrief,
} from "@gcir/agents";
import { tickQlad } from "./jobs/qlad-evaluate";
import { tickBudgetReport } from "./jobs/budget-report";

const enabled = (process.env.WORKER_CRON_ENABLED ?? "false") === "true";

async function tickSourceWatch() {
  const sources = await prisma.source.findMany({
    where: { status: { in: ["ACTIVE", "DEGRADED"] } },
    orderBy: { lastRunAt: { sort: "asc", nulls: "first" } },
    take: 4, // round-robin small batch
  });
  for (const s of sources) {
    try {
      const out = await runSourceWatch({ sourceSlug: s.slug });
      console.log(
        `[source-watch] ${s.slug} → seen=${out.recordsSeen} new=${out.recordsNew} ${out.notes ?? ""}`,
      );
    } catch (err) {
      console.error(`[source-watch] ${s.slug} failed:`, (err as Error).message);
    }
  }
}

async function tickEvidence() {
  const n = await deepenEvidenceBatch(8);
  if (n) console.log(`[evidence] deepened ${n}`);
}

async function tickExtraction() {
  const docs = await prisma.rawDocument.findMany({
    where: { extractedClaims: { none: {} } },
    orderBy: { observedAt: "desc" },
    take: 6,
  });
  for (const d of docs) {
    try {
      const r = await extractClaims(d.id);
      if (r.claims) console.log(`[extract] ${d.id} → ${r.claims} claims`);
    } catch (err) {
      console.error(`[extract] ${d.id} failed:`, (err as Error).message);
    }
  }
}

async function tickEntityResolution() {
  try {
    const out = await runEntityResolution({});
    if (out.deterministicLinks || out.agentSuggestedLinks) {
      console.log(
        `[entity] det=${out.deterministicLinks} agent=${out.agentSuggestedLinks}`,
      );
    }
  } catch (err) {
    console.error("[entity] failed:", (err as Error).message);
  }
}

async function tickScoring() {
  const actives = await prisma.project.findMany({
    where: { status: "suspected" },
    select: { id: true },
    take: 50,
  });
  for (const { id } of actives) {
    try {
      await scoreProjectById(id);
    } catch (err) {
      console.error(`[score] ${id} failed:`, (err as Error).message);
    }
  }
  console.log(`[score] rescored ${actives.length}`);
}

async function tickActions() {
  const top = await prisma.project.findMany({
    where: { status: "suspected", score: { gte: 60 } },
    orderBy: { score: "desc" },
    take: 12,
  });
  for (const p of top) {
    try {
      const out = await recommendActions(p.id);
      console.log(`[action] ${p.publicId} → ${out.written} actions`);
    } catch (err) {
      console.error(`[action] ${p.publicId} failed:`, (err as Error).message);
    }
  }
}

async function tickBrief() {
  try {
    const r = await writeWeeklyBrief();
    console.log(`[brief] wrote issue ${r.issueNumber}`);
  } catch (err) {
    console.error("[brief] failed:", (err as Error).message);
  }
}

async function bootstrap() {
  console.log("Gulf Coast Industrial Radar · worker starting");
  if (!enabled) {
    console.log("WORKER_CRON_ENABLED is false — running one-shot demo and exiting");
    await tickEvidence();
    await tickExtraction();
    await tickScoring();
    return;
  }

  new Cron("*/10 * * * *", { protect: true }, tickSourceWatch);
  new Cron("*/5 * * * *",  { protect: true }, tickEvidence);
  new Cron("*/7 * * * *",  { protect: true }, tickExtraction);
  new Cron("*/30 * * * *", { protect: true }, tickEntityResolution);
  new Cron("*/15 * * * *", { protect: true }, tickScoring);
  new Cron("*/20 * * * *", { protect: true }, tickQlad);
  new Cron("0 * * * *",    { protect: true }, tickActions);
  new Cron("0 6 * * 1",    { protect: true }, tickBrief);
  new Cron("0 */4 * * *",  { protect: true }, tickBudgetReport);

  console.log("✓ schedulers active. Press ^C to stop .");
}

bootstrap().catch((err) => {
  console.error("worker bootstrap failed:", err);
  process.exit(1);
});

// allow `pnpm --filter @gcir/worker exec rescore` style commands
export { rescoreAllProjects };
