/**
 * qlad-evaluate.ts — Quiet Land Assembly Detector worker job.
 *
 * Runs every 20 minutes (per scheduler in apps/worker/src/index.ts).
 *
 * Pipeline:
 *   1. Load LAND_CONTROL signals observed in the last 24 hours.
 *   2. Cluster them by (parishCounty, related buyer entities, spatial proximity).
 *   3. For each candidate cluster:
 *      a. Build the AssemblyInput (acquisitions, related buyers, infra, opacity).
 *      b. Call detectQuietLandAssembly() — deterministic.
 *      c. If triggered AND FEATURE_PERPLEXITY_VALIDATION=true:
 *           call validateAssembly() to do the 2-step Perplexity pass.
 *      d. If publicCoverageFound: silence the alert (write Alert with
 *           publicCoverageFound=true, silencedAt=now), still attach
 *           supplementary evidence so analysts can audit.
 *      e. Else: create / upgrade the Project, write Alert + RecommendedActions,
 *           attach Perplexity findings to Alert.supplementaryEvidence.
 *
 * Idempotent: clusters are keyed by signature so re-runs upsert one Alert per cluster.
 */

import { createHash } from "node:crypto";
import { prisma, EntityRelationship } from "@gcir/db";
import {
  detectQuietLandAssembly,
  type AssemblyInput,
  type Acquisition,
} from "@gcir/scoring";
import type { InfraAsset } from "@gcir/shared";
import {
  validateAssembly,
  recommendActions,
  type ValidationOutput,
  PerplexityDisabledError,
} from "@gcir/agents";

const FEATURE_QLAD_LIVE = process.env.FEATURE_QLAD_LIVE_ALERTING === "true";
const FEATURE_PPLX = process.env.FEATURE_PERPLEXITY_VALIDATION === "true";

export type QladTickResult = {
  signalsConsidered: number;
  clustersBuilt: number;
  clustersTriggered: number;
  alertsCreated: number;
  alertsSilenced: number;
  totalValidationUsd: number;
};

