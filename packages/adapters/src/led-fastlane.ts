/**
 * LED FastLane / IMS adapter — Louisiana Economic Development incentives.
 *
 * Source: https://opportunitylouisiana.gov/business-incentives/incentives-management-system
 * Public listings + downloadable summaries; no auth.
 *
 * What we extract: ITEP-eligible filings — capex tier, parish, project type
 * (NAICS), jobs counts, sponsor when disclosed.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.LED_FASTLANE_BASE ?? "https://opportunitylouisiana.gov";
// Public IMS report endpoint (HTML; we parse server-rendered tables).
const LIST_PATH = "/business-incentives/incentives-management-system";

export const ledFastLaneAdapter: SourceAdapter = {
  slug: "led-fastlane",
  family: "INCENTIVE",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const url = BASE + LIST_PATH;
    const res = await fetchWithRetry(url, { userAgent: ua(), timeoutMs: 30_000 });
    const html = await res.text();

    const rows = parseImsListings(html);
    const records: AdapterRecord[] = rows.map((row, i) => ({
      externalId: row.id ?? `${url}#${i}`,
      family: "INCENTIVE",
      predicate: predicateForStatus(row.status),
      subjectLabel: `${row.companyOrRedacted} · ${row.parish ?? "Louisiana"} · ${row.capexTier ?? ""}`.trim(),
      documentDate: row.filedAt,
      observedAt: new Date(),
      confidence: row.companyOrRedacted === "REDACTED" ? 0.78 : 0.92,
      url,
      rawBytes: html,
      rawMime: "text/html; charset=utf-8",
      evidenceSnippet: row.snippet,
      payload: {
        capexTier: row.capexTier ?? null,
        parish: row.parish ?? null,
        naics: row.naics ?? null,
        jobs: row.jobs ?? null,
        company: row.companyOrRedacted,
        status: row.status,
      },
    }));

    return { records, nextCursor: null, notes: `parsed ${rows.length} IMS rows from ${LIST_PATH}` };
    // The IMS portal currently exposes records in a single tabular view that
    // doesn't paginate; once it adds paging we'll move to a cursor-driven loop.
  },
};

// ─── parsing ──────────────────────────────────────────────────────────────────────

type ImsRow = {
  id?: string;
  companyOrRedacted: string;
  parish?: string;
  capexTier?: string;
  naics?: string;
  jobs?: number;
  filedAt?: Date;
  status: "submitted" | "approved" | "withdrawn" | "rejected" | "unknown";
  snippet?: string;
};

/**
 * Lightweight HTML row parser. The IMS portal renders a table whose row
 * structure has held since 2022. If LED redesigns the page, we replace this
 * with a JSON endpoint or cheerio-based selector — this scaffold deliberately
 * avoids adding a heavy DOM dep until we know the long-term schema.
 */
function parseImsListings(html: string): ImsRow[] {
  const out: ImsRow[] = [];
  // Match <tr> blocks containing recognizable IMS columns. Defensive: bail
  // gracefully if the markup changes — a degraded run with 0 rows is better
  // than a hard error that aborts the whole worker tick.
  const tableMatch = html.match(/<table[^>]*class="[^"]*ims[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return out;

  const rows = tableMatch[1].split(/<tr[^>]*>/i).slice(1);
  for (const r of rows) {
    const cols = Array.from(r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
      stripTags(m[1]).trim(),
    );
    if (cols.length < 4) continue;
    out.push({
      id: cols[0] || undefined,
      companyOrRedacted: (cols[1] || "REDACTED").toUpperCase().includes("REDAC")
        ? "REDACTED"
        : cols[1] ?? "REDACTED",
      parish: cols[2] || undefined,
      capexTier: cols[3] || undefined,
      naics: cols[4] || undefined,
      jobs: cols[5] ? Number(cols[5].replace(/[^\d]/g, "")) || undefined : undefined,
      filedAt: cols[6] ? safeDate(cols[6]) : undefined,
      status: normalizeStatus(cols[7] ?? ""),
      snippet: cols.join(" · ").slice(0, 280),
    });
  }
  return out;
}

function predicateForStatus(s: ImsRow["status"]): string {
  switch (s) {
    case "approved":   return "incentive.itep.approved";
    case "submitted":  return "incentive.itep.eligible";
    case "withdrawn":  return "incentive.itep.withdrawn";
    case "rejected":   return "incentive.itep.rejected";
    default:           return "incentive.itep.observed";
  }
}

function normalizeStatus(s: string): ImsRow["status"] {
  const u = s.toLowerCase();
  if (u.includes("approve")) return "approved";
  if (u.includes("submit"))  return "submitted";
  if (u.includes("withdr"))  return "withdrawn";
  if (u.includes("reject"))  return "rejected";
  return "unknown";
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

function safeDate(s: string): Date | undefined {
  const d = new Date(s);
  return Number.isNaN(+d) ? undefined : d;
}

function ua(): string {
  return process.env.SEC_EDGAR_USER_AGENT ?? "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com";
}
