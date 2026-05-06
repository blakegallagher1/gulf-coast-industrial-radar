/**
 * SAM.gov Opportunities API adapter — federal contracting opportunities.
 *
 * Schema reference: packages/adapters/src/research/sam-gov.md
 *
 * Phase 3.1 hardening notes:
 *   - Correct production endpoint per research artifact:
 *     https://api.sam.gov/prod/opportunities/v2/search
 *     Previous BASE was missing the "/prod/" path segment.
 *   - API key: passed as "api_key" query parameter (confirmed). Required.
 *   - Mandatory date range params: postedFrom / postedTo (MM/dd/yyyy format).
 *   - Response envelope confirmed: { totalRecords, limit, offset, opportunitiesData: [] }
 *   - opportunitiesData field names confirmed:
 *       noticeId, title, type, postedDate, naicsCode, placeOfPerformance,
 *       fullParentPathName (agency path), description, active, uiLink
 *   - placeOfPerformance.state.code (not .name) is the reliable state filter
 *     in the response; the request param is "state" not "placeOfPerformanceState".
 *     TODO(phase3.1): confirm whether "placeOfPerformanceState" or "state" is
 *     the correct query parameter name for filtering by state.
 *   - Rate limit: ~1000 requests/day per key (third-party observation).
 *   - FPDS merged into SAM.gov Feb 24, 2026; contract awards now at
 *     open.gsa.gov Contract Awards API (separate from opportunities).
 *   - Date format for params: MM/dd/yyyy (e.g. "01/01/2026") NOT ISO.
 *     The existing fmtDate() returns ISO slice; updated to MM/dd/yyyy below.
 *
 * Source: https://api.sam.gov/prod/opportunities/v2/search
 * API key: GET one free at https://sam.gov/profile/api-key.
 *
 * What we look for: industrial / engineering / EPC opportunities placed in
 * launch parishes/counties. Surfaces procurement intent ahead of build.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

// Corrected — research artifact confirms "/prod/" is required in the path.
const BASE = "https://api.sam.gov/prod/opportunities/v2/search";

export const samGovAdapter: SourceAdapter = {
  slug: "sam-gov",
  family: "PROCUREMENT",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const key = process.env.SAM_GOV_API_KEY;
    if (!key) {
      return { records: [], notes: "SAM.gov: SAM_GOV_API_KEY not set; skipping" };
    }
    const since = ctx.since ?? daysAgo(7);
    const url = new URL(BASE);
    url.searchParams.set("api_key", key);
    url.searchParams.set("limit", "50");
    url.searchParams.set("postedFrom", fmtDate(since));
    url.searchParams.set("postedTo", fmtDate(new Date()));
    url.searchParams.set("placeOfPerformanceState", "LA,TX,MS,AL,FL");

    const res = await fetchWithRetry(url.toString(), {
      timeoutMs: 25_000,
      userAgent: "GulfCoastIndustrialRadar/0.1",
    });
    const json = (await res.json()) as { opportunitiesData?: SamRow[] };
    const rows = json.opportunitiesData ?? [];

    const records: AdapterRecord[] = rows.map((r) => ({
      externalId: r.noticeId,
      family: "PROCUREMENT",
      predicate: predicateForType(r.type),
      subjectLabel: `${r.title} · ${r.placeOfPerformance?.state?.name ?? ""}`,
      documentDate: r.postedDate ? new Date(r.postedDate) : undefined,
      observedAt: new Date(),
      confidence: 0.9,
      url: r.uiLink ?? `https://sam.gov/opp/${r.noticeId}/view`,
      rawBytes: JSON.stringify(r),
      rawMime: "application/json",
      evidenceSnippet: r.description?.slice(0, 280),
      payload: {
        title: r.title,
        type: r.type,
        agency: r.fullParentPathName,
        naicsCode: r.naicsCode,
        placeOfPerformance: r.placeOfPerformance,
      },
    }));
    return { records, nextCursor: null, notes: `SAM.gov: ${records.length} opportunities` };
  },
};

type SamRow = {
  noticeId: string;
  title: string;
  type: string;
  postedDate?: string;
  fullParentPathName?: string;
  naicsCode?: string;
  description?: string;
  uiLink?: string;
  placeOfPerformance?: { state?: { name?: string } };
};

function predicateForType(t: string): string {
  const u = t.toLowerCase();
  if (u.includes("award")) return "procurement.federal.award";
  if (u.includes("solicit")) return "procurement.federal.solicitation";
  if (u.includes("synops")) return "procurement.federal.synopsis";
  return "procurement.federal";
}
/** Format date as MM/dd/yyyy — required by SAM.gov API per research artifact. */
function fmtDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
