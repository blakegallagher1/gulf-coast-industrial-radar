/**
 * Calcasieu Parish parcel adapter — ArcGIS REST.
 *
 * Source: Calcasieu Parish GIS public service (no auth).
 * Emits PARCEL_TRANSACTION signals for recent sales.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE =
  process.env.CALCASIEU_ARCGIS_BASE ??
  "https://gis.calcasieu.net/arcgis/rest/services/Parcels/MapServer/0";

export const calcasieuParcelAdapter: SourceAdapter = {
  slug: "parcel-calcasieu",
  family: "PARCEL_TRANSACTION",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const since = ctx.since ?? daysAgo(30);

    const url = new URL(`${BASE}/query`);
    url.searchParams.set("where", `SALEDATE >= DATE '${since.toISOString().slice(0, 10)}'`);
    url.searchParams.set("outFields", "PARCELID,OWNER1,SALEDATE,SALEPRICE,TOTALACRES,LANDUSE");
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("f", "json");
    url.searchParams.set("resultRecordCount", "200");

    const res = await fetchWithRetry(url.toString(), {
      timeoutMs: 20_000,
      userAgent: "GulfCoastIndustrialRadar/0.1",
    });
    const json = (await res.json()) as ArcGisResponse;

    const records: AdapterRecord[] = (json.features ?? []).map((f) => {
      const a = f.attributes;
      return {
        externalId: `calcasieu:${a.PARCELID}`,
        family: "PARCEL_TRANSACTION",
        predicate: "parcel.sale.recent",
        subjectLabel: `Calcasieu · ${a.PARCELID} · ${String(a.OWNER1 ?? "unknown owner")}`,
        documentDate: a.SALEDATE ? new Date(Number(a.SALEDATE)) : undefined,
        observedAt: new Date(),
        confidence: 0.89,
        url: BASE,
        rawBytes: JSON.stringify(f),
        rawMime: "application/json",
        evidenceSnippet: `${a.OWNER1 ?? "?"} · $${a.SALEPRICE?.toLocaleString() ?? "?"} · ${a.TOTALACRES ?? "?"}ac`,
        payload: {
          apn: String(a.PARCELID ?? ""),
          owner: String(a.OWNER1 ?? ""),
          salePrice: typeof a.SALEPRICE === "number" ? a.SALEPRICE : null,
          saleDate: a.SALEDATE ? new Date(Number(a.SALEDATE)).toISOString() : null,
          acres: typeof a.TOTALACRES === "number" ? a.TOTALACRES : null,
          landUse: String(a.LANDUSE ?? ""),
          parish: "Calcasieu",
        },
      };
    });

    return {
      records,
      nextCursor: null,
      notes: `Calcasieu parcels: ${records.length} recent sales`,
    };
  },
};

type ArcGisResponse = { features?: Array<{ attributes: Record<string, unknown> }> };

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
