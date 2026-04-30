/**
 * LDEQ EDMS adapter — Louisiana Department of Environmental Quality.
 *
 * Source: https://edms.deq.louisiana.gov
 * The EDMS portal exposes search-by-document type. We pull recent air permit
 * Notices of Intent (NOIs) and water/wetlands public notices.
 *
 * Predicate vocabulary:
 *   permit.air.NOI           — air-quality NOI (Class I/II/III)
 *   permit.water.NPDES       — NPDES water-discharge permit
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

/** EDMS public-search endpoint. Returns JSON when accessed via the AJAX path. */
const SEARCH_PATH = "/app/svcs/Search.svc/SearchAdvanced";

type Cursor = { page: number };

export const ldeqEdmsAdapter: SourceAdapter = {
  slug: "ldeq-edms",
  family: "ENVIRONMENTAL_PERMIT",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const cursor = (ctx.cursor as Cursor | undefined) ?? { page: 1 };
    const since = ctx.since ?? daysAgo(30);

    const body = {
      DocumentTypes: ["AQ", "WQ", "SW"],
      DateFrom: since.toISOString().slice(0, 10),
      DateTo: new Date().toISOString().slice(0, 10),
      Page: cursor.page,
      PageSize: 50,
    };

    const res = await fetchWithRetry(BASE + SEARCH_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      timeoutMs: 30_000,
      userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
    });

    const json = (await res.json()) as EdmsResponse;
    const items = json.Results ?? [];

    const records: AdapterRecord[] = items.map((it) => {
      const predicate = predicateFor(it);
      return {
        externalId: it.DocumentId,
        family: "ENVIRONMENTAL_PERMIT",
        predicate,
        subjectLabel: `${it.FacilityName ?? "Facility"} · ${it.ActivityType ?? predicate}`,
        documentDate: it.DocumentDate ? new Date(it.DocumentDate) : undefined,
        observedAt: new Date(),
        confidence: 0.94,
        url: BASE + (it.UrlPath ?? "/app/doc/" + it.DocumentId),
        rawBytes: JSON.stringify(it),
        rawMime: "application/json",
        evidenceSnippet: it.Title?.slice(0, 280),
        payload: {
          edmsDocumentId: it.DocumentId,
          facilityName: it.FacilityName ?? null,
          parish: it.Parish ?? null,
          activityType: it.ActivityType ?? null,
          permitNumber: it.PermitNumber ?? null,
        },
      };
    });

    const nextCursor: Cursor | null =
      items.length === body.PageSize ? { page: cursor.page + 1 } : null;

    return {
      records,
      nextCursor,
      notes: `EDMS page ${cursor.page} → ${items.length} docs (since ${since.toISOString().slice(0, 10)})`,
    };
  },
};

// ─── predicate normalization ──────────────────────────────────────────────────────

function predicateFor(it: EdmsRow): string {
  const a = (it.ActivityType ?? it.PermitNumber ?? "").toUpperCase();
  if (a.startsWith("AQ") || a.includes("AIR")) return "permit.air.NOI";
  if (a.startsWith("WQ") || a.includes("WATER") || a.includes("NPDES"))
    return "permit.water.NPDES";
  if (a.includes("WETLAND") || a.includes("404")) return "permit.wetlands.404";
  if (a.includes("SW") || a.includes("SOLID")) return "permit.solid.waste";
  return "permit.unknown";
}

// ─── EDMS response shapes ────────────────────────────────────────────────────────────

type EdmsResponse = { Results?: EdmsRow[]; TotalCount?: number };
type EdmsRow = {
  DocumentId: string;
  Title?: string;
  DocumentDate?: string;
  FacilityName?: string;
  Parish?: string;
  ActivityType?: string;
  PermitNumber?: string;
  UrlPath?: string;
};

function daysAgo(d: number): Date {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x;
}
