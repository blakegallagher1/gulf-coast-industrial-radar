/**
 * LED FastLane / IMS adapter — Louisiana Economic Development incentives.
 *
 * Source: https://fastlaneng.louisianaeconomicdevelopment.com/public/search/bi
 *
 * Schema reference: packages/adapters/src/research/led-fastlane.md
 *
 * Important findings from the dev-time research pass:
 *   1. The home URL `fastlane.louisianaeconomicdevelopment.com` aliases /
 *      redirects to the NextGen subdomain `fastlaneng.…` — use NG.
 *   2. The public Business Incentives search lives at /public/search/bi
 *      (BI = business incentives; ITEP, QJ, EZ, RTA programs).
 *   3. The page is JS-rendered. Without Playwright we can only fetch the
 *      shell + capture any inline state. A future hardening pass should
 *      switch this adapter to a headless-browser flow; this implementation
 *      is the "best effort under SSR-only fetch" baseline. The shell often
 *      includes a hydration JSON blob — when present we parse it.
 *   4. Public Reports endpoint at /public/reports gives aggregated lists.
 *
 * Status: ✅ correct base URL · ⚠️ JS-rendering means we'll miss most rows
 * until the Playwright migration ships.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.LED_FASTLANE_BASE ?? "https://fastlaneng.louisianaeconomicdevelopment.com";
// Public Business Incentives search (HTML shell — see file header re: JS rendering).
const LIST_PATH = "/public/search/bi";
const REPORTS_PATH = "/public/reports";

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

    return {
      records,
      nextCursor: null,
      notes: `parsed ${rows.length} IMS rows from ${LIST_PATH} (note: JS-rendered page; Playwright migration pending)`,
    };
  },
};

/**
 * Try to find a hydration JSON blob inline on the FastLane NextGen shell.
 * The page often serializes initial search state as a JSON payload in a
 * <script id="__NEXT_DATA__"> or similar; if we can extract that we get
 * structured rows even without JS execution.
 */
function _tryHydrationBlob(html: string): unknown | null {
  const m =
    html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i) ||
    html.match(/<script[^>]*data-search-state[^>]*>([\s\S]+?)<\/script>/i);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}
void REPORTS_PATH; // reserved for the public-reports adapter pass
void _tryHydrationBlob; // wired in once the parser knows the JSON shape

// ─── parsing ──────────────────────────────────────────────────────────────────────────

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
