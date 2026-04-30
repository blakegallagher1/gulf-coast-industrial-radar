/**
 * SEC EDGAR full-text search adapter
 *
 * Phase 3 fix: rate-limit cap tightened (burst window reduced in Q1 2025).
 * Now enforces 1 req/s (down from 3 req/s burst) via a simple token bucket.
 */

import { fetch } from "undici";

const EFTS_BASE = "https://efts.sec.gov/LATEST/search-index";
const MIN_REQUEST_INTERVAL_MS = 1000; // 1 req/s hard cap

let lastRequestAt = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = MIN_REQUEST_INTERVAL_MS - (now - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  return fetch(url, {
    headers: {
      "User-Agent": "GulfCoastIndustrialRadar/0.3 contact@gcir.dev",
      Accept: "application/json",
    },
  }) as unknown as Response;
}

export type EdgarFiling = {
  id: string;
  fileDate: string;
  entityName: string;
  formType: string;
  periodOfReport: string;
};

export async function searchFilings(
  query: string,
  opts: { startDate: string; endDate: string; forms?: string; from?: number; size?: number },
): Promise<{ total: number; filings: EdgarFiling[] }> {
  const url = new URL(EFTS_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("dateRange", "custom");
  url.searchParams.set("startdt", opts.startDate);
  url.searchParams.set("enddt", opts.endDate);
  if (opts.forms) url.searchParams.set("forms", opts.forms);
  url.searchParams.set("from", String(opts.from ?? 0));
  url.searchParams.set("size", String(opts.size ?? 20));

  const res = await rateLimitedFetch(url.toString());
  if (!res.ok) throw new Error(`SEC EDGAR HTTP ${res.status}`);

  const json = (await res.json()) as {
    hits: {
      total: { value: number };
      hits: Array<{
        _id: string;
        _source: {
          file_date: string;
          entity_name: string;
          form_type: string;
          period_of_report: string;
        };
      }>;
    };
  };

  return {
    total: json.hits.total.value,
    filings: json.hits.hits.map((h) => ({
      id: h._id,
      fileDate: h._source.file_date,
      entityName: h._source.entity_name,
      formType: h._source.form_type,
      periodOfReport: h._source.period_of_report,
    })),
  };
}
