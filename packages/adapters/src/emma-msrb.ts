/**
 * EMMA / MSRB adapter — Industrial Development Bond + IDB-related notices.
 *
 * Source: https://emma.msrb.org
 * Public bond offering documents and continuing disclosures. We're after
 * IDB authorizations that disclose "Project X" with metes-and-bounds — those
 * land in the Bond Commission agenda first, and the bond docs follow.
 *
 * EMMA exposes RSS feeds for new disclosures. We poll the LA + TX + MS + AL
 * issuer feeds and emit FINANCING signals for matches.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const FEEDS = [
  // RSS variants — pulled in serially; a future iteration moves to the
  // EMMA dataset API once a key is provisioned.
  "https://emma.msrb.org/Feeds/RecentDisclosure.aspx?state=LA",
  "https://emma.msrb.org/Feeds/RecentDisclosure.aspx?state=TX",
  "https://emma.msrb.org/Feeds/RecentDisclosure.aspx?state=MS",
  "https://emma.msrb.org/Feeds/RecentDisclosure.aspx?state=AL",
];

const IDB_HINTS = [
  "industrial development",
  "IDB",
  "project finance",
  "industrial revenue",
  "private activity bond",
];

export const emmaMsrbAdapter: SourceAdapter = {
  slug: "emma-msrb",
  family: "FINANCING",
  implemented: true,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const records: AdapterRecord[] = [];
    for (const feed of FEEDS) {
      try {
        const res = await fetchWithRetry(feed, {
          timeoutMs: 20_000,
          userAgent: "GulfCoastIndustrialRadar/0.1",
        });
        const xml = await res.text();
        const items = parseRssItems(xml);
        for (const it of items) {
          const isIdb = IDB_HINTS.some((h) => (it.title + it.description).toLowerCase().includes(h));
          if (!isIdb) continue;
          records.push({
            externalId: it.guid ?? it.link,
            family: "FINANCING",
            predicate: "financing.bond.disclosure",
            subjectLabel: it.title.slice(0, 140),
            documentDate: it.pubDate ? new Date(it.pubDate) : undefined,
            observedAt: new Date(),
            confidence: 0.82,
            url: it.link,
            rawBytes: JSON.stringify(it),
            rawMime: "application/json",
            evidenceSnippet: it.description.slice(0, 280),
            payload: { title: it.title, link: it.link, pubDate: it.pubDate },
          });
        }
      } catch {
        /* keep iterating other feeds */
      }
    }
    return { records, nextCursor: null, notes: `EMMA: ${records.length} IDB-relevant disclosures` };
  },
};

type RssItem = { title: string; link: string; description: string; guid?: string; pubDate?: string };

function parseRssItems(xml: string): RssItem[] {
  const out: RssItem[] = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
  for (const m of matches) {
    const block = m[1];
    out.push({
      title: tag(block, "title"),
      link: tag(block, "link"),
      description: tag(block, "description"),
      guid: tag(block, "guid"),
      pubDate: tag(block, "pubDate"),
    });
  }
  return out;
}
function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
}
