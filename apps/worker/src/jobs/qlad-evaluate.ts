/**
 * qlad-evaluate worker job
 *
 * Scheduled every 20 minutes (QLAD_EVALUATE_SCHEDULE env, default "*/20 * * * *").
 *
 * Steps:
 *   1. Fetch LAND_CONTROL signals created in the last 25 minutes (5-min overlap).
 *   2. Cluster by projectId.
 *   3. For each cluster, run QladDetector.
 *   4. If detector fires, upsert an Alert (type LAND_CONTROL_ASSEMBLY).
 *   5. Enqueue AssemblyValidator (non-blocking) for each new alert.
 */

import { prisma } from "@gcir/db";
import { runQladDetector } from "@gcir/agents";
import { validateAssembly } from "@gcir/agents";

export const QLAD_JOB_NAME = "qlad-evaluate";

export async function qladEvaluate(): Promise<void> {
  const windowStart = new Date(Date.now() - 25 * 60 * 1000);

  // 1. Fetch recent LAND_CONTROL signals
  const signals = await prisma.signal.findMany({
    where: {
      type: "LAND_CONTROL",
      createdAt: { gte: windowStart },
    },
    include: { project: true },
  });

  if (signals.length === 0) return;

  // 2. Cluster by projectId
  const byProject = new Map<string, typeof signals>();
  for (const sig of signals) {
    const arr = byProject.get(sig.projectId) ?? [];
    arr.push(sig);
    byProject.set(sig.projectId, arr);
  }

  for (const [projectId, cluster] of byProject) {
    // 3. Run QLAD detector
    const result = await runQladDetector(cluster);
    if (!result.fired) continue;

    // 4. Upsert Alert
    // Use a deterministic ID based on projectId + detection window start
    const windowKey = Math.floor(Date.now() / (20 * 60 * 1000)); // 20-min bucket
    const alertId = `qlad-${projectId}-${windowKey}`;

    const companyNames = [
      ...new Set(
        cluster
          .map((s) => (s.normalised as Record<string, unknown>)["grantee"] as string | undefined)
          .filter((n): n is string => Boolean(n)),
      ),
    ];

    const alert = await prisma.alert.upsert({
      where: { id: alertId },
      create: {
        id: alertId,
        projectId,
        type: "LAND_CONTROL_ASSEMBLY",
        severity: result.severity ?? "medium",
        summary: result.summary,
        detail: result.detail as never,
        status: "open",
      },
      update: {
        severity: result.severity ?? "medium",
        summary: result.summary,
        detail: result.detail as never,
      },
    });

    // 5. Enqueue AssemblyValidator (fire-and-forget, non-blocking)
    validateAssembly({
      alertId: alert.id,
      clusterSummary: result.summary,
      companyNames,
      location: result.location ?? "Gulf Coast, Louisiana",
    }).catch((err) => {
      console.error(`[qlad-evaluate] AssemblyValidator failed for alert ${alert.id}:`, err);
    });
  }
}
