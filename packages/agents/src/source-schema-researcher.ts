/**
 * source-schema-researcher.ts
 *
 * Dev-time utility: given a Gulf Coast data source name, runs a
 * Perplexity sonar-deep-research call to document its current public
 * API / scraping schema and writes a Markdown artifact under
 * packages/adapters/src/research/<slug>.md.
 *
 * Usage (via CLI script):
 *   npx ts-node packages/agents/scripts/research-sources.ts --sources all
 *   npx ts-node packages/agents/scripts/research-sources.ts --sources led-fastlane,la-sos
 */

import fs from "node:fs/promises";
import path from "node:path";
import { deepResearch } from "./perplexity-client";

export type SourceDescriptor = {
  /** Short machine-readable slug (matches adapter filename). */
  slug: string;
  /** Human-readable name shown in prompts. */
  name: string;
  /** Primary URL the adapter hits. */
  primaryUrl: string;
  /** Extra context to include in the research prompt. */
  notes?: string;
};

export const GULF_COAST_SOURCES: SourceDescriptor[] = [
  {
    slug: "led-fastlane",
    name: "Louisiana Economic Development FastLane",
    primaryUrl: "https://fastlaneng.louisianaeconomicdevelopment.com",
    notes: "FastLane is the online incentive-application portal for LED. We scrape the public project-announcement search page.",
  },
  {
    slug: "la-itep",
    name: "Louisiana Industrial Tax Exemption Program (ITEP)",
    primaryUrl: "https://www.louisiana.gov/itep",
    notes: "ITEP grants 5-year property tax exemptions for new/expanding manufacturers. Data is in a publicly-accessible database.",
  },
  {
    slug: "la-bd-ci",
    name: "Louisiana Business & Community Development (BCD) Construction Index",
    primaryUrl: "https://www.louisianaeconomicdevelopment.com/sites/default/files/led_assets/maps-and-demographics/construction-index.pdf",
    notes: "Quarterly PDF with active industrial construction projects. We parse the PDF.",
  },
  {
    slug: "ldeq-edms",
    name: "LDEQ Electronic Document Management System (EDMS)",
    primaryUrl: "https://edms.deq.louisiana.gov",
    notes: "LDEQ EDMS hosts public air/water permits. We query by facility ID and track new permit applications.",
  },
  {
    slug: "usace-mvn",
    name: "USACE New Orleans District (MVN) Public Notices",
    primaryUrl: "https://www.mvn.usace.army.mil/Missions/Regulatory/Public-Notices/",
    notes: "USACE MVN posts Section 404/10 permit public notices as PDFs.",
  },
  {
    slug: "lpsc",
    name: "Louisiana Public Service Commission (LPSC) eFiling",
    primaryUrl: "https://lpscefiling.lpsc.la.gov",
    notes: "LPSC eFiling has rate cases and certificate filings. Relevant for utility-scale industrial projects.",
  },
  {
    slug: "la-sos",
    name: "Louisiana Secretary of State Commercial Search",
    primaryUrl: "https://www.sos.la.gov/BusinessServices/SearchForABusiness/Pages/default.aspx",
    notes: "We search for newly registered LLCs/corporations that match known project entity names.",
  },
  {
    slug: "ascension-assessor",
    name: "Ascension Parish Assessor Property Search",
    primaryUrl: "https://www.ascensionparishla.gov/government/assessor",
    notes: "We search by parcel or owner to track land transfers near industrial corridors.",
  },
  {
    slug: "ebr-gis",
    name: "East Baton Rouge Parish GIS / Assessor",
    primaryUrl: "https://gis.brla.gov",
    notes: "EBR GIS layers include zoning changes, permits, and parcel sales. We poll the assessor feed.",
  },
  {
    slug: "calcasieu-assessor",
    name: "Calcasieu Parish Assessor Property Search",
    primaryUrl: "https://www.calcasieuassessor.com",
    notes: "Calcasieu (Lake Charles area) is a major LNG/industrial zone. We track large parcel sales.",
  },
  {
    slug: "sec-edgar",
    name: "SEC EDGAR Full-Text Search",
    primaryUrl: "https://efts.sec.gov/LATEST/search-index?q=%22Gulf+Coast%22&dateRange=custom&startdt={ISO}&enddt={ISO}",
    notes: "We search EDGAR for 8-K and S-1 filings mentioning Gulf Coast projects.",
  },
  {
    slug: "sam-gov",
    name: "SAM.gov Contract Opportunities",
    primaryUrl: "https://api.sam.gov/opportunities/v2/search",
    notes: "Federal procurement: we search for EPC/construction contracts in Gulf Coast NAICS codes.",
  },
  {
    slug: "emma-msrb",
    name: "EMMA (MSRB) Municipal Bond Disclosures",
    primaryUrl: "https://emma.msrb.org",
    notes: "EMMA has continuing-disclosure filings for industrial-revenue bonds used by Gulf Coast projects.",
  },
  {
    slug: "tceq",
    name: "TCEQ Air Permit Applications",
    primaryUrl: "https://www15.tceq.texas.gov/crpub/index.cfm?fuseaction=iwr.air",
    notes: "Texas Commission on Environmental Quality: air permits for SE Texas (Beaumont/Port Arthur corridor).",
  },
];

