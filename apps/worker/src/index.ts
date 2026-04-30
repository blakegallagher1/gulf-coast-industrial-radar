/**
 * GCIR Worker — job scheduler entrypoint.
 *
 * Phase 3: adds qlad-evaluate job (every 20 minutes).
 */

import cron from "node-cron";
import { qladEvaluate } from "./jobs/qlad-evaluate";

const QLAD_SCHEDULE = process.env.QLAD_EVALUATE_SCHEDULE ?? "*/20 * * * *";

console.log(`[worker] QLAD evaluate schedule: ${QLAD_SCHEDULE}`);

cron.schedule(QLAD_SCHEDULE, async () => {
  console.log(`[qlad-evaluate] Starting at ${new Date().toISOString()}`);
  try {
    await qladEvaluate();
    console.log(`[qlad-evaluate] Done at ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`[qlad-evaluate] Error:`, err);
  }
});

console.log("[worker] Scheduler running.");
