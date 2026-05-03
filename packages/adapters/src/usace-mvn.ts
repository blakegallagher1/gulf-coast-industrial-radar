/**
 * USACE New Orleans District public notices adapter.
 *
 * Schema reference: packages/adapters/src/research/usace-mvn.md
 *
 * !! PAUSED — Akamai WAF block (HTTP 403) !!
 *
 *   As of 2026-05-02 the site is protected by Akamai GHost CDN/WAF and
 *   returns HTTP 403 "Access Denied" for ALL non-browser requests, regardless
 *   of User-Agent. This is infrastructure-level bot filtering, not a header
 *   issue. Switching to a browser UA did not help.
 *
 *   The source record in the database has been set to status: PAUSED.
 *   To re-enable, one of the following mitigations is needed:
 *     a) Use a headless browser (Playwright) with a real browser fingerprint, or
 *     b) Poll the RSS feed instead (orange RSS button on the notices page — URL
 *        likely https://www.mvn.usace.army.mil/rss/notices.aspx or similar), or
 *     c) Consume USACE public notices via the Permit Application Manager (PAM)
 *        API if/when USACE opens a public API surface.
 *
 *   Confirmed via: curl -v returns "server: AkamaiGHost" + 403 with
 *   Reference #18.e8b219b8.1777793972.3959bd2d
 *
 * Phase 3.1 hardening notes (original):
 *   - Primary URL confirmed: https://www.mvn.usace.army.mil/Missions/Regulatory/Public-Notices/
 *   - Section 408-specific URL confirmed:
 *     https://www.mvn.usace.army.mil/Missions/Section-408/Public-Notices/
 *     The existing adapter only polls the Regulatory path. A second fetch
 *     of the Section 408 path would surface 408-only notices.
 *     TODO(phase3.1): add Section 408 notice feed as second URL.
 *   - HTML structure: notices listed with issuance date, expiration date,
 *     project type, and links to PDF(s). No JSON/API surface.
 *   - PDF link pattern: The existing regex matches "PublicNotice" in href.
 *     The research artifact confirms links are to "Public Notice" PDFs.
 *     Pattern is correct; no change needed.
 *   - Pagination: notices are organised by year (e.g. /Public-Notices/2026/);
 *     the current implementation only scrapes the main listing page.
 *     TODO(phase3.1): paginate back across prior years if needed.
 *   - No auth, no rate-limit observed on static site (research from Apr 30 2026;
 *     Akamai WAF was added subsequently).
 *
 * Source: https://www.mvn.usace.army.mil/Missions/Regulatory/Public-Notices/
 * Section 10, 404, 408, NEPA, regulatory notices for the lower Mississippi.
 *
 * Implementation: HTML scrape with cheerio-free parsing. Each notice gets a
 * RawDocument with the linked PDF and a parsed first-page excerpt.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.USACE_MVN_BASE ?? "https://www.mvn.usace.army.mil";
const NOTICES_PATH = "/Missions/Regulatory/Public-Notices/";
// Section 408 notices (confirmed distinct URL per research artifact).
// TODO(phase3.1): fetch SECTION_408_PATH in a second request and merge records.
const _SECTION_408_PATH = "/Missions/Section-408/Public-Notices/";

export const usaceMvnAdapter: SourceAdapter = {
  slug: "usace-mvn",
  family: "ENVIRONMENTAL_PERMIT",
  implemented: true,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const url = BASE + NOTICES_PATH;
    const res = await fetchWithRetry(url, {
      timeoutMs: 25_000,
      userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
    });
    const html = await res.text();

    // Pattern: <a href="...PublicNotice...pdf">Title</a> + adjacent date cell.
    const items = Array.from(
      html.matchAll(/<a[^>]*href="([^"]*PublicNotice[^"]+\.pdf)"[^>]*>([^<]+)<\/a>/gi),
    );

    const records: AdapterRecord[] = items.slice(0, 50).map((m) => {
      const rawLink = m[1] ?? "";
      const link = rawLink.startsWith("http") ? rawLink : BASE + rawLink;
      const title = decode((m[2] ?? "").trim());
      return {
        externalId: link,
        family: "ENVIRONMENTAL_PERMIT",
        predicate: predicateFromTitle(title),
        subjectLabel: title,
        observedAt: new Date(),
        confidence: 0.9,
        url: link,
        rawBytes: JSON.stringify({ link, title }),
        rawMime: "application/json",
        evidenceSnippet: title,
        payload: { titleRaw: title, pdfUrl: link },
      };
    });

    return { records, nextCursor: null, notes: `USACE MVN: ${records.length} public notices` };
  },
};

function predicateFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("section 10")) return "permit.section10";
  if (t.includes("section 404") || t.includes("404 ")) return "permit.wetlands.404";
  if (t.includes("section 408")) return "permit.section408";
  if (t.includes("nepa")) return "permit.nepa";
  return "permit.usace.notice";
}

function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}
