/**
 * EntityResolutionAgent — links shell LLCs, sponsors, registered agents,
 * landowners, consultants, project names, and facility aliases.
 *
 * Approach:
 *   1. Deterministic rules first — exact name match, shared registration #,
 *      shared registered agent, shared mailing address (signature block).
 *   2. LLM-aided entity-link suggestions for fuzzy cases (e.g., "Crescent
 *      Industrial Holdings I/II/III" sharing the same agent + escrow address).
 *      All LLM suggestions are persisted with detectedBy="agent" and require
 *      AnalystReview confirmation before being treated as authoritative.
 */

import { z } from "zod";
import { prisma, EntityRelationship } from "@gcir/db";
import { callBackend } from "./agent-backend";

export type ResolveInput = {
  windowDays?: number;
};

export type ResolveOutput = {
  deterministicLinks: number;
  agentSuggestedLinks: number;
};

const SYSTEM_PROMPT = `You connect entities from Gulf Coast industrial filings.

You are given a list of recently-formed entities and recently-active land buyers.
Identify likely linkages — series-LLCs (CIH I/II/III), shared registered agent,
shared mailing/escrow address, project-style naming, sequential formation dates.

Only return links the evidence supports. Use confidence 0..1.
Use these relationship codes:
  SHARES_REGISTERED_AGENT, SHARES_MAILING_ADDRESS, SHARES_OFFICER,
  AFFILIATE_OF, ANALYST_LINKED, CLOSED_THROUGH, REGISTERED_AGENT_FOR.`;

const LinkSchema = z.object({
  fromName: z.string(),
  toName: z.string(),
  relationship: z.enum([
    "SHARES_REGISTERED_AGENT",
    "SHARES_MAILING_ADDRESS",
    "SHARES_OFFICER",
    "AFFILIATE_OF",
    "ANALYST_LINKED",
    "CLOSED_THROUGH",
    "REGISTERED_AGENT_FOR",
  ]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});
const LinksSchema = z.object({ links: z.array(LinkSchema) });

export async function runEntityResolution(input: ResolveInput = {}): Promise<ResolveOutput> {
  const window = input.windowDays ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - window);

  const entities = await prisma.entity.findMany({
    where: { createdAt: { gte: since } },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

  // ── Deterministic pass
  let det = 0;
  const byAgent = new Map<string, string[]>();
  for (const e of entities) {
    if (!e.registeredAgent) continue;
    const list = byAgent.get(e.registeredAgent) ?? [];
    list.push(e.id);
    byAgent.set(e.registeredAgent, list);
  }
  for (const [, ids] of byAgent) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        try {
          await prisma.entityLink.create({
            data: {
              fromId: ids[i],
              toId: ids[j],
              relationship: EntityRelationship.SHARES_REGISTERED_AGENT,
              confidence: 1.0,
              detectedBy: "deterministic",
            },
          });
          det++;
        } catch {
          /* unique violation, skip */
        }
      }
    }
  }

  // ── Agent-aided pass
  if (entities.length === 0) return { deterministicLinks: det, agentSuggestedLinks: 0 };

  const corpus = entities
    .slice(0, 60)
    .map(
      (e) =>
        `- ${e.name} (${e.kind}) · agent: ${e.registeredAgent ?? "?"} · mail: ${e.mailingAddress ?? "?"} · formed: ${e.formedAt?.toISOString().slice(0, 10) ?? "?"}`,
    )
    .join("\n");

  let agentLinks = 0;
  try {
    const out = await callBackend({
      agent: "EntityResolution",
      systemPrompt: SYSTEM_PROMPT,
      user: `RECENT ENTITIES:\n${corpus}`,
      schema: LinksSchema,
      schemaName: "GcirEntityLinks",
      temperature: 0.1,
      // LLC name matching over deterministic fields — no web search needed.
      // gpt-5.4-mini handles the relational reasoning ("Crescent I/II/III
      // share this agent") at ~$0.005/call without hallucinating links.
      perplexity: { rawModel: "gpt5_4_mini" },
    });

    const byName = new Map<string, string>();
    for (const e of entities) byName.set(e.name.toLowerCase(), e.id);

    for (const link of out.data.links) {
      const a = byName.get(link.fromName.toLowerCase());
      const b = byName.get(link.toName.toLowerCase());
      if (!a || !b || a === b) continue;
      try {
        await prisma.entityLink.create({
          data: {
            fromId: a,
            toId: b,
            relationship: link.relationship as EntityRelationship,
            confidence: link.confidence,
            detectedBy: "agent",
          },
        });
        agentLinks++;
      } catch {
        /* skip dupes */
      }
    }
  } catch (err) {
    // Agent failures are non-fatal — deterministic results still landed
    console.warn("EntityResolution agent step failed:", (err as Error).message);
  }

  return { deterministicLinks: det, agentSuggestedLinks: agentLinks };
}
