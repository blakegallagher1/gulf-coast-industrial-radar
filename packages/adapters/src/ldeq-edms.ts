/**
 * LDEQ EDMS adapter — Louisiana Department of Environmental Quality.
 *
 * Schema reference: packages/adapters/src/research/ldeq-edms.md
 *
 * Phase 3.1.1 live-probe results (2026-04-30 — replaces all prior TODOs):
 *
 *   1. The legacy URL `/app/svcs/Search.svc/SearchAdvanced` returns HTTP 500
 *      with no body. The endpoint does NOT exist in the form previously
 *      documented; the inferred AJAX path was wrong.
 *
 *   2. EDMS now runs as an Angular SPA at `/edmsv2/`. The SPA loads its
 *      runtime config via the public endpoint
 *         GET https://edms.deq.louisiana.gov/edmsv2/account/GetUIAppSettings
 *      which returns `apiCoreServiceURL = "https://edms.deq.louisiana.gov/ASC.API.EDMS.Services/"`.
 *
 *   3. The real document-search endpoints live under
 *         POST {apiCoreServiceURL}api/document/docSearch
 *         POST {apiCoreServiceURL}api/document/Search
 *         GET  {apiCoreServiceURL}api/document/GetByAiNumber?aiNumber=…
 *      …and ALL of them return HTTP 401 without an auth token. The SPA
 *      acquires a token via cookie-based session auth (likely SAML / SSO)
 *      that is not exposed for anonymous machine-to-machine use.
 *
 *   4. There is NO documented public REST surface for bulk EDMS search.
 *      The Public Records Request portal (PRR) is for one-off requests, not
 *      an ingestion path. TEMPO (https://tempo.deq.louisiana.gov) is a
 *      separate per-permit submission system, not a document-search API.
 *
 *   5. Practical adapter behaviour:
 *      - `implemented: false` — no anonymous machine-readable bulk surface
 *      - `run()` returns `{ records: [] }` with explanatory notes so the
 *        worker doesn't crash, and degraded source health surfaces in the UI
 *      - Real ingestion path (deferred): Playwright headless flow against
 *        the public `/edmsv2/` SPA. The "Public Search" landing flow can
 *        be driven without login because the SPA's anonymous session is
 *        bootstrapped via cookies set on first GET to `/edmsv2/`.
 *      - A second deferred path: scrape the legacy `/app/EDMS_Search.aspx`
 *        which still serves HTML (HTTP 200) and can be parsed.
 *
 * Predicate vocabulary (when we eventually wire the Playwright path):
 *   permit.air.NOI           — air-quality NOI (Class I/II/III)
 *   permit.water.NPDES       — NPDES water-discharge permit (LPDES / NPDES)
 *   permit.wetlands.404      — Section 404 wetlands fill
 *   permit.solid.waste       — solid waste / Type II
 */

import type {
  SourceAdapter,
  AdapterContext,
  AdapterResult,
  AdapterRecord,
} from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.LDEQ_EDMS_BASE ?? "https://edms.deq.louisiana.gov";
/** Anonymous config endpoint — returns the API base + UI flags. */
const APP_SETTINGS_PATH = "/edmsv2/account/GetUIAppSettings";

type AppSettings = {
  apiCoreServiceURL?: string;
  edmsViewerURL?: string;
  uiBannerLabel?: string;
  uiPublicSearchFormTitle?: string;
};

/**
 * Even though the search API is auth-gated, we still ping the public app-settings
 * endpoint on each tick so the worker can:
 *   1. confirm EDMS is reachable
 *   2. surface any banner-label / outage notice from LDEQ
 *   3. detect when the API base URL changes (so we can rewire automatically
 *      when LDEQ refactors the SPA)
 */
export const ldeqEdmsAdapter: SourceAdapter = {
  slug: "ldeq-edms",
  family: "ENVIRONMENTAL_PERMIT",
  implemented: false,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    let appSettings: AppSettings | null = null;
    try {
      const res = await fetchWithRetry(BASE + APP_SETTINGS_PATH, {
        method: "GET",
        headers: { Accept: "application/json" },
        timeoutMs: 15_000,
        userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
      });
      appSettings = (await res.json()) as AppSettings;
    } catch {
      /* swallow — the empty result + notes still surface the source state */
    }

    // Emit a single zero-record telemetry signal so the source health UI sees a
    // successful ping (when reachable) but understands no documents were
    // ingested. Once the Playwright flow ships we'll start emitting real
    // permit records here.
    const records: AdapterRecord[] = [];

    const note =
      appSettings?.apiCoreServiceURL
        ? `EDMS reachable. API base ${appSettings.apiCoreServiceURL} requires auth — anonymous bulk search unsupported. ` +
          `Banner: ${(appSettings.uiBannerLabel ?? "").trim() || "(none)"}.`
        : `EDMS unreachable from ${BASE}${APP_SETTINGS_PATH}. Adapter will keep retrying each tick.`;

    return { records, nextCursor: null, notes: note };
  },
};
