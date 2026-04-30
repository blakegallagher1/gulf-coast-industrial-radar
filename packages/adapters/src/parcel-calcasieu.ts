/**
 * Calcasieu Parish parcel adapter — ArcGIS REST.
 *
 * Schema reference: packages/adapters/src/research/calcasieu-assessor.md
 *
 * Phase 3.1.1 live-probe results (2026-04-30 — replaces all prior TODOs):
 *
 *   1. The previous BASE `gis.calcasieuassessor.org/arcgis/rest/services`
 *      is unreachable (DNS / TLS handshake fails). The Calcasieu Parish
 *      Assessor's own GIS server is offline / not publicly accessible.
 *
 *   2. The canonical public parcel layer is published by the Calcasieu
 *      Parish Police Jury (CPPJ) GIS at:
 *         https://lak-dc-arcgis.cppj.net/arcgis/rest/services/HubLayers/Parcels/FeatureServer/0
 *      (Discovered via ArcGIS Online search — owner `giscppj` is the
 *       official CPPJ GIS account, layer is the publicly-shared "Parcels"
 *       FeatureService that backs the Calcasieu Hub site at gis.calcasieu.gov.)
 *
 *   3. Real field schema:
 *        OBJECTID            integer
 *        PIN                 string  ← parcel ID
 *        NAME                string  ← owner name (NOT "OWNER")
 *        ADDRESS1, ADDRESS2  string  owner mailing address
 *        ASSESSMENT          string
 *        PHYSICALAD          string  physical address (truncated field name)
 *        WARD                string
 *        DATE_               string  (assessment / record date — string format)
 *        ZONE                string  ← zoning code (NOT "ZONING")
 *        Zn_Descr            string  zoning description
 *        link                string  link to detail page
 *        PRIOR_ZONI          string  prior zoning (rezoning history)
 *        ZONE_DATE_          date    when current zoning took effect
 *        ORD_NO              string  ordinance number
 *        DESCRIPTIO          string
 *        Shape__Area, Shape__Length  geometry metrics
 *
 *   4. Fields that DO NOT exist on this layer: ACRES (compute from
 *      Shape__Area, sq ft), SALE_DATE, SALE_PRICE, OWNER. The original
 *      adapter assumed all 4 — none exist.
 *
 *   5. We can't filter by edit time (no LAST_UPD field). Run does a paged
 *      full snapshot via resultOffset; downstream change-detection
 *      compares against the prior ParcelSnapshot row.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE =
  process.env.CALCASIEU_ARCGIS_BASE ??
  "https://lak-dc-arcgis.cppj.net/arcgis/rest/services";
const LAYER_QUERY = "/HubLayers/Parcels/FeatureServer/0/query";

const PAGE_SIZE = 200;

/** Convert ArcGIS Shape__Area (square feet, WKID 102682 / state plane) to acres. */
function sqFeetToAcres(sqft: number | undefined): number | null {
  if (!sqft || !Number.isFinite(sqft)) return null;
  return Math.round((sqft / 43_560) * 10) / 10;
}

export const calcasieuParcelAdapter: SourceAdapter = {
  slug: "calcasieu-assessor",
  family: "LAND_CONTROL",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const offset =
      typeof ctx.cursor === "object" && ctx.cursor !== null && "offset" in ctx.cursor
        ? Number((ctx.cursor as { offset: number }).offset)
        : 0;

    const url = new URL(BASE + LAYER_QUERY);
    url.searchParams.set("where", "1=1");
    url.searchParams.set(
      "outFields",
      "OBJECTID,PIN,NAME,ADDRESS1,ADDRESS2,ASSESSMENT,PHYSICALAD,WARD,DATE_,ZONE,Zn_Descr,link,PRIOR_ZONI,ZONE_DATE_,ORD_NO,Shape__Area",
    );
    url.searchParams.set("returnGeometry", "true");
    url.searchParams.set("outSR", "4326");
    url.searchParams.set("resultOffset", String(offset));
    url.searchParams.set("resultRecordCount", String(PAGE_SIZE));
    url.searchParams.set("f", "json");

    const res = await fetchWithRetry(url.toString(), {
      timeoutMs: 35_000,
      retries: 5,
      userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
    });
    const json = (await res.json()) as {
      features?: Array<{ attributes: Record<string, unknown>; geometry?: unknown }>;
      exceededTransferLimit?: boolean;
    };

    const records: AdapterRecord[] = (json.features ?? []).map((f) => {
      const a = f.attributes as {
        PIN?: string;
        NAME?: string;
        ADDRESS1?: string;
        ADDRESS2?: string;
        ASSESSMENT?: string;
        PHYSICALAD?: string;
        WARD?: string;
        DATE_?: string;
        ZONE?: string;
        Zn_Descr?: string;
        link?: string;
        PRIOR_ZONI?: string;
        ZONE_DATE_?: number; // ArcGIS dates come as ms-epoch
        ORD_NO?: string;
        Shape__Area?: number;
      };
      const acres = sqFeetToAcres(a.Shape__Area);
      return {
        externalId: `calcasieu:${a.PIN ?? "unknown"}`,
        family: "LAND_CONTROL",
        predicate: "land.parcel.update",
        subjectLabel: `${a.PIN ?? "—"} · ${a.NAME ?? "—"}${acres ? ` · ${acres} ac` : ""}`,
        observedAt: new Date(),
        confidence: 0.82,
        url: `${BASE}${LAYER_QUERY.replace("/query", "")}`,
        rawBytes: JSON.stringify(f),
        rawMime: "application/json",
        payload: {
          parcelNumber: a.PIN ?? null,
          owner: a.NAME ?? null,
          ownerAddress: [a.ADDRESS1, a.ADDRESS2].filter(Boolean).join(", ") || null,
          physicalAddress: a.PHYSICALAD ?? null,
          assessment: a.ASSESSMENT ?? null,
          ward: a.WARD ?? null,
          assessmentDate: a.DATE_ ?? null,
          zoning: a.ZONE ?? null,
          zoningDescription: a.Zn_Descr ?? null,
          priorZoning: a.PRIOR_ZONI ?? null,
          zoningDate: a.ZONE_DATE_ ? new Date(a.ZONE_DATE_).toISOString() : null,
          ordinanceNumber: a.ORD_NO ?? null,
          detailLink: a.link ?? null,
          acresApprox: acres,
          geometry: f.geometry ?? null,
        },
      };
    });

    const nextCursor = json.exceededTransferLimit
      ? { offset: offset + PAGE_SIZE }
      : null;

    return {
      records,
      nextCursor,
      notes: `Calcasieu (CPPJ): ${records.length} parcels (offset=${offset}${json.exceededTransferLimit ? ", more pages" : ""})`,
    };
  },
};
