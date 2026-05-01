/**
 * Louisiana Public Service Commission docket portal adapter.
 *
 * Schema reference: packages/adapters/src/research/lpsc.md
 *
 * Phase 3.1 hardening notes:
 *   - Portal home URL confirmed: https://lpscpubvalence.lpsc.louisiana.gov/portal/lpsc-web-portal
 *   - Docket detail URL confirmed: /portal/PSC/DocketDetails?docketId={id}
 *   - The previous LIST_PATH "/lpscpubvalence/PSC_Reports.aspx" does NOT
 *     match the research artifact. The portal home is at
 *     /portal/lpsc-web-portal (not /lpscpubvalence/...). Updated below.
 *   - Bulletin tab confirmed: /portal/lpsc-web-portal?tab=bulletin (the
 *     April 2026 bulletin list shows docket IDs and links to PDF ViewFile).
 *   - No docket-list REST endpoint observed. The portal is JS-driven for tab
 *     content. A best-effort GET of the bulletin tab may return a partial HTML
 *     list; full scraping requires headless browser.
 *     TODO(phase3.1): migrate to Playwright once headless tier is available.
 *   - Docket row schema from HTML research: "Docket Number", "Date Opened",
 *     "Status", "Description". Docket numbers use T-/U- prefix for transport
 *     and utility. The existing row-parser regex /^[UR]-\d+/i is correct for
 *     U- prefixes but misses T- (transport). Updated regex to include T-.
 *   - No auth, no rate-limit documented.
 *
 * Source: https://lpscpubvalence.lpsc.louisiana.gov/portal/lpsc-web-portal
 * Utility / power / generation / transmission filings. Industrial-scale
 * interconnection requests are the highest-leverage signal here.
 *
 * Implementation: docket list scrape; we parse the public docket bulletin.
 * The portal is JS-rendered but the bulletin tab emits partial server HTML.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.LPSC_BASE ?? "https://lpscpubvalence.lpsc.louisiana.gov";
// Corrected path — research artifact confirms the portal home and bulletin tab.
const LIST_PATH = "/portal/lpsc-web-portal?tab=bulletin";

export const lpscAdapter: SourceAdapter = {
  slug: "lpsc",
  family: "UTILITY_POWER",
  implemented: true,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const url = BASE + LIST_PATH;
    const res = await fetchWithRetry(url, {
      timeoutMs: 25_000,
      userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
    });
    const html = await res.text();

    // Parse <tr> rows in the docket grid
    const items = parseDockets(html);
    const records: AdapterRecord[] = items.slice(0, 50).map((d) => ({
      externalId: `lpsc:${d.docketNo}`,
      family: "UTILITY_POWER",
      predicate: predicateFromTitle(d.title),
      subjectLabel: `${d.docketNo} · ${d.title.slice(0, 80)}`,
      documentDate: d.filedAt,
      observedAt: new Date(),
      confidence: 0.88,
      url,
      rawBytes: JSON.stringify(d),
      rawMime: "application/json",
      evidenceSnippet: d.title.slice(0, 280),
      payload: {
        docketNo: d.docketNo,
        title: d.title,
        applicant: d.applicant,
        filedAt: d.filedAt?.toISOString() ?? null,
      },
    }));
    return { records, nextCursor: null, notes: `LPSC: ${records.length} dockets` };
  },
};

type LpscRow = { docketNo: string; title: string; applicant?: string; filedAt?: Date };

function parseDockets(html: string): LpscRow[] {
  const out: LpscRow[] = [];
  const rows = html.split(/<tr[^>]*>/i).slice(1);
  for (const r of rows) {
    const cells = Array.from(r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim(),
    );
    if (cells.length < 3) continue;
    const docket = cells[0] ?? "";
    // Research artifact confirms T- (transport) and U- (utility) prefixes.
    if (!/^[TUR]-\d+/i.test(docket)) continue;
    out.push({
      docketNo: docket,
      title: cells[1] ?? "",
      applicant: cells[2] ?? undefined,
      filedAt: cells[3] ? safeDate(cells[3]) : undefined,
    });
  }
  return out;
}

function predicateFromTitle(t: string): string {
  const u = t.toLowerCase();
  if (u.includes("interconnection")) return "utility.interconnection";
  if (u.includes("transmission")) return "utility.transmission";
  if (u.includes("generation") || u.includes("rfp")) return "utility.generation";
  if (u.includes("irp")) return "utility.irp";
  return "utility.docket";
}

function safeDate(s: string): Date | undefined {
  const d = new Date(s);
  return Number.isNaN(+d) ? undefined : d;
}
