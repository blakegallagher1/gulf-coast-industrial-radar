/**
 * Louisiana Public Service Commission docket portal adapter.
 *
 * Source: https://lpscpubvalence.lpsc.louisiana.gov
 * Utility / power / generation / transmission filings. Industrial-scale
 * interconnection requests are the highest-leverage signal here.
 *
 * Implementation: docket list scrape; we parse the public docket index.
 * The portal is not REST-y, but the listing is server-rendered and stable.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.LPSC_BASE ?? "https://lpscpubvalence.lpsc.louisiana.gov";
const LIST_PATH = "/lpscpubvalence/PSC_Reports.aspx";

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

type Docket = { docketNo: string; title: string; applicant?: string; filedAt?: Date };

function parseDockets(html: string): Docket[] {
  const rows: Docket[] = [];
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return rows;
  const trs = tableMatch[1].split(/<tr[^>]*>/i).slice(2);
  for (const tr of trs) {
    const cells = Array.from(tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim(),
    );
    if (cells.length < 2) continue;
    rows.push({
      docketNo: cells[0] ?? "",
      title: cells[1] ?? "",
      applicant: cells[2] || undefined,
      filedAt: cells[3] ? safeDate(cells[3]) : undefined,
    });
  }
  return rows;
}

function predicateFromTitle(t: string): string {
  const u = t.toUpperCase();
  if (u.includes("INTERCONNECT")) return "power.interconnect.request";
  if (u.includes("RATE")) return "power.rate.filing";
  if (u.includes("CERTIFICATE")) return "power.certificate.necessity";
  return "power.filing.general";
}

function safeDate(s: string): Date | undefined {
  const d = new Date(s);
  return Number.isNaN(+d) ? undefined : d;
}
