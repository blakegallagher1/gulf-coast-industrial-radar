/**
 * USACE MVN (Mississippi Valley New Orleans District) adapter.
 *
 * Schema reference: packages/adapters/src/research/usace-mvn.md
 *
 * Phase 3.1 hardening notes:
 *   - Primary permit-notices URL confirmed:
 *     https://www.mvn.usace.army.mil/Missions/Regulatory/Announcements/
 *   - The notices page lists PDF / HTML public-notice links. Each notice
 *     has a date, permit application number, and project description.
 *   - Section 408 (alterations to federal works) lives at a separate path.
 *     Constant _SECTION_408_PATH is recorded here for the follow-up
 *     second-feed merge (phase 3.2).
 *   - HTML structure: table with columns
 *     [Date Issued, Permit Number, Project Name, Location, Expiration]
 *     — confirmed by the research artifact sample.
 *
 * Predicate vocabulary:
 *   permit.wetlands.404      — Section 404 / nationwide permit
 *   permit.wetlands.408      — Section 408 alteration-to-federal-works
 */

import type {
  SourceAdapter,
  AdapterContext,
  AdapterResult,
  AdapterRecord,
} from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";
import * as cheerio from "cheerio";

const BASE = "https://www.mvn.usace.army.mil";
const NOTICES_PATH = "/Missions/Regulatory/Announcements/";

/**
 * Section 408 notices — kept as constant for phase 3.2 merge.
 * @see https://www.mvn.usace.army.mil/Missions/Regulatory/Section-408/
 */
export const _SECTION_408_PATH = "/Missions/Regulatory/Section-408/";

export const usaceMvnAdapter: SourceAdapter = {
  id: "usace-mvn",

  async fetch(ctx: AdapterContext): Promise<AdapterResult> {
    const url = `${BASE}${NOTICES_PATH}`;

    let html: string;
    try {
      const res = await fetchWithRetry(url);
      html = await res.text();
    } catch (err) {
      ctx.logger?.warn("usace-mvn fetch failed", { err });
      return { records: [] };
    }

    const $ = cheerio.load(html);
    const records: AdapterRecord[] = [];

    // The public-notice table has a header row followed by data rows.
    // Columns: Date Issued | Permit Number | Project Name | Location | Expiration
    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 4) return;

      const dateText = $(cells[0]).text().trim();
      const permitNo = $(cells[1]).text().trim();
      const projectName = $(cells[2]).text().trim();
      const location = $(cells[3]).text().trim();
      const linkEl = $(cells[2]).find("a");
      const href = linkEl.attr("href") ?? "";

      if (!permitNo || !projectName) return;

      records.push({
        sourceId: `usace-mvn:${permitNo}`,
        predicate: "permit.wetlands.404",
        title: projectName,
        description: `USACE MVN public notice — ${permitNo} — ${location}`,
        location: { raw: location },
        url: href.startsWith("http") ? href : `${BASE}${href}`,
        date: dateText || undefined,
        fetchedAt: new Date().toISOString(),
      });
    });

    return { records };
  },
};
