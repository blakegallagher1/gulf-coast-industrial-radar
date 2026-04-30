/**
 * EMMA / MSRB adapter — Industrial Development Bond + IDB-related notices.
 *
 * Schema reference: packages/adapters/src/research/emma-msrb.md
 *
 * Phase 3.1.1 live-probe results (2026-04-30 — replaces all prior TODOs):
 *
 *   1. The previously-documented RSS feed URLs
 *      (`https://emma.msrb.org/Feeds/RecentDisclosure.aspx?state=…`)
 *      DO NOT EXIST. With a real browser User-Agent every variant returns
 *      HTTP 404; the path was hallucinated by an earlier research pass.
 *
 *   2. EMMA has NO public RSS / JSON / XML feed surface for continuing
 *      disclosures. The site is ASP.NET WebForms; the public listings
 *      are on `/MarketActivity/RecentCD` (Recent Continuing Disclosures)
 *      which is rendered via a server-postback grid that requires JS to
 *      paginate.
 *
 *   3. MSRB sells the data via a paid subscription product:
 *      https://www.msrb.org/Market-Data-and-Research/Continuing-Disclosure-Subscription
 *      (Continuing Disclosure Subscription — annual fee, daily / intraday
 *      machine-readable feeds). This is the only documented path to a
 *      bulk-machine-readable EMMA feed.
 *
 *   4. Practical adapter behaviour for the free-public-only constraint:
 *      - `implemented: false` — no anonymous machine-readable bulk surface
 *      - `run()` returns `{ records: [] }` with a clear explanation
 *      - The Bond Commission agenda adapter (la-bond-commission, future)
 *        is the higher-leverage path to the same intel for LA-specific
 *        IDB authorisations — those agendas are public PDFs.
 *      - Deferred: a Playwright flow against `/MarketActivity/RecentCD`
 *        could scrape the rendered grid; left out of v0 until needed.
 *
 *   5. We still expose the IDB_HINTS + parser shape below so a future
 *      Playwright-driven implementation can drop in without touching the
 *      worker / cache wiring.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";

/** EMMA's public Recent Continuing Disclosures listing — rendered via JS, not a feed. */
const RECENT_CD_URL = "https://emma.msrb.org/MarketActivity/RecentCD";

/** Strings that mark a continuing disclosure as IDB-relevant when we eventually scrape. */
export const IDB_HINTS = [
  "industrial development",
  "IDB",
  "project finance",
  "industrial revenue",
  "private activity bond",
];

export const emmaMsrbAdapter: SourceAdapter = {
  slug: "emma-msrb",
  family: "FINANCING",
  implemented: false,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const records: AdapterRecord[] = [];
    const note =
      `EMMA has no public RSS/JSON feed surface for continuing disclosures. ` +
      `Recent CD listing is at ${RECENT_CD_URL} but is JS-rendered (ASP.NET ` +
      `postback grid). Bulk machine-readable access requires the paid MSRB ` +
      `Continuing Disclosure Subscription. Recommend pivoting to the LA Bond ` +
      `Commission agenda adapter for the same intelligence on LA IDB ` +
      `authorisations under the free-data constraint.`;
    return { records, nextCursor: null, notes: note };
  },
};