export async function tickQlad(): Promise<QladTickResult> {
  const result: QladTickResult = {
    signalsConsidered: 0,
    clustersBuilt: 0,
    clustersTriggered: 0,
    alertsCreated: 0,
    alertsSilenced: 0,
    totalValidationUsd: 0,
  };
  if (!FEATURE_QLAD_LIVE) {
    console.log("[qlad] FEATURE_QLAD_LIVE_ALERTING=false; skipping");
    return result;
  }

  // 1. Pull recent land-control signals
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const signals = await prisma.signal.findMany({
    where: { family: "LAND_CONTROL", observedAt: { gte: since } },
    orderBy: { observedAt: "desc" },
    take: 500,
    include: { source: true },
  });
  result.signalsConsidered = signals.length;
  if (signals.length === 0) return result;

  // 2. Cluster — naive: group by (state, parishCounty, buyer cluster).
  // The buyer cluster is computed via EntityLink edges (treat shares-agent
  // / shares-mailing-address / affiliate-of as 'related').
  const clusters = await buildClusters(signals);
  result.clustersBuilt = clusters.length;

  // 3. Evaluate each cluster
  for (const c of clusters) {
    const detection = detectQuietLandAssembly(c.input);
    if (!detection.triggered) continue;
    result.clustersTriggered++;

    // Find or create the Project this cluster represents
    const project = await upsertProject(c);

    // 3c — optional Perplexity validation
    let validation: ValidationOutput | null = null;
    if (FEATURE_PPLX) {
      try {
        validation = await validateAssembly({
          projectId: project.id,
          parishCounty: c.parishCounty,
          state: c.state,
          totalAcres: detection.totalAcres,
          windowMonths: detection.windowMonths,
          buyerEntityIds: Array.from(c.buyerEntityIds),
          bbox: c.bbox,
        });
        result.totalValidationUsd += validation.totalCostUsd;
      } catch (err) {
        if (!(err instanceof PerplexityDisabledError)) {
          console.warn(`[qlad] validation failed for ${project.id}:`, (err as Error).message);
        }
      }
    }

    // 3d / 3e — write Alert
    const publicCoverageFound = validation?.publicCoverageFound ?? false;
    const alertTitle = publicCoverageFound
      ? `Quiet Land Assembly · already publicly explained · ${c.parishCounty}`
      : `Quiet Land Assembly · ${Math.round(detection.totalAcres).toLocaleString()} ac · ${c.parishCounty}`;
    const alertBody = renderAlertBody(c, detection, validation);

    const alert = await prisma.alert.upsert({
      where: { id: clusterAlertId(c.signature) },
      update: {
        title: alertTitle,
        body: alertBody,
        score: project.score,
        publicCoverageFound,
        supplementaryEvidence: validation
          ? ({
              publicCheck: validation.publicCheck,
              entityResearch: validation.entityResearch,
              modelMix: validation.modelMix,
            } as never)
          : undefined,
        validationCostUsd: validation?.totalCostUsd ?? null,
        validatedAt: validation ? new Date() : null,
        silencedAt: publicCoverageFound ? new Date() : null,
      },
      create: {
        id: clusterAlertId(c.signature),
        projectId: project.id,
        title: alertTitle,
        body: alertBody,
        score: project.score,
        scoreDelta: 0,
        reasonCode: publicCoverageFound ? "qlad.public-coverage" : "qlad.triggered",
        publicCoverageFound,
        supplementaryEvidence: validation
          ? ({
              publicCheck: validation.publicCheck,
              entityResearch: validation.entityResearch,
              modelMix: validation.modelMix,
            } as never)
          : undefined,
        validationCostUsd: validation?.totalCostUsd ?? null,
        validatedAt: validation ? new Date() : null,
        silencedAt: publicCoverageFound ? new Date() : null,
        publishedAt: publicCoverageFound ? null : new Date(),
      },
    });

    if (publicCoverageFound) {
      result.alertsSilenced++;
    } else {
      result.alertsCreated++;
      // Generate recommended actions only on the first publish of this alert
      const existing = await prisma.recommendedAction.count({
        where: { projectId: project.id, status: "pending" },
      });
      if (existing === 0) {
        try {
          await recommendActions(project.id);
        } catch (err) {
          console.warn(`[qlad] recommendActions failed for ${project.id}:`, (err as Error).message);
        }
      }
    }

    void alert;
  }

  console.log(
    `[qlad] signals=${result.signalsConsidered} clusters=${result.clustersBuilt} triggered=${result.clustersTriggered} created=${result.alertsCreated} silenced=${result.alertsSilenced} cost=$${result.totalValidationUsd.toFixed(2)}`,
  );
  return result;
}

// ─── clustering ────────────────────────────────────────────────────────────

type ClusterCandidate = {
  signature: string;
  parishCounty: string;
  state: string;
  buyerEntityIds: Set<string>;
  signalIds: string[];
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number } | undefined;
  input: AssemblyInput;
};

