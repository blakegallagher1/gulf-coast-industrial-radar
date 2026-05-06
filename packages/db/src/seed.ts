/**
 * Seed: 10 backtest projects from knowledge/validation/validation-plan.md
 * + Aurora Steel Donaldsonville as a fresh "today" formation case.
 *
 * Seeds Sources, Projects, Signals, Entities, Sites, RecommendedActions,
 * and an example weekly Brief.
 *
 * Data fixtures live in ./seed-data/ — split into multiple modules so each
 * commit fits within tool-call size limits when pushing through the GitHub
 * Composio integration.
 *
 * Run:  pnpm db:seed
 */

import {
  prisma,
  Prisma,
  EntityKind,
} from "./index";
import { sources, projects } from "./seed-data";

// ─────────────────────────────────────────────────────────────────────────────
//  SEED EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌊  Seeding Gulf Coast Industrial Radar…");

  // 1) sources
  const sourceMap = new Map<string, string>();
  const sourceUrlMap = new Map<string, string>(
    sources.map((source) => [source.slug, source.url]),
  );
  for (const s of sources) {
    const row = await prisma.source.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        jurisdiction: s.jurisdiction,
        state: s.state,
        family: s.family,
        url: s.url,
        cadence: s.cadence,
        accessMethod: s.accessMethod,
        status: s.status,
      },
      create: {
        slug: s.slug,
        name: s.name,
        jurisdiction: s.jurisdiction,
        state: s.state,
        family: s.family,
        url: s.url,
        cadence: s.cadence,
        accessMethod: s.accessMethod,
        status: s.status,
        lastOkAt: new Date(),
      },
    });
    sourceMap.set(s.slug, row.id);
  }
  console.log(`  · ${sources.length} sources upserted`);

  // 2) projects + signals + actions + milestones
  for (const fx of projects) {
    const project = await prisma.project.upsert({
      where: { publicId: fx.publicId },
      update: {
        name: fx.name,
        alias: fx.alias,
        status: fx.status,
        stage: fx.stage,
        confidence: fx.confidence,
        score: fx.score,
        estimatedCapex: fx.estimatedCapex,
        estimatedJobs: fx.estimatedJobs,
        facilityType: fx.facilityType,
        parishCounty: fx.parishCounty,
        state: fx.state,
        corridor: fx.corridor,
        firstSignalAt: new Date(fx.firstSignalAt),
        publicAnnouncedAt: fx.publicAnnouncedAt
          ? new Date(fx.publicAnnouncedAt)
          : null,
      },
      create: {
        publicId: fx.publicId,
        name: fx.name,
        alias: fx.alias,
        status: fx.status,
        stage: fx.stage,
        confidence: fx.confidence,
        score: fx.score,
        estimatedCapex: fx.estimatedCapex,
        estimatedJobs: fx.estimatedJobs,
        facilityType: fx.facilityType,
        parishCounty: fx.parishCounty,
        state: fx.state,
        corridor: fx.corridor,
        firstSignalAt: new Date(fx.firstSignalAt),
        publicAnnouncedAt: fx.publicAnnouncedAt
          ? new Date(fx.publicAnnouncedAt)
          : null,
      },
    });

    // entities (buyers)
    for (const buyerName of fx.buyers) {
      const ent = await prisma.entity.upsert({
        where: {
          state_registrationNo: {
            state: fx.state,
            registrationNo: `seed:${fx.publicId}:${buyerName}`,
          },
        },
        update: { name: buyerName, kind: EntityKind.LLC },
        create: {
          name: buyerName,
          kind: EntityKind.LLC,
          state: fx.state,
          registrationNo: `seed:${fx.publicId}:${buyerName}`,
          opacityScore: buyerName.toLowerCase().includes("llc") ? 0.85 : 0.2,
          formedAt: new Date(fx.firstSignalAt),
        },
      });
      void ent;
    }

    // site
    const existingSite = await prisma.site.findFirst({
      where: { projectId: project.id },
    });
    if (!existingSite) {
      await prisma.site.create({
        data: {
          projectId: project.id,
          name: `${fx.name} site`,
          centerLat: fx.centerLat,
          centerLng: fx.centerLng,
          totalAcres: fx.totalAcres,
          contiguousAcres: fx.totalAcres,
          riverFrontageMi: fx.corridor.includes("River") ? 0.8 : null,
          zoning: "M-2",
          floodZone: "X",
          infrastructureScore: 9.0,
        },
      });
    }

    // signals
    for (const [index, sig] of fx.signals.entries()) {
      const sourceId = sourceMap.get(sig.sourceSlug);
      if (!sourceId) continue;
      const sourceSlug = sig.sourceSlug as (typeof sources)[number]["slug"];
      const rawDocumentId = `rawdoc:${fx.publicId}:${sig.sourceSlug}:${index + 1}`;
      await prisma.rawDocument.upsert({
        where: { id: rawDocumentId },
        update: {
          observedAt: new Date(sig.observedAt),
          documentDate: new Date(sig.observedAt),
          url: sourceUrlMap.get(sourceSlug) ?? `seed://${sig.sourceSlug}`,
          title: sig.subjectLabel,
          excerpt: sig.subjectLabel,
          metadata: {
            projectPublicId: fx.publicId,
            predicate: sig.predicate,
            sourceSlug: sig.sourceSlug,
          },
        },
        create: {
          id: rawDocumentId,
          sourceId,
          observedAt: new Date(sig.observedAt),
          documentDate: new Date(sig.observedAt),
          url: sourceUrlMap.get(sourceSlug) ?? `seed://${sig.sourceSlug}`,
          contentHash: `seed:${fx.publicId}:${sig.sourceSlug}:${index + 1}`,
          storageKey: `seed://${fx.publicId}/${sig.sourceSlug}/${index + 1}`,
          mimeType: "text/plain",
          bytes: sig.subjectLabel.length,
          title: sig.subjectLabel,
          excerpt: sig.subjectLabel,
          metadata: {
            projectPublicId: fx.publicId,
            predicate: sig.predicate,
            sourceSlug: sig.sourceSlug,
          },
        },
      });
      const exists = await prisma.signal.findFirst({
        where: {
          projectId: project.id,
          predicate: sig.predicate,
          observedAt: new Date(sig.observedAt),
        },
      });
      if (exists) {
        await prisma.signal.update({
          where: { id: exists.id },
          data: { rawDocumentId },
        });
        continue;
      }
      await prisma.signal.create({
        data: {
          projectId: project.id,
          family: sig.family,
          predicate: sig.predicate,
          subjectLabel: sig.subjectLabel,
          observedAt: new Date(sig.observedAt),
          weight: sig.weight,
          confidence: sig.confidence,
          payload: sig.payload ?? Prisma.JsonNull,
          sourceId,
          rawDocumentId,
        },
      });
    }

    // recommended actions
    for (const a of fx.recommendedActions ?? []) {
      const exists = await prisma.recommendedAction.findFirst({
        where: { projectId: project.id, kind: a.kind },
      });
      if (exists) continue;
      await prisma.recommendedAction.create({
        data: {
          projectId: project.id,
          kind: a.kind,
          rank: a.rank,
          title: a.title,
          rationale: a.rationale,
          confidence: a.confidence,
        },
      });
    }
  }
  console.log(`  · ${projects.length} projects upserted with signals`);

  // 3) one example weekly brief
  await prisma.brief.upsert({
    where: { issueNumber: 27 },
    update: {},
    create: {
      issueNumber: 27,
      title: "River corridor: a steel-class assembly is forming.",
      windowStart: new Date("2026-04-24"),
      windowEnd: new Date("2026-04-30"),
      narrative:
        "The defining move of the week was an Industrial Development Bond agenda item posting on Tuesday for 'Project Aurora' — $4.2B notional, Ascension Parish, metes-and-bounds matching the Crescent Industrial Holdings assembly. This pulls the Donaldsonville site into the financing-surfaced stage. It is the latest acquisition window before public announcement.",
      topMovers: [
        { publicId: "PRJ-2026-08114", name: "Aurora Steel Donaldsonville", scoreDelta: 11 },
      ] as Prisma.JsonArray,
      recommendedActions: [
        { rank: 1, title: "Pull title on Aurora Steel adjacent ring · 14 parcels · 1.5-mile" },
        { rank: 2, title: "Map Plaquemines 312-ac assembly + verify LPSC interconnection coordinates" },
      ] as Prisma.JsonArray,
      sourceHealth: {
        active: 8,
        degraded: 1,
        backlog: 0,
        notes: "Calcasieu assessor degraded since 06:14 — partial pulls only",
      } as Prisma.JsonObject,
    },
  });
  console.log("  · 1 brief upserted (issue 27)");

  console.log("✓  seed complete");
}

main()
  .catch((e) => {
    console.error("seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
