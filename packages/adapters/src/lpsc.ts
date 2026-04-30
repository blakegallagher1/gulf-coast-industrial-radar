/**
 * LPSC (Louisiana Public Service Commission) adapter.
 *
 * Schema reference: packages/adapters/src/research/lpsc.md
 *
 * Phase 3.1 hardening notes:
 *   - Old path (/lpscpubvalence/PSC_Reports.aspx) was incorrect.
 *   - Confirmed URL for the public bulletin / new-filings list:
 *     https://lpsc.louisiana.gov/portal/lpsc-web-portal?tab=bulletin
 *   - Docket number regex extended to include T-prefix for transport
 *     dockets (T-NNNNN) in addition to U-prefix utility dockets.
 *   - Industry types covered: electric, gas, telecom, water, transport.
 *
 * Predicate vocabulary:
 *   regulatory.rate.filing    — rate-change / tariff filing
 *   regulatory.cert.filing    — certificate of public convenience
 *   regulatory.complaint      — formal complaint docket
 *   regulatory.other          — anything else on the bulletin
 */

import type {
  SourceAdapter,
  AdapterContext,
  AdapterResult,
  AdapterRecord,
} from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";
import * as cheerio from "cheerio";

const BASE = "https://lpsc.louisiana.gov";
const BULLETIN_PATH = "/portal/lpsc-web-portal?tab=bulletin";

// Matches U-NNNNN (utility) and T-NNNNN (transport) docket formats.
const DOCKET_RE = /[UT]-\d{5}/;

export const lpscAdapter: SourceAdapter = {
  id: "lpsc",

  async fetch(ctx: AdapterContext): Promise<AdapterResult> {
    const url = `${BASE}${BULLETIN_PATH}`;

    let html: string;
    try {
      const res = await fetchWithRetry(url);
      html = await res.text();
    } catch (err) {
      ctx.logger?.warn("lpsc fetch failed", { err });
      return { records: [] };
    }

    const $ = cheerio.load(html);
    const records: AdapterRecord[] = [];

    // Each bulletin entry is a table row or a list item depending on the
    // portal version. We parse <tr> with a docket number in the first cell.
    $("tr, li").each((_, el) => {
      const text = $(el).text();
      const docketMatch = text.match(DOCKET_RE);
      if (!docketMatch) return;

      const docket = docketMatch[0];
      const linkEl = $(el).find("a").first();
      const href = linkEl.attr("href") ?? "";
      const title = linkEl.text().trim() || text.trim().slice(0, 120);

      records.push({
        sourceId: `lpsc:${docket}`,
        predicate: classifyLpsc(text),
        title,
        description: `LPSC docket ${docket}`,
        url: href.startsWith("http") ? href : `${BASE}${href}`,
        fetchedAt: new Date().toISOString(),
      });
    });

    return { records };
  },
};

function classifyLpsc(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("rate") || t.includes("tariff")) return "regulatory.rate.filing";
  if (t.includes("certificate") || t.includes("cpcn"))
    return "regulatory.cert.filing";
  if (t.includes("complaint")) return "regulatory.complaint";
  return "regulatory.other";
}
