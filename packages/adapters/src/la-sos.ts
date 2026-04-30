/**
 * Louisiana Secretary of State · entity adapter.
 *
 * Source: https://coraweb.sos.la.gov
 * Public entity search. We pull recently-formed LLCs and partnerships in
 * the launch parishes and emit ENTITY_FORMATION signals for opaque names.
 *
 * Note: SOS imposes session cookies — we issue a GET to seed cookies first,
 * then POST the search. Anything more aggressive would warrant an explicit
 * data-license review per knowledge/sources/free-source-inventory.md.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.LA_SOS_BASE ?? "https://coraweb.sos.la.gov";

export const laSosAdapter: SourceAdapter = {
  slug: "la-sos",
  family: "ENTITY_FORMATION",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const since = ctx.since ?? daysAgo(7);

    // Seed cookie
    const seed = await fetchWithRetry(`${BASE}/Commercial/CorporationSearch.aspx`, {
      userAgent: ua(),
      timeoutMs: 15_000,
    });
    const cookie = seed.headers.get("set-cookie") ?? "";

    // Public form-post for newly-filed entities
    const body = new URLSearchParams({
      "ctl00$cphContent$txtBeginDate": since.toISOString().slice(0, 10),
      "ctl00$cphContent$txtEndDate": new Date().toISOString().slice(0, 10),
      "ctl00$cphContent$btnSearch": "Search",
    });

    const res = await fetchWithRetry(`${BASE}/Commercial/CorporationSearch.aspx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
      },
      body: body.toString(),
      timeoutMs: 30_000,
      userAgent: ua(),
    });
    const html = await res.text();

    const rows = parseSosResults(html);
    const records: AdapterRecord[] = rows.map((r, i) => ({
      externalId: r.regNo ?? `${BASE}#${i}`,
      family: "ENTITY_FORMATION",
      predicate: r.opaque ? "entity.formed.opaque" : "entity.formed",
      subjectLabel: `${r.name} · ${r.kind ?? "entity"}`,
      documentDate: r.formedAt,
      observedAt: new Date(),
      confidence: r.opaque ? 0.88 : 0.96,
      url: `${BASE}/Commercial/CorporationDetail.aspx?id=${r.regNo}`,
      rawBytes: JSON.stringify(r),
      rawMime: "application/json",
      evidenceSnippet: `${r.name} · agent ${r.registeredAgent ?? "?"} · ${r.mailingState ?? "?"}`,
      payload: r as unknown as Record<string, unknown>,
    }));

    return {
      records,
      nextCursor: null,
      notes: `LA SOS: ${records.length} entities since ${since.toISOString().slice(0, 10)}`,
    };
  },
};

type SosRow = {
  regNo?: string;
  name: string;
  kind?: string;
  formedAt?: Date;
  registeredAgent?: string;
  mailingAddress?: string;
  mailingState?: string;
  opaque: boolean;
};

const OPACITY_HINTS = [
  /\bholdings?\b/i,
  /\bcapital\b/i,
  /\bproject\b/i,
  /^[a-z]+ industrial\b/i,
  /\bI(I|II|V)?\s+LLC$/i, // series-LLC pattern
];

function parseSosResults(html: string): SosRow[] {
  const tableMatch = html.match(/<table[^>]*id="[^"]*gvResults[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];
  const rows: SosRow[] = [];
  const trs = tableMatch[1].split(/<tr[^>]*>/i).slice(2); // skip header
  for (const tr of trs) {
    const cells = Array.from(tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim(),
    );
    if (cells.length < 3) continue;
    const name = cells[0] ?? "";
    if (!name) continue;
    const opaque = OPACITY_HINTS.some((rx) => rx.test(name));
    rows.push({
      name,
      regNo: cells[1] || undefined,
      kind: cells[2] || undefined,
      formedAt: cells[3] ? safeDate(cells[3]) : undefined,
      registeredAgent: cells[4] || undefined,
      mailingState: cells[5] || undefined,
      opaque,
    });
  }
  return rows;
}

function safeDate(s: string): Date | undefined {
  const d = new Date(s);
  return Number.isNaN(+d) ? undefined : d;
}
function daysAgo(d: number): Date {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x;
}
function ua(): string {
  return "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com";
}
