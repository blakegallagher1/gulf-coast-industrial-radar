/**
 * TCEQ (Texas Commission on Environmental Quality) adapter.
 *
 * Schema reference: packages/adapters/src/research/tceq.md
 *
 * Phase 3.1 hardening notes:
 *   - The original BASE URL pointed to a navigation/search page, not a
 *     data table. Corrected to the two confirmed listing pages:
 *       NSR pending:   https://www.tceq.texas.gov/permitting/air/nsr-permits/nsr-pending-permits.html
 *       Title V pending: https://www.tceq.texas.gov/permitting/air/titlev/titlev-pending-permits.html
 *   - Both pages share the same HTML column order confirmed by the
 *     research artifact: [Applicant, Facility, Permit#, Received, Link]
 *   - Alphabetical-index rows (single-letter <tr> headings) are filtered
 *     out by requiring at least 4 non-empty cells.
 *   - Scraping two pages increases permit coverage; records from both
 *     feeds are merged in the same return value.
 *
 * Predicate vocabulary:
 *   permit.air.NSR           — New Source Review permit
 *   permit.air.TitleV        — Title V major-source operating permit
 */

import type {
  SourceAdapter,
  AdapterContext,
  AdapterResult,
  AdapterRecord,
} from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";
import * as cheerio from "cheerio";

const BASE = "https://www.tceq.texas.gov";
const NSR_PATH = "/permitting/air/nsr-permits/nsr-pending-permits.html";
const TITLEV_PATH = "/permitting/air/titlev/titlev-pending-permits.html";

const FEEDS: Array<{ path: string; predicate: string }> = [
  { path: NSR_PATH, predicate: "permit.air.NSR" },
  { path: TITLEV_PATH, predicate: "permit.air.TitleV" },
];

export const tceqAdapter: SourceAdapter = {
  id: "tceq",

  async fetch(ctx: AdapterContext): Promise<AdapterResult> {
    const allRecords: AdapterRecord[] = [];

    for (const feed of FEEDS) {
      const url = `${BASE}${feed.path}`;
      let html: string;
      try {
        const res = await fetchWithRetry(url);
        html = await res.text();
      } catch (err) {
        ctx.logger?.warn(`tceq fetch failed for ${feed.path}`, { err });
        continue;
      }

      const $ = cheerio.load(html);

      // Column order: Applicant | Facility | Permit# | Received | Link
      // Alphabetical-index rows have only 1 non-empty cell — skip them.
      $("table tr").each((_, row) => {
        const cells = $(row).find("td");
        const nonEmpty = cells
          .toArray()
          .filter((c) => $(c).text().trim() !== "");
        if (nonEmpty.length < 4) return;

        const applicant = $(cells[0]).text().trim();
        const facility = $(cells[1]).text().trim();
        const permitNo = $(cells[2]).text().trim();
        const received = $(cells[3]).text().trim();
        const linkEl = $(cells[4]).find("a");
        const href = linkEl.attr("href") ?? "";

        if (!permitNo) return;

        allRecords.push({
          sourceId: `tceq:${permitNo}`,
          predicate: feed.predicate,
          title: facility || applicant,
          description: `TCEQ ${feed.predicate} — ${applicant} — ${facility}`,
          location: { state: "TX" },
          date: received || undefined,
          url: href.startsWith("http") ? href : `${BASE}${href}`,
          fetchedAt: new Date().toISOString(),
        });
      });
    }

    return { records: allRecords };
  },
};
