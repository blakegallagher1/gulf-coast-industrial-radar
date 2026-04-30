/**
 * LDEQ EDMS adapter — Louisiana Department of Environmental Quality.
 *
 * Schema reference: packages/adapters/src/research/ldeq-edms.md
 *
 * Phase 3.1 hardening notes:
 *   - The research artifact confirms the live entry point is
 *     https://edms.deq.louisiana.gov (portal access via
 *     https://www.deq.louisiana.gov/page/edms). No REST API was documented.
 *   - The SEARCH_PATH "/app/svcs/Search.svc/SearchAdvanced" is an inferred
 *     internal AJAX path. The research artifact found no evidence of this
 *     endpoint; it may not exist or may require session auth.
 *   - TODO(phase3.1): Confirm whether SearchAdvanced endpoint is publicly
 *     reachable and, if not, pivot to scraping the EDMS HTML search results.
 *     The AI number (Agency Interest number) is the primary query key on the
 *     public HTML interface (no query params documented for bulk extraction).
 *   - TODO(phase3.1): Investigate TEMPO (https://tempo.deq.louisiana.gov)
 *     as a potentially scrapable structured-permit backend.
 *   - Field names (DocumentId, FacilityName, Parish, ActivityType,
 *     PermitNumber, UrlPath) are plausible based on doc-metadata context
 *     but are NOT confirmed by the research artifact. Do not rename without
 *     a live response sample.
 *
 * Predicate vocabulary:
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

/**
 * EDMS public-search endpoint.
 * TODO(phase3.1): This path is inferred — not confirmed by the research
 * artifact. If requests return 404 / redirect, replace with HTML-scrape
 * of https://edms.deq.louisiana.gov/app/Activity/Search.
 */
const SEARCH_PATH = "/app/svcs/Search.svc/SearchAdvanced";

// Activity types that map to permitting actions we care about.
const PERMIT_ACTIVITY_TYPES = new Set([
  "Air",
  "Water",
  "WasteWater",
  "SolidWaste",
  "Wetlands",
]);

interface EdmsSearchResponse {
  d: EdmsDocument[];
}

interface EdmsDocument {
  DocumentId: string;
  FacilityName: string;
  Parish: string;
  ActivityType: string;
  PermitNumber: string;
  UrlPath: string;
}

export const ldeqEdmsAdapter: SourceAdapter = {
  id: "ldeq-edms",

  async fetch(ctx: AdapterContext): Promise<AdapterResult> {
    const url = `${BASE}${SEARCH_PATH}`;
    const body = JSON.stringify({
      Parish: ctx.parish ?? "",
      ActivityType: "",
      StatusCode: "PENDING",
    });

    let raw: EdmsSearchResponse;
    try {
      const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      raw = (await res.json()) as EdmsSearchResponse;
    } catch (err) {
      ctx.logger?.warn("ldeq-edms fetch failed", { err });
      return { records: [] };
    }

    const records: AdapterRecord[] = (raw.d ?? []).flatMap((doc) => {
      if (!PERMIT_ACTIVITY_TYPES.has(doc.ActivityType)) return [];
      return [
        {
          sourceId: `ldeq-edms:${doc.DocumentId}`,
          predicate: activityToPredicate(doc.ActivityType),
          title: doc.FacilityName,
          description: `LDEQ ${doc.ActivityType} permit — ${doc.PermitNumber}`,
          location: { parish: doc.Parish },
          url: doc.UrlPath
            ? `${BASE}${doc.UrlPath}`
            : `${BASE}/app/Activity/Search`,
          fetchedAt: new Date().toISOString(),
        },
      ];
    });

    return { records };
  },
};

function activityToPredicate(type: string): string {
  switch (type) {
    case "Air":
      return "permit.air.NOI";
    case "Water":
    case "WasteWater":
      return "permit.water.NPDES";
    case "Wetlands":
      return "permit.wetlands.404";
    case "SolidWaste":
      return "permit.solid.waste";
    default:
      return "permit.other";
  }
}
