/**
 * SourceSchemaResearcher — dev-time utility that uses Perplexity Agent API
 * presets (deep-research for thorough mapping, fast-search for quick passes)
 * to map the actual current schema of each public Gulf Coast source.
 *
 * Output: a markdown research artifact per source, saved to
 * packages/adapters/src/research/<slug>.md, that the corresponding adapter
 * is hardened against in Phase C.
 *
 * Usage:
 *   import { researchSource } from "@gcir/agents/source-schema-researcher";
 *   await researchSource({ slug: "ldeq-edms", quality: "deep" });
 *
 * Or via the bundled CLI:
 *   pnpm --filter @gcir/agents research <slug>
 *   pnpm research:sources           # all 14
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { deepResearch, text, type Citation } from "./perplexity-client";

export type SourceProfile = {
  slug: string;
  name: string;
  homeUrl: string;
  jurisdiction: string;
  family: string;
  /** Fields the adapter is expected to extract — research must confirm these. */
  expectedFields: string[];
  /** Predicate vocabulary the adapter emits when records of this kind fire. */
  expectedPredicates: string[];
  /** Optional: any specific endpoints we already think exist. */
  knownEndpoints?: string[];
};

/** The 14 public Gulf Coast sources we research at dev time. */
export const SOURCE_PROFILES: SourceProfile[] = [
  {
    slug: "led-fastlane",
    name: "LED FastLane / Incentives Management System",
    homeUrl: "https://fastlane.louisianaeconomicdevelopment.com",
    jurisdiction: "Louisiana · LED",
    family: "INCENTIVE",
    expectedFields: ["company name", "parish", "capex tier", "NAICS", "jobs", "filing date", "project status"],
    expectedPredicates: ["incentive.itep.eligible", "incentive.itep.approved", "incentive.itep.withdrawn"],
    knownEndpoints: ["https://fastlaneng.louisianaeconomicdevelopment.com/public/search/bi", "https://fastlaneng.louisianaeconomicdevelopment.com/public/reports"],
  },
  {
    slug: "la-itep",
    name: "Louisiana Industrial Tax Exemption Program",
    homeUrl: "https://www.opportunitylouisiana.gov/incentive/industrial-tax-exemption",
    jurisdiction: "Louisiana · LED",
    family: "INCENTIVE",
    expectedFields: ["sponsor", "project name", "capex", "abatement years", "approval status"],
    expectedPredicates: ["incentive.itep.eligible", "incentive.itep.approved"],
  },
  {
    slug: "la-bd-ci",
    name: "Louisiana Board of Commerce & Industry",
    homeUrl: "https://www.opportunitylouisiana.gov",
    jurisdiction: "Louisiana · LED",
    family: "INCENTIVE",
    expectedFields: ["agenda items", "sponsor", "project name", "meeting date", "approval status"],
    expectedPredicates: ["incentive.bdci.agenda", "incentive.bdci.approved"],
  },
  {
    slug: "ldeq-edms",
    name: "LDEQ EDMS public document search",
    homeUrl: "https://edms.deq.louisiana.gov",
    jurisdiction: "Louisiana · LDEQ",
    family: "ENVIRONMENTAL_PERMIT",
    expectedFields: ["AI number", "facility name", "parish", "document type (AQ/WQ/SW)", "permit number", "document date"],
    expectedPredicates: ["permit.air.NOI", "permit.water.NPDES", "permit.solid.waste"],
  },
  {
    slug: "usace-mvn",
    name: "USACE New Orleans District public notices",
    homeUrl: "https://www.mvn.usace.army.mil/Missions/Regulatory/Public-Notices/",
    jurisdiction: "Federal · USACE MVN",
    family: "ENVIRONMENTAL_PERMIT",
    expectedFields: ["notice title", "applicant", "parish", "section (10/404/408)", "comment deadline"],
    expectedPredicates: ["permit.section10", "permit.wetlands.404", "permit.section408"],
  },
  {
    slug: "lpsc",
    name: "Louisiana Public Service Commission docket portal",
    homeUrl: "https://lpscpubvalence.lpsc.louisiana.gov",
    jurisdiction: "Louisiana · LPSC",
    family: "UTILITY_POWER",
    expectedFields: ["docket number", "applicant", "title", "filed date", "type (R-/U-)"],
    expectedPredicates: ["utility.interconnection", "utility.transmission", "utility.generation", "utility.irp"],
  },
  {
    slug: "la-sos",
    name: "Louisiana Secretary of State entity search",
    homeUrl: "https://coraweb.sos.la.gov/Commercial/CorporationSearch.aspx",
    jurisdiction: "Louisiana · SOS",
    family: "ENTITY_FORMATION",
    expectedFields: ["entity name", "registration #", "kind (LLC/Corp/LP)", "formation date", "registered agent", "mailing address"],
    expectedPredicates: ["entity.formed", "entity.formed.opaque"],
  },
  {
    slug: "ascension-assessor",
    name: "Ascension Parish Assessor + GIS",
    homeUrl: "https://gis.ascensionparish.net/arcgis/rest/services",
    jurisdiction: "Ascension Parish",
    family: "LAND_CONTROL",
    expectedFields: ["PARCEL_ID", "OWNER", "ACRES", "ZONING", "SALE_DATE", "SALE_PRICE", "geometry"],
    expectedPredicates: ["land.transfer", "land.parcel.update"],
  },
  {
    slug: "ebr-gis",
    name: "East Baton Rouge GIS open data",
    homeUrl: "https://arcgis.brla.gov/server/rest/services",
    jurisdiction: "East Baton Rouge",
    family: "LAND_CONTROL",
    expectedFields: ["ASMT", "OWNER", "ACRES", "ZONING", "SALE_DATE", "SALE_PRICE", "geometry"],
    expectedPredicates: ["land.transfer", "land.parcel.update"],
  },
  {
    slug: "calcasieu-assessor",
    name: "Calcasieu Parish Assessor GIS",
    homeUrl: "https://gis.calcasieuassessor.org/arcgis/rest/services",
    jurisdiction: "Calcasieu Parish",
    family: "LAND_CONTROL",
    expectedFields: ["PARCEL_ID", "OWNER", "ACRES", "ZONING", "SALE_DATE", "SALE_PRICE", "geometry"],
    expectedPredicates: ["land.transfer", "land.parcel.update"],
  },
  {
    slug: "sec-edgar",
    name: "SEC EDGAR submissions API + filings",
    homeUrl: "https://data.sec.gov",
    jurisdiction: "Federal · SEC",
    family: "PUBLIC_COMPANY",
    expectedFields: ["CIK", "form type", "accession #", "filing date", "primary document", "XBRL facts"],
    expectedPredicates: ["sec.filing.10-K", "sec.filing.10-Q", "sec.filing.8-K", "sec.filing.20-F"],
  },
  {
    slug: "sam-gov",
    name: "SAM.gov Opportunities API v2",
    homeUrl: "https://api.sam.gov",
    jurisdiction: "Federal · GSA",
    family: "PROCUREMENT",
    expectedFields: ["noticeId", "title", "type", "naics", "place of performance", "posted date"],
    expectedPredicates: ["procurement.federal.solicitation", "procurement.federal.award"],
  },
  {
    slug: "emma-msrb",
    name: "EMMA / MSRB — IDB & continuing disclosures",
    homeUrl: "https://emma.msrb.org",
    jurisdiction: "Federal · MSRB",
    family: "FINANCING",
    expectedFields: ["issuer", "CUSIP", "notional", "project alias", "filing date", "disclosure type"],
    expectedPredicates: ["financing.bond.disclosure", "financing.bond.idb"],
  },
  {
    slug: "tceq",
    name: "TCEQ pending air permits",
    homeUrl: "https://www.tceq.texas.gov/permitting/air/nav/air_status.html",
    jurisdiction: "Texas · TCEQ",
    family: "ENVIRONMENTAL_PERMIT",
    expectedFields: ["permit number", "applicant", "county", "permit type (NSR/Title V)", "status"],
    expectedPredicates: ["permit.tceq.air"],
  },
];

