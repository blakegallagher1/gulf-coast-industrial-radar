/**
 * SAM.gov Opportunities API adapter — federal contract notices.
 *
 * Source: https://api.sam.gov/prod/opportunities/v2/search
 * API key required (SAM_GOV_API_KEY env var).
 *
 * We filter for construction + energy / utilities NAICS codes in Gulf Coast
 * states (LA, TX, MS, AL). The API returns structured JSON — we don't need
 * to scrape HTML here.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.SAM_GOV_BASE ?? "https://api.sam.gov/prod/opportunities/v2";
const API_KEY = process.env.SAM_GOV_API_KEY;

// NAICS codes of interest: heavy construction, energy, chemical manufacturing
const TARGET_NAICS = [
  "237110", // Water & sewer lines
  "237120", // Oil & gas pipeline
  "237130", // Power & communication lines
  "237990", // Other heavy construction
  "325110", // Petrochemicals
  "325120", // Industrial gases
  "493190", // Other warehousing (LNG)
  "221112", // Fossil fuel power
  "221118", // Other electric power
];

export const samGovAdapter: SourceAdapter = {
  slug: "sam-gov",
  family: "PROCUREMENT",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    if (!API_KEY) {
      return { records: [], nextCursor: null, notes: "SAM_GOV_API_KEY not set — skipped" };
    }

    const since = ctx.since ?? daysAgo(14);
    const params = new URLSearchParams({
      api_key: API_KEY,
      postedFrom: since.toISOString().slice(0, 10),
      postedTo: new Date().toISOString().slice(0, 10),
      ptype: "o", // presolicitations + solicitations
      limit: "100",
      offset: "0",
      naicsCodes: TARGET_NAICS.join(","),
      placeOfPerformanceState: "LA,TX,MS,AL",
    });

    const res = await fetchWithRetry(`${BASE}/search?${params}`, {
      timeoutMs: 30_000,
      userAgent: `GulfCoastIndustrialRadar/0.1 ${process.env.SEC_EDGAR_USER_AGENT ?? ""}`.trim(),
    });
    const json = (await res.json()) as SamResponse;

    const records: AdapterRecord[] = (json.opportunitiesData ?? []).map((opp) => ({
      externalId: opp.noticeId,
      family: "PROCUREMENT",
      predicate: `procurement.${opp.type ?? "notice"}.federal`,
      subjectLabel: opp.title.slice(0, 140),
      documentDate: opp.postedDate ? new Date(opp.postedDate) : undefined,
      observedAt: new Date(),
      confidence: 0.97,
      url: opp.uiLink ?? `https://sam.gov/opp/${opp.noticeId}`,
      rawBytes: JSON.stringify(opp),
      rawMime: "application/json",
      evidenceSnippet: `${opp.naicsCode} · ${opp.organizationName ?? "?"} · ${opp.placeOfPerformance?.state?.name ?? "?"}`,
      payload: {
        noticeId: opp.noticeId,
        title: opp.title,
        type: opp.type ?? null,
        naicsCode: opp.naicsCode ?? null,
        organization: opp.organizationName ?? null,
        state: opp.placeOfPerformance?.state?.name ?? null,
      },
    }));

    return {
      records,
      nextCursor: null,
      notes: `SAM.gov: ${records.length} opportunities since ${since.toISOString().slice(0, 10)}`,
    };
  },
};

// ─── SAM.gov response types ─────────────────────────────────────────────────────────

type SamResponse = { opportunitiesData?: SamOpp[]; totalRecords?: number };
type SamOpp = {
  noticeId: string;
  title: string;
  type?: string;
  postedDate?: string;
  responseDeadLine?: string;
  naicsCode?: string;
  organizationName?: string;
  uiLink?: string;
  placeOfPerformance?: { state?: { code?: string; name?: string }; city?: { name?: string } };
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
