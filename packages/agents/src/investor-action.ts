/**
 * InvestorActionAgent — produces 3-7 ranked, evidence-backed actions for an
 * investor / developer reviewing a Project. Mirrors the action vocabulary
 * in knowledge/product/investor-action-logic.md.
 *
 * Every action carries a reason code, confidence, and links back to the
 * concrete evidence that justifies it.
 */

import { z } from "zod";
import { prisma, ActionKind } from "@gcir/db";
import { callBackend } from "./agent-backend";

const SYSTEM_PROMPT = `You are an investment-action engine for Gulf Coast industrial land formation.

Given a project's signals and current score, produce 3-7 ranked actions for a real-estate
investor / developer. Each action must:
  - use one of these kinds: MAP_ADJACENT_PARCELS, IDENTIFY_OWNERS, ESTIMATE_ASSEMBLAGE_VALUE,
    CHECK_ZONING, CHECK_FLOOD_WETLANDS, CALL_BROKER_OWNER, MONITOR_NEXT_BOARD,
    PREPARE_OPTION_STRATEGY, PURSUE_ENTITLEMENT, PASS, ESCALATE_ANALYST
  - cite the specific signal(s) that support it
  - include a one-line "why this matters now" rationale grounded in stage and lead time
  - return a confidence 0..1 and a short reasonCode like "land-control + reachable owners"

Bias toward concrete, time-boxed actions. If the project is publicly announced and
overpriced, recommend PASS. If a high-impact conclusion (likely sponsor) is being asserted,
add an ESCALATE_ANALYST action so a human can confirm before external distribution.

Be honest when evidence is weak. Don't invent.`;

const ActionSchema = z.object({
  kind: z.enum([
    "MAP_ADJACENT_PARCELS",
    "IDENTIFY_OWNERS",
    "ESTIMATE_ASSEMBLAGE_VALUE",
    "CHECK_ZONING",
    "CHECK_FLOOD_WETLANDS",
    "CALL_BROKER_OWNER",
    "MONITOR_NEXT_BOARD",
    "PREPARE_OPTION_STRATEGY",
    "PURSUE_ENTITLEMENT",
    "PASS",
    "ESCALATE_ANALYST",
  ]),
  rank: z.number().int().min(1).max(20),
  title: z.string(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  reasonCode: z.string(),
  estTimeMin: z.number().int().min(0).max(24 * 60).nullable(),
});
const ActionsSchema = z.object({ actions: z.array(ActionSchema).min(1).max(7) });

export async function recommendActions(projectId: string): Promise<{ written: number }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      signals: { orderBy: { observedAt: "desc" }, take: 24 },
      sites: true,
    },
  });
  if (!project) throw new Error(`investor-action: missing ${projectId}`);

  const signalsBlock = project.signals
    .map(
      (s) =>
        `- [${s.family}] ${s.predicate} · "${s.subjectLabel}" · obs ${s.observedAt.toISOString().slice(0, 10)} · conf ${s.confidence.toFixed(2)}`,
    )
    .join("\n");

  const user = `PROJECT
  name:        ${project.name}
  stage:       ${project.stage}
  score:       ${project.score} / 100
  capex:       ${project.estimatedCapex ?? "?"}
  parish:      ${project.parishCounty ?? "?"} (${project.state ?? "?"})
  facility:    ${project.facilityType ?? "?"}
  firstSignal: ${project.firstSignalAt?.toISOString().slice(0, 10) ?? "?"}
  publicAnn:   ${project.publicAnnouncedAt?.toISOString().slice(0, 10) ?? "—"}

SIGNALS (most recent first):
${signalsBlock || "(none)"}

Return 3-7 ranked actions in priority order.`;

  const out = await callBackend({
    agent: "InvestorAction",
    systemPrompt: SYSTEM_PROMPT,
    user,
    schema: ActionsSchema,
    schemaName: "GcirInvestorActions",
    temperature: 0.3,
    // Action recommendations benefit from current web context (zoning maps,
    // recent filings, broker activity) — pro-search preset gives gpt-5.1
    // with web_search + fetch_url and a 3-step reasoning budget.
    perplexity: { preset: "reason" },
  });

  // Replace existing pending actions for this project
  await prisma.recommendedAction.deleteMany({
    where: { projectId, status: "pending" },
  });

  let written = 0;
  for (const a of out.data.actions) {
    await prisma.recommendedAction.create({
      data: {
        projectId,
        kind: a.kind as ActionKind,
        rank: a.rank,
        title: a.title,
        rationale: a.rationale,
        confidence: a.confidence,
        reasonCode: a.reasonCode,
        estTimeMin: a.estTimeMin ?? undefined,
      },
    });
    written++;
  }
  return { written };
}
