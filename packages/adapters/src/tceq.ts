/**
 * TCEQ pending air permits — Texas environmental (cross-border signal).
 *
 * Source: https://www.tceq.texas.gov/permitting/air/permittech/air_permits.html
 * Public HTML table of pending air-quality permits. We emit signals for any
 * permit in East Texas counties adjacent to the LA border (Jefferson, Orange,
 * Jasper, Newton) which commonly indicate cross-border industrial activity.
 *
 * Predicate: permit.air.texas.pending
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.TCEQ_BASE ?? "https://www.tceq.texas.gov";
const LIST_PATH = "/permitting/air/permittech/pending_permits.html";

const BORDER_COUNTIES = new Set(["JEFFERSON", "ORANGE", "JASPER", "NEWTON", "SABINE", "SHELBY"]);

export const tceqAdapter: SourceAdapter = {
  slug: "tceq",
  family: "ENVIRONMENTAL_PERMIT",
  implemented: true,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const url = BASE + LIST_PATH;
    const res = await fetchWithRetry(url, {
      timeoutMs: 25_000,
      userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
    });
    const html = await res.text();

    const items = parseTceqTable(html);
    const borderItems = items.filter((it) => BORDER_COUNTIES.has((it.county ?? "").toUpperCase()));

    const records: AdapterRecord[] = borderItems.map((it) => ({
      externalId: `tceq:${it.permitNo ?? it.applicant}:${it.county}`,
      family: "ENVIRONMENTAL_PERMIT",
      predicate: "permit.air.texas.pending",
      subjectLabel: `${it.applicant} · ${it.county} County TX`,
      documentDate: it.filedAt,
      observedAt: new Date(),
      confidence: 0.86,
      url,
      rawBytes: JSON.stringify(it),
      rawMime: "application/json",
      evidenceSnippet: `${it.permitNo ?? "?"} · ${it.permitType ?? "?"} · ${it.county ?? "?"}`,
      payload: {
        permitNo: it.permitNo ?? null,
        applicant: it.applicant,
        county: it.county ?? null,
        permitType: it.permitType ?? null,
        filedAt: it.filedAt?.toISOString() ?? null,
      },
    }));

    return {
      records,
      nextCursor: null,
      notes: `TCEQ: ${records.length} border-county permits (of ${items.length} total)`,
    };
  },
};

type TceqRow = { permitNo?: string; applicant: string; county?: string; permitType?: string; filedAt?: Date };

function parseTceqTable(html: string): TceqRow[] {
  const rows: TceqRow[] = [];
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return rows;
  const trs = tableMatch[1].split(/<tr[^>]*>/i).slice(2);
  for (const tr of trs) {
    const cells = Array.from(tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim(),
    );
    if (cells.length < 3) continue;
    rows.push({
      permitNo: cells[0] || undefined,
      applicant: cells[1] ?? "?",
      county: cells[2] || undefined,
      permitType: cells[3] || undefined,
      filedAt: cells[4] ? safeDate(cells[4]) : undefined,
    });
  }
  return rows;
}

function safeDate(s: string): Date | undefined {
  const d = new Date(s);
  return Number.isNaN(+d) ? undefined : d;
}