async function buildClusters(
  signals: Array<{
    id: string;
    payload: unknown;
    documentDate: Date | null;
    observedAt: Date;
  }>,
): Promise<ClusterCandidate[]> {
  // Bucket signals by parish + acquired-buyer-entity (resolved through
  // EntityLink edges). For v0 simplicity: cluster by parish only;
  // EntityLink-driven cluster widening lands in Phase D.1.
  const byParish = new Map<string, typeof signals>();
  for (const s of signals) {
    const p = (s.payload as { parish?: string; parishCounty?: string }) ?? {};
    const key = (p.parishCounty ?? p.parish ?? "unknown") + "::LA";
    if (!byParish.has(key)) byParish.set(key, []);
    byParish.get(key)!.push(s);
  }

  const out: ClusterCandidate[] = [];
  for (const [key, items] of byParish) {
    if (items.length < 3) continue; // need at least 3 land transfers to cluster
    const [parishCounty, state] = key.split("::");

    const buyerEntityIds = new Set<string>();
    const acquisitions: Acquisition[] = [];
    let bbox: ClusterCandidate["bbox"];

    for (const s of items) {
      const p = s.payload as {
        parcelId?: string;
        acres?: number;
        buyerEntityId?: string;
        pricePerAcre?: number;
        geometry?: { rings?: number[][][] } | null;
      };
      if (!p.parcelId || !p.acres) continue;
      acquisitions.push({
        parcelId: p.parcelId,
        acres: p.acres,
        acquiredAt: s.documentDate ?? s.observedAt,
        buyerEntityId: p.buyerEntityId ?? "unknown",
        distanceMiles: 0, // filled in after centroid pass
        pricePerAcre: p.pricePerAcre,
      });
      if (p.buyerEntityId) buyerEntityIds.add(p.buyerEntityId);
      if (p.geometry?.rings?.[0]?.[0]) {
        const [lng, lat] = p.geometry.rings[0][0];
        bbox = bbox
          ? {
              minLat: Math.min(bbox.minLat, lat),
              minLng: Math.min(bbox.minLng, lng),
              maxLat: Math.max(bbox.maxLat, lat),
              maxLng: Math.max(bbox.maxLng, lng),
            }
          : { minLat: lat, minLng: lng, maxLat: lat, maxLng: lng };
      }
    }

    if (acquisitions.length === 0) continue;

    // Compute distance-to-centroid (rough): use the bbox center
    if (bbox) {
      const cx = (bbox.minLng + bbox.maxLng) / 2;
      const cy = (bbox.minLat + bbox.maxLat) / 2;
      acquisitions.forEach((a) => {
        // We don't have per-parcel coords reliably yet — leave at 0 mi.
        // The detector treats 0 as "contiguous" which is correct here.
        void cx; void cy;
        a.distanceMiles = 0;
      });
    }

    // Resolve related buyers via EntityLink edges
    const linked = buyerEntityIds.size === 0
      ? []
      : await prisma.entityLink.findMany({
          where: {
            OR: [
              { fromId: { in: Array.from(buyerEntityIds) } },
              { toId: { in: Array.from(buyerEntityIds) } },
            ],
            relationship: {
              in: [
                EntityRelationship.SHARES_REGISTERED_AGENT,
                EntityRelationship.SHARES_MAILING_ADDRESS,
                EntityRelationship.AFFILIATE_OF,
                EntityRelationship.ANALYST_LINKED,
              ],
            },
          },
          select: { fromId: true, toId: true },
        });
    const related = new Set<string>(buyerEntityIds);
    for (const e of linked) {
      related.add(e.fromId);
      related.add(e.toId);
    }

    // Heuristic infra detection from parish — full impl needs PostGIS query.
    const nearbyInfra: InfraAsset[] = inferInfra(parishCounty);
    const opacity = await averageOpacity(buyerEntityIds);

    out.push({
      signature: clusterSignature(parishCounty, state, related),
      parishCounty,
      state,
      buyerEntityIds,
      signalIds: items.map((s) => s.id),
      bbox,
      input: {
        acquisitions,
        relatedBuyerEntityIds: related,
        nearbyInfra,
        buyerOpacityScore: opacity,
        publicAnnouncementExplains: false, // gets resolved by AssemblyValidator
      },
    });
  }
  return out;
}

async function averageOpacity(ids: Set<string>): Promise<number> {
  if (ids.size === 0) return 0;
  const rows = await prisma.entity.findMany({
    where: { id: { in: Array.from(ids) } },
    select: { opacityScore: true },
  });
  if (rows.length === 0) return 0;
  const total = rows.reduce((s, r) => s + (r.opacityScore ?? 0), 0);
  return total / rows.length;
}

const RIVER_PARISHES = new Set([
  "Ascension","St. James","Iberville","St. John the Baptist","St. Charles",
  "Plaquemines","St. Bernard","East Baton Rouge","West Baton Rouge",
]);
const COASTAL_PARISHES = new Set(["Calcasieu","Cameron"]);

function inferInfra(parish: string): InfraAsset[] {
  if (RIVER_PARISHES.has(parish)) {
    return [
      { kind: "navigable_water", weight: 1.1 },
      { kind: "rail", weight: 1.0 },
      { kind: "interstate", weight: 0.8 },
      { kind: "transmission", weight: 0.9 },
      { kind: "industrial_cluster", weight: 1.0 },
    ];
  }
  if (COASTAL_PARISHES.has(parish)) {
    return [
      { kind: "port", weight: 1.2 },
      { kind: "navigable_water", weight: 1.1 },
      { kind: "rail", weight: 1.0 },
      { kind: "transmission", weight: 0.9 },
    ];
  }
  return [
    { kind: "interstate", weight: 0.8 },
    { kind: "rail", weight: 1.0 },
  ];
}

