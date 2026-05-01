/**
 * SEC EDGAR adapter.
 *
 * Source: https://data.sec.gov
 * Public-company capex / FID / FEED disclosures in 8-K, 10-K, 10-Q.
 *
 * SEC requires a real User-Agent. Set SEC_EDGAR_USER_AGENT in env.
 *
 * Strategy: pull the filings index for a watchlist of tickers / CIKs that
 * matter for Gulf Coast formation (Woodside, NextDecade, Air Products, etc.)
 * and emit PUBLIC_COMPANY signals when a filing's full-text contains a
 * launch parish + capex/FID/FEED keyword.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const UA = process.env.SEC_EDGAR_USER_AGENT ?? "GulfCoastIndustrialRadar contact@gallagherpropco.com";

/** Watch list — companies with disclosed Gulf Coast capex history. */
const WATCH = [
  { cik: "0001321517", name: "NextDecade Corp" },
  { cik: "0000002969", name: "Air Products and Chemicals" },
  { cik: "0001140536", name: "Cheniere Energy" },
  { cik: "0001489096", name: "Tellurian / Driftwood" },
  { cik: "0001543151", name: "Energy Transfer LP" },
  // Add as the watch list expands; can also be loaded from DB.
];

const PARISH_KEYWORDS = [
  "Ascension","St. James","Plaquemines","St. Charles","St. John","St. Bernard",
  "Calcasieu","Cameron","East Baton Rouge","Iberville","West Baton Rouge",
  "Mobile","Pascagoula","Beaumont","Port Arthur","Brownsville","Donaldsonville",
];
const CAPEX_HINTS = ["FID","FEED","capex","capital investment","capital expenditure","final investment decision","engineering, procurement"];

export const secEdgarAdapter: SourceAdapter = {
  slug: "sec-edgar",
  family: "PUBLIC_COMPANY",
  implemented: true,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const records: AdapterRecord[] = [];

    for (const company of WATCH) {
      const url = `https://data.sec.gov/submissions/CIK${company.cik.padStart(10, "0")}.json`;
      let json: SubmissionsResponse;
      try {
        const res = await fetchWithRetry(url, {
          headers: { "Accept": "application/json" },
          userAgent: UA,
          timeoutMs: 20_000,
        });
        json = (await res.json()) as SubmissionsResponse;
      } catch {
        continue;
      }

      const recent = json?.filings?.recent;
      if (!recent) continue;

      const limit = Math.min(20, recent.accessionNumber?.length ?? 0);
      for (let i = 0; i < limit; i++) {
        const form = recent.form?.[i] ?? "";
        const accession = recent.accessionNumber?.[i] ?? "";
        const date = recent.filingDate?.[i] ?? "";
        if (!["8-K", "10-K", "10-Q", "20-F"].includes(form)) continue;

        const docUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=${form}&dateb=&owner=include&count=40`;
        records.push({
          externalId: accession || `${company.cik}-${i}`,
          family: "PUBLIC_COMPANY",
          predicate: `sec.filing.${form}`,
          subjectLabel: `${company.name} · ${form}`,
          documentDate: date ? new Date(date) : undefined,
          observedAt: new Date(),
          confidence: 0.7,
          url: docUrl,
          rawBytes: JSON.stringify({ cik: company.cik, form, accession, date }),
          rawMime: "application/json",
          evidenceSnippet: `${company.name} · ${form} filed ${date}`,
          payload: {
            cik: company.cik,
            company: company.name,
            form,
            accession,
            filingDate: date,
            // Full-text scan and parish/keyword match happens in the
            // DocumentExtraction agent (handles XBRL + raw HTML).
            requiresFullTextScan: true,
            parishKeywords: PARISH_KEYWORDS,
            capexHints: CAPEX_HINTS,
          },
        });
      }

      // SEC enforces a 10 req/s rate limit and rejects requests without a
      // real User-Agent. We hold the cap with a 110ms inter-request sleep
      // (≈9 req/s, leaving headroom). UA already enforced via fetchWithRetry.
      await sleep(110);
    }

    return { records, nextCursor: null, notes: `EDGAR: ${records.length} filings indexed` };
  },
};

type SubmissionsResponse = {
  filings?: {
    recent?: {
      accessionNumber?: string[];
      form?: string[];
      filingDate?: string[];
    };
  };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
