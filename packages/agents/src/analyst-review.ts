/**
 * AnalystReviewAgent — supports merge / split / dismiss / escalate / watch /
 * false-positive workflows. The "agent" here mostly orchestrates DB state
 * transitions; the LLM only assists with merge-suggestion prompts when
 * two suspected projects look like the same site cluster.
 */

import { z } from "zod";
import { prisma, AnalystState } from "@gcir/db";
import { callBackend } from "./agent-backend";

export async function setReviewState(
  projectId: string,
  state: AnalystState,
  reviewerId?: string,
  note?: string,
): Promise<void> {
  await prisma.analystReview.create({
    data: { projectId, state, reviewerId, note },
  });
  if (state === AnalystState.FALSE_POSITIVE || state === AnalystState.DISMISSED) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "retired", retiredAt: new Date() },
    });
  }
}

const SuggestSchema = z.object({
  shouldMerge: z.boolean(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
});

const SYSTEM_PROMPT = `You decide whether two suspected projects are the same site cluster.

Inputs are two project summaries with parish, signal counts, and entity overlap.
Return shouldMerge=true only when the evidence supports a single underlying assembly.
Be conservative; analyst confirmation is required after.`;

export async function suggestMerge(projectAId: string, projectBId: string): Promise<{
  shouldMerge: boolean;
  reason: string;
  confidence: number;
}> {
  const [a, b] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectAId },
      include: { signals: { take: 6, orderBy: { observedAt: "desc" } } },
    }),
    prisma.project.findUnique({
      where: { id: projectBId },
      include: { signals: { take: 6, orderBy: { observedAt: "desc" } } },
    }),
  ]);
  if (!a || !b) throw new Error("suggestMerge: missing project");

  const block = (p: NonNullable<typeof a>) =>
    `${p.publicId} · ${p.name} · ${p.parishCounty} · stage ${p.stage} · score ${p.score}\nsignals:\n` +
    p.signals.map((s) => `  - [${s.family}] ${s.predicate} · ${s.subjectLabel}`).join("\n");

  const out = await callBackend({
    agent: "AnalystReview",
    systemPrompt: SYSTEM_PROMPT,
    user: `A:\n${block(a)}\n\nB:\n${block(b)}\n\nShould these be merged?`,
    schema: SuggestSchema,
    schemaName: "GcirMergeSuggest",
    temperature: 0.1,
    // Quality-control reasoning over already-collected agent outputs — needs
    // strong judgment but no fresh web data. gpt-5.4 (full, not mini) gives
    // the depth needed to catch subtle false-merge candidates.
    perplexity: { rawModel: "gpt5_4" },
  });
  return out.data;
}