// ─── persistence helpers ───────────────────────────────────────────────────

async function upsertProject(c: ClusterCandidate) {
  // Try to find an existing suspected project in this parish with overlapping
  // buyer entities. Otherwise create a new "QLAD-<parish>-<sig>" suspect.
  const buyers = Array.from(c.buyerEntityIds);
  const existing = buyers.length === 0
    ? null
    : await prisma.project.findFirst({
        where: {
          status: "suspected",
          parishCounty: c.parishCounty,
          sites: {
            some: {
              parcels: {
                some: { buyerEntity: { id: { in: buyers } } },
              },
            },
          },
        },
      });
  if (existing) return existing;

  const publicId = `PRJ-QLAD-${c.signature.slice(0, 8)}`;
  return prisma.project.upsert({
    where: { publicId },
    update: {},
    create: {
      publicId,
      name: `Quiet Assembly · ${c.parishCounty}`,
      status: "suspected",
      stage: "SITE_CONTROL",
      confidence: "MEDIUM",
      score: 60,
      parishCounty: c.parishCounty,
      state: c.state,
      corridor: corridorFor(c.parishCounty),
      firstSignalAt: new Date(),
    },
  });
}

function corridorFor(parish: string): string {
  if (RIVER_PARISHES.has(parish)) {
    if (parish === "St. James" || parish === "St. John the Baptist") return "St. James / St. John";
    if (parish === "St. Charles") return "St. Charles";
    if (parish === "Plaquemines" || parish === "St. Bernard") return "Plaquemines / Lower Miss";
    if (parish === "East Baton Rouge" || parish === "Iberville" || parish === "West Baton Rouge")
      return "EBR · Iberville · WBR";
    return "Ascension / River corridor";
  }
  if (COASTAL_PARISHES.has(parish)) return "Calcasieu / Cameron";
  return "Ascension / River corridor";
}

function renderAlertBody(c: ClusterCandidate, detection: ReturnType<typeof detectQuietLandAssembly>, validation: ValidationOutput | null): string {
  const lines: string[] = [];
  lines.push(`Cluster signature: \`${c.signature}\``);
  lines.push(`Parish: ${c.parishCounty}, ${c.state}`);
  lines.push(`Total acres: ${detection.totalAcres.toFixed(0)}`);
  lines.push(`Acquisition window: ${detection.windowMonths.toFixed(1)} months`);
  lines.push(`Buyer entity ids (resolved via EntityLink): ${Array.from(c.buyerEntityIds).join(", ") || "—"}`);
  lines.push("");
  lines.push("**Component scores (0..1):**");
  for (const [k, v] of Object.entries(detection.components)) {
    lines.push(`  - ${k}: ${(v as number).toFixed(2)}`);
  }
  if (detection.reasons.length > 0) {
    lines.push("");
    lines.push("**Reasons / caveats:**");
    detection.reasons.forEach((r) => lines.push(`  - ${r}`));
  }
  if (validation) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("**Perplexity validation pass**");
    lines.push("");
    lines.push(`Public-coverage check: ${validation.publicCoverageFound ? "FOUND" : "not found"} (conf ${validation.publicCheck.confidence.toFixed(2)})`);
    lines.push(`> ${validation.publicCheck.summary}`);
    lines.push("");
    lines.push(`Entity research: ${validation.entityResearch.length} reports`);
    lines.push(`Model mix: ${validation.modelMix.join(", ")}`);
    lines.push(`Total cost: $${validation.totalCostUsd.toFixed(3)}`);
  }
  return lines.join("\n");
}

function clusterSignature(parishCounty: string, state: string, related: Set<string>): string {
  const sorted = Array.from(related).sort().join("|");
  return createHash("sha256").update(`${state}::${parishCounty}::${sorted}`).digest("hex");
}

function clusterAlertId(signature: string): string {
  // Deterministic Alert id so reruns upsert.
  return `qlad_${signature.slice(0, 24)}`;
}
