/**
 * EMMA / MSRB (Electronic Municipal Market Access) adapter.
 *
 * Schema reference: packages/adapters/src/research/emma-msrb.md
 *
 * Phase 3.1 hardening notes:
 *   - The research artifact did NOT confirm a stable RSS / Atom feed URL
 *     for EMMA new-issue filings.
 *   - The two RSS_URL values below are best-guess paths based on MSRB
 *     documentation patterns. They are flagged as UNCONFIRMED.
 *   - The adapter is written defensively: if either feed returns a non-200
 *     status (including 404), the error is logged and processing continues
 *     with whatever feeds did respond.
 *   - TODO(phase3.1): Verify both RSS feed URLs against a live EMMA session
 *     and update this file once confirmed.
 *
 * Predicate vocabulary:
 *   bond.issuance.new        — new municipal bond / revenue-bond issuance
 *   bond.issuance.refunding  — refunding / refinancing issue
 */

import type {
  SourceAdapter,
  AdapterContext,
  AdapterResult,
  AdapterRecord,
} from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";
import * as xml2js from "xml2js";

/**
 * UNCONFIRMED feed URLs — verify before relying on this adapter in prod.
 * The research artifact found no direct evidence of public RSS endpoints.
 */
const RSS_FEEDS = [
  "https://emma.msrb.org/rss/new-issues.xml", // UNCONFIRMED
  "https://emma.msrb.org/rss/primary-market.xml", // UNCONFIRMED
];

interface RssItem {
  title?: string[];
  link?: string[];
  description?: string[];
  pubDate?: string[];
  guid?: string[];
}

export const emmaMsrbAdapter: SourceAdapter = {
  id: "emma-msrb",

  async fetch(ctx: AdapterContext): Promise<AdapterResult> {
    const allRecords: AdapterRecord[] = [];

    for (const feedUrl of RSS_FEEDS) {
      let xmlText: string;
      try {
        const res = await fetchWithRetry(feedUrl);
        if (!res.ok) {
          ctx.logger?.warn(`emma-msrb feed returned ${res.status}`, {
            feedUrl,
          });
          continue;
        }
        xmlText = await res.text();
      } catch (err) {
        ctx.logger?.warn("emma-msrb fetch failed", { feedUrl, err });
        continue;
      }

      let parsed: { rss?: { channel?: [{ item?: RssItem[] }] } };
      try {
        parsed = await xml2js.parseStringPromise(xmlText, {
          explicitArray: true,
        });
      } catch (err) {
        ctx.logger?.warn("emma-msrb XML parse failed", { feedUrl, err });
        continue;
      }

      const items: RssItem[] =
        parsed?.rss?.channel?.[0]?.item ?? [];

      for (const item of items) {
        const title = item.title?.[0] ?? "";
        const link = item.link?.[0] ?? "";
        const description = item.description?.[0] ?? "";
        const pubDate = item.pubDate?.[0] ?? "";
        const guid = item.guid?.[0] ?? link;

        allRecords.push({
          sourceId: `emma-msrb:${guid}`,
          predicate: title.toLowerCase().includes("refund")
            ? "bond.issuance.refunding"
            : "bond.issuance.new",
          title,
          description,
          url: link,
          date: pubDate || undefined,
          fetchedAt: new Date().toISOString(),
        });
      }
    }

    return { records: allRecords };
  },
};
