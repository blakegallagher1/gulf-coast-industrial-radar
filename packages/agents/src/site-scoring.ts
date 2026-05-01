/**
 * SiteScoringAgent — applies the site-fit scoring engine to a Site row.
 * No LLM call required; this is deterministic but lives here so the worker
 * can call it as part of the scoring pipeline.
 */

import { prisma } from "@gcir/db";
import { scoreSiteFit } from "@gcir/scoring";

export async function scoreSiteById(siteId: string): Promise<number> {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) throw new Error(`SiteScoring: missing site ${siteId}`);

  const result = scoreSiteFit({
    totalAcres: site.totalAcres ?? 0,
    riverFrontageMi: site.riverFrontageMi ?? undefined,
    zoning: site.zoning ?? undefined,
    floodZone: site.floodZone ?? undefined,
    wetlandsAcres: site.wetlandsAcres ?? undefined,
    nearbyInfra: [],
  });

  await prisma.site.update({
    where: { id: siteId },
    data: { infrastructureScore: result.score },
  });

  return result.score;
}