/**
 * Research a single source and return the markdown content.
 */
export async function researchSource(src: SourceDescriptor): Promise<string> {
  const prompt = [
    `You are a senior software engineer documenting the public API / HTML schema of a data source for a web scraper.`,
    `Source: ${src.name}`,
    `Primary URL: ${src.primaryUrl}`,
    src.notes ? `Context: ${src.notes}` : "",
    "",
    "Please research and document:",
    "1. The exact URL pattern used to search or list public records (with all required query parameters).",
    "2. The response format (HTML table structure, JSON fields, PDF layout, RSS feed, etc.).",
    "3. Key field names and what they contain (e.g., project name, status, date, dollar amount, location).",
    "4. Any pagination pattern (page=N, cursor, offset, etc.).",
    "5. Rate limits or robots.txt restrictions that affect scraping.",
    "6. Any recent changes to the site schema (within the past 12 months).",
    "7. A minimal working example of the HTTP request (curl or fetch).",
    "",
    "Format your response as clean GitHub-flavored Markdown with headings.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await deepResearch({
    agent: `source-schema-researcher.${src.slug}`,
    systemPrompt: "You are an expert at reverse-engineering public government data portals.",
    user: prompt,
  });

  const citations =
    result.citations.length > 0
      ? `\n\n## Sources\n${result.citations.map((c) => `- [${c.title ?? c.url}](${c.url})`).join("\n")}`
      : "";

  return [
    `# ${src.name} — Schema Research`,
    ``,
    `> **Generated by** \`source-schema-researcher\` · model: sonar-deep-research · cost: $${result.costUsd.toFixed(4)}`,
    ``,
    result.text,
    citations,
  ].join("\n");
}

/**
 * Research all sources and write artifacts to disk.
 */
export async function researchAll(outputDir: string, slugs?: string[]): Promise<void> {
  const sources = slugs
    ? GULF_COAST_SOURCES.filter((s) => slugs.includes(s.slug))
    : GULF_COAST_SOURCES;

  console.log(`Researching ${sources.length} sources…`);

  for (const src of sources) {
    console.log(`  → ${src.slug}`);
    try {
      const md = await researchSource(src);
      const outPath = path.join(outputDir, `${src.slug}.md`);
      await fs.writeFile(outPath, md, "utf-8");
      console.log(`     ✓ wrote ${outPath}`);
    } catch (err) {
      console.error(`     ✗ ${src.slug}: ${(err as Error).message}`);
    }
  }
}
