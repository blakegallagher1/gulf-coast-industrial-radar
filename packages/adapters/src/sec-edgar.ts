/**
 * SEC EDGAR adapter.
 *
 * Source: https://data.sec.gov / https://efts.sec.gov/LATEST/search-index
 * Full-text search API (free, no key, requires a User-Agent header).
 *
 * We search for 8-K and 10-K filings mentioning Gulf Coast industrial
 * keywords. The EDGAR full-text search returns hits with highlighted
 * excerpts — ideal for quick signal extraction without pulling full PDFs.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const EFTS_BASE = process.env.SEC_EFTS_BASE ?? "https://efts.sec.gov";

const QUERIES = [
  '"Gulf Coast" "industrial" "construction"',
  '"Louisiana" "LNG" "permit"',
  '"Mississippi River" "petrochemical" "investment"',
  '"Lake Charles" "facility" "construction"',
];

export const secEdgarAdapter: SourceAdapter = {
  slug: "sec-edgar",
  family: "REGULATORY",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const since = ctx.since ?? daysAgo(14);
    const ua = process.env.SEC_EDGAR_USER_AGENT ?? "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com";

    const records: AdapterRecord[] = [];

    for (const q of QUERIES) {
      const params = new URLSearchParams({
        q,
        dateRange: "custom",
        startdt: since.toISOString().slice(0, 10),
        enddt: new Date().toISOString().slice(0, 10),
        forms: "8-K,10-K,SC 13D,SC 13G",
      });
      try {
        const res = await fetchWithRetry(`${EFTS_BASE}/LATEST/search-index?${params}`, {
          timeoutMs: 20_000,
          userAgent: ua,
        });
        const json = (await res.json()) as EdgarResponse;
        for (const hit of json.hits?.hits ?? []) {
          records.push({
            externalId: hit._id,
            family: "REGULATORY",
            predicate: `sec.${hit._source.form_type ?? "filing"}.edgar`,
            subjectLabel: `${hit._source.entity_name ?? "Company"} · ${hit._source.form_type ?? ""} · ${hit._source.file_date ?? ""}`,
            documentDate: hit._source.file_date ? new Date(hit._source.file_date) : undefined,
            observedAt: new Date(),
            confidence: 0.85,
            url: `https://www.sec.gov/Archives/edgar/data/${hit._source.entity_id}/`,
            rawBytes: JSON.stringify(hit._source),
            rawMime: "application/json",
            evidenceSnippet: hit.highlight?.file_date?.[0] ?? hit._source.entity_name,
            payload: {
              cik: hit._source.entity_id ?? null,
              formType: hit._source.form_type ?? null,
              entityName: hit._source.entity_name ?? null,
              fileDate: hit._source.file_date ?? null,
            },
          });
        }
      } catch {
        /* continue with other queries */
      }
    }

    return {
      records,
      nextCursor: null,
      notes: `SEC EDGAR: ${records.length} filings across ${QUERIES.length} queries`,
    };
  },
};

type EdgarResponse = {
  hits?: {
    hits: Array<{
      _id: string;
      _source: {
        entity_name?: string;
        entity_id?: string;
        form_type?: string;
        file_date?: string;
      };
      highlight?: { file_date?: string[] };
    }>;
  };
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
