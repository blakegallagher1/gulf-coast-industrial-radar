/**
 * BriefWriterAgent — produces the weekly investor brief.
 *
 * Inputs: window (start..end), top movers, source health.
 * Outputs: Brief row with narrative, top movers, recommended actions, and
 * source health rendered. The brief is held for analyst review before send.
 */

import { z } from "zod";
import { prisma } from "@gcir/db";
import { callBackend } from "./agent-backend";

const SYSTEM_PROMPT = `You write the weekly Gulf Coast Industrial Radar investor brief.

Voice: South Louisiana operator's right hand. Methodical. Lead with the answer.
Prove with numbers. Defend with frameworks. No hype. No fluff.

Structure:
  1. Title — punchy lede tied to the most consequential move of the week.
  2. Subtitle — date range + count of corridors flagged + alerts moved.
  3. Top movers — ranked, each with score and delta.
  4. What changed this week — 2-3 paragraphs of analyst narrative weaving the moves.
  5. Recommended actions — 3-5 ranked, time-boxed, evidence-backed.
  6. Source health — ack any degraded sources.

Mention specific entities, parcel numbers, dockets, and dates. Cite the project's
public id (PRJ-...). When a project is publicly announced and overpriced, recommend a PASS.`;

const BriefSchema = z.object({
  title: z.string(),
  narrative: z.string(),
  topMovers: z.array(
    z.object({
      publicId: z.string(),
      name: z.string(),
      stage: z.string(),
      score: z.number(),
      delta: z.number(),
      headline: z.string(),
    }),
  ),
  recommendedActions: z.array(
    z.object({
      rank: z.number(),
      title: z.string(),
      why: z.string(),
      timeBudgetMin: z.number().nullable(),
    }),
  ),
});

export async function writeWeeklyBrief(window?: { start: Date; end: Date }): Promise<{ briefId: string; issueNumber: number }> {
  const end = window?.end ?? new Date();
  const start = window?.start ?? new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

  const followedWatchlists = await prisma.watchlist.findMany({
    where: {
      AND: [
        { filter: { path: ["followed"], equals: true } },
        { filter: { path: ["deliveryMode"], equals: "weekly_brief" } },
      ],
    },
    select: {
      id: true,
      name: true,
      items: {
        select: {
          project: {
            select: {
              id: true,
              publicId: true,
              name: true,
              parishCounty: true,
              stage: true,
              score: true,
            },
          },
        },
      },
    },
  });

  const followedProjectsById = new Map<
    string,
    {
      id: string;
      publicId: string;
      name: string;
      parishCounty: string | null;
      stage: string;
      score: number;
    }
  >();

  for (const watchlist of followedWatchlists) {
    for (const item of watchlist.items) {
      followedProjectsById.set(item.project.id, item.project);
    }
  }

  const followedTop = Array.from(followedProjectsById.values())
    .filter((project) => project.score > 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);

  const remainingSlots = Math.max(0, 7 - followedTop.length);
  const globalTop = remainingSlots
    ? await prisma.project.findMany({
        where: {
          score: { gt: 50 },
          id: { notIn: followedTop.map((project) => project.id) },
        },
        orderBy: [{ score: "desc" }],
        take: remainingSlots,
      })
    : [];

  const top = [...followedTop, ...globalTop];
  const followedSet = new Set(followedTop.map((project) => project.id));
  const topBlock = top
    .map(
      (p) =>
        `- ${p.publicId} · ${p.name} · ${p.parishCounty ?? "?"} · stage ${p.stage} · score ${p.score}${followedSet.has(p.id) ? " · FOLLOWED_WATCHLIST" : ""}`,
    )
    .join("\n");

  // Source health
  const sources = await prisma.source.findMany({ select: { name: true, status: true, lastError: true } });
  const healthBlock = sources
    .map((s) => `- ${s.name}: ${s.status}${s.lastError ? " — " + s.lastError : ""}`)
    .join("\n");

  const out = await callBackend({
    agent: "BriefWriter",
    systemPrompt: SYSTEM_PROMPT,
    user: `WINDOW: ${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}\n\nTOP CANDIDATES:\n${topBlock}\n\nSOURCE HEALTH:\n${healthBlock}`,
    schema: BriefSchema,
    schemaName: "GcirWeeklyBrief",
    temperature: 0.5,
    // Weekly synthesis — needs current web context (recent filings, hearings)
    // and multi-step reasoning to weave a coherent narrative. deep-research
    // preset gives gpt-5.2 with web_search + fetch_url and 10 reasoning steps.
    // Once-a-week cadence keeps total cost low (~$3/week).
    perplexity: { preset: "deep" },
  });

  const last = await prisma.brief.findFirst({ orderBy: { issueNumber: "desc" } });
  const issueNumber = (last?.issueNumber ?? 0) + 1;

  const brief = await prisma.brief.create({
    data: {
      issueNumber,
      title: out.data.title,
      windowStart: start,
      windowEnd: end,
      narrative: out.data.narrative,
      topMovers: out.data.topMovers as never,
      recommendedActions: out.data.recommendedActions as never,
      sourceHealth: {
        items: sources.map((s) => ({ name: s.name, status: s.status, lastError: s.lastError })),
        followedWatchlists: followedWatchlists.map((watchlist) => ({ id: watchlist.id, name: watchlist.name })),
        watchlistFocus: followedTop.map((project) => {
          const owners = followedWatchlists
            .filter((watchlist) => watchlist.items.some((item) => item.project.id === project.id))
            .map((watchlist) => watchlist.name);
          return {
            projectPublicId: project.publicId,
            projectName: project.name,
            score: project.score,
            watchlistNames: owners,
          };
        }),
      } as never,
    },
  });

  return { briefId: brief.id, issueNumber };
}
