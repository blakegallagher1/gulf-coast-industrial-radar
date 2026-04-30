/**
 * USACE New Orleans District public notices adapter.
 *
 * Source: https://www.mvn.usace.army.mil/Missions/Regulatory/Permits/Public-Notices/
 * Public-facing HTML listing of Section 404 / 10 permit public notices.
 * No API — we parse the server-rendered table of notices.
 *
 * Predicate: permit.wetlands.404.USACE
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.USACE_MVN_BASE ?? "https://www.mvn.usace.army.mil";
const LIST_PATH = "/Missions/Regulatory/Permits/Public-Notices/";

export const usaceMvnAdapter: SourceAdapter = {
  slug: "usace-mvn",
  family: "ENVIRONMENTAL_PERMIT",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const url = BASE + LIST_PATH;
    const res = await fetchWithRetry(url, {
      timeoutMs: 30_000,
      userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
    });
    const html = await res.text();

    const notices = parseNotices(html);
    const since = ctx.since ?? daysAgo(30);

    const fresh = notices.filter(
      (n) => !n.issuedAt || n.issuedAt >= since,
    );

    const records: AdapterRecord[] = fresh.map((n) => ({
      externalId: `usace-mvn:${n.noticeNo}`,
      family: "ENVIRONMENTAL_PERMIT",
      predicate: "permit.wetlands.404.USACE",
      subjectLabel: `USACE MVN · ${n.noticeNo} · ${n.applicant ?? "unknown"}`,
      documentDate: n.issuedAt,
      observedAt: new Date(),
      confidence: 0.96,
      url: n.href ? BASE + n.href : url,
      rawBytes: JSON.stringify(n),
      rawMime: "application/json",
      evidenceSnippet: `${n.description?.slice(0, 200) ?? ""}`,
      payload: {
        noticeNo: n.noticeNo,
        applicant: n.applicant ?? null,
        location: n.location ?? null,
        issuedAt: n.issuedAt?.toISOString() ?? null,
        expiresAt: n.expiresAt?.toISOString() ?? null,
      },
    }));

    return {
      records,
      nextCursor: null,
      notes: `USACE MVN: ${records.length} fresh notices (of ${notices.length} total) since ${since.toISOString().slice(0, 10)}`,
    };
  },
};

type Notice = {
  noticeNo: string;
  applicant?: string;
  description?: string;
  location?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  href?: string;
};

function parseNotices(html: string): Notice[] {
  const notices: Notice[] = [];
  // USACE MVN renders a table with columns: Notice #, Applicant, Description, Location, Issue, Expiration, Link
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return notices;
  const rows = tableMatch[1].split(/<tr[^>]*>/i).slice(2); // skip header rows
  for (const row of rows) {
    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim(),
    );
    if (!cells[0]) continue;
    const linkMatch = row.match(/href="([^"]*)"/i);
    notices.push({
      noticeNo: cells[0],
      applicant: cells[1] || undefined,
      description: cells[2] || undefined,
      location: cells[3] || undefined,
      issuedAt: cells[4] ? safeDate(cells[4]) : undefined,
      expiresAt: cells[5] ? safeDate(cells[5]) : undefined,
      href: linkMatch?.[1],
    });
  }
  return notices;
}

function safeDate(s: string): Date | undefined {
  const d = new Date(s);
  return Number.isNaN(+d) ? undefined : d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