const SYSTEM_PROMPT = `You are a senior data engineer mapping the actual current public surface of a US government / public records source for an automated scraper.

Your output is a markdown research artifact that an engineer will use to harden an ingestion adapter. Be precise about endpoint URLs, parameter names, response shapes, and rate limits. When you are unsure, say so explicitly. Cite primary sources. No fluff.

Mandatory sections (use these exact headings):

# Source: <name>
## Current production URLs
## Authentication & session model
## Endpoints / queries we use
## Response shape (real example)
## Field map → target predicates
## Pagination & rate limits
## Anti-bot / TOS / robots.txt notes
## Recent schema or URL changes (2024+)
## Failure modes we should handle in the adapter
## Open questions for the engineer

If a section truly has nothing to report, write \"None observed.\" Do not invent.`;

export type ResearchOptions = {
  slug: string;
  quality?: "deep" | "fast";
  /** Where to write the markdown. Defaults to packages/adapters/src/research/<slug>.md */
  outDir?: string;
  /** When false, returns the markdown without writing. */
  write?: boolean;
};

export type ResearchResult = {
  slug: string;
  filePath?: string;
  markdown: string;
  citations: Citation[];
  costUsd: number;
  latencyMs: number;
  cached: boolean;
};

export async function researchSource(opts: ResearchOptions): Promise<ResearchResult> {
  const profile = SOURCE_PROFILES.find((p) => p.slug === opts.slug);
  if (!profile) throw new Error(`unknown source slug: ${opts.slug}`);

  const user = `Research the actual current public surface of:

  Name:        ${profile.name}
  Home URL:    ${profile.homeUrl}
  Jurisdiction:${profile.jurisdiction}
  Family:      ${profile.family}
  ${profile.knownEndpoints ? `Known/believed endpoints: ${profile.knownEndpoints.join(", ")}` : ""}

We want to extract these fields:
  ${profile.expectedFields.join(", ")}

And emit these signal predicates:
  ${profile.expectedPredicates.join(", ")}

Produce the markdown artifact described in your system prompt. Visit the actual production URLs, document the real schema as it exists in 2026.`;

  const result = opts.quality === "deep"
    ? await deepResearch({ agent: `SourceSchemaResearcher.${profile.slug}`, systemPrompt: SYSTEM_PROMPT, user })
    : await text({ agent: `SourceSchemaResearcher.${profile.slug}`, systemPrompt: SYSTEM_PROMPT, user, modelKey: "fast" });

  const markdown = renderMarkdown(profile, result.text, result.citations, result.model, result.cached);

  if (opts.write !== false) {
    const dir = opts.outDir ?? resolve(__dirname, "..", "..", "adapters", "src", "research");
    await mkdir(dir, { recursive: true });
    const filePath = resolve(dir, `${profile.slug}.md`);
    await writeFile(filePath, markdown, "utf8");
    return {
      slug: profile.slug,
      filePath,
      markdown,
      citations: result.citations,
      costUsd: result.costUsd,
      latencyMs: result.latencyMs,
      cached: result.cached,
    };
  }

  return {
    slug: profile.slug,
    markdown,
    citations: result.citations,
    costUsd: result.costUsd,
    latencyMs: result.latencyMs,
    cached: result.cached,
  };
}

function renderMarkdown(profile: SourceProfile, body: string, citations: Citation[], model: string, cached: boolean): string {
  const cites = citations.length
    ? "## Citations (Perplexity)\n\n" + citations.map((c, i) => `${i + 1}. [${c.title ?? c.url}](${c.url})${c.snippet ? `\n   > ${c.snippet}` : ""}`).join("\n")
    : "";
  return [
    `<!--`,
    `  This file is auto-generated by SourceSchemaResearcher.`,
    `  Last research run: ${new Date().toISOString()}`,
    `  Model: ${model}${cached ? " (cached)" : ""}`,
    `  Source slug: ${profile.slug}`,
    `  Re-run: pnpm --filter @gcir/agents research ${profile.slug}`,
    `-->`,
    "",
    body,
    "",
    cites,
  ]
    .filter(Boolean)
    .join("\n");
}
