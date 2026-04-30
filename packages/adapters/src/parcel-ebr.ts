/**
 * East Baton Rouge Parish parcel adapter — ArcGIS REST.
 *
 * Source: EBRP GIS Open Data (public, no auth).
 * Emits PARCEL_TRANSACTION signals for recent sales in EBR.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE =
  process.env.EBR_ARCGIS_BASE ??
  "https://services.arcgis.com/q5uyFfTZo3LFL9m8/arcgis/rest/services/EBR_Parcels_Public/FeatureServer/0";

export const ebrParcelAdapter: SourceAdapter = {
  slug: "parcel-ebr",
  family: "PARCEL_TRANSACTION",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const since = ctx.since ?? daysAgo(30);

    const url = new URL(`${BASE}/query`);
    url.searchParams.set("where", `SALE_DATE >= DATE '${since.toISOString().slice(0, 10)}'`);
    url.searchParams.set("outFields", "PARCEL_NO,OWNER_NAME,SALE_DATE,SALE_PRICE,TOTAL_ACRES,ZONING_CODE,SITE_ADDRESS");
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
        externalId: `ebr:${a.PARCEL_NO}`,
        family: "PARCEL_TRANSACTION",
        predicate: "parcel.sale.recent",
        subjectLabel: `EBR · ${a.PARCEL_NO} · ${a.SITE_ADDRESS ?? "unknown address"}`,
        documentDate: a.SALE_DATE ? new Date(Number(a.SALE_DATE)) : undefined,
        observedAt: new Date(),
        confidence: 0.9,
        url: BASE,
        rawBytes: JSON.stringify(f),
        rawMime: "application/json",
        evidenceSnippet: `${a.OWNER_NAME ?? "?"} · $${a.SALE_PRICE?.toLocaleString() ?? "?"} · ${a.TOTAL_ACRES ?? "?"}ac`,
        payload: {
          apn: String(a.PARCEL_NO ?? ""),
          owner: String(a.OWNER_NAME ?? ""),
          salePrice: typeof a.SALE_PRICE === "number" ? a.SALE_PRICE : null,
          saleDate: a.SALE_DATE ? new Date(Number(a.SALE_DATE)).toISOString() : null,
          acres: typeof a.TOTAL_ACRES === "number" ? a.TOTAL_ACRES : null,
          zoning: String(a.ZONING_CODE ?? ""),
          address: String(a.SITE_ADDRESS ?? ""),
          parish: "East Baton Rouge",
        },
      };
    });

    return {
      records,
      nextCursor: null,
      notes: `EBR parcels: ${records.length} recent sales since ${since.toISOString().slice(0, 10)}`,
    };
  },
};

type ArcGisResponse = { features?: Array<{ attributes: Record<string, unknown> }> };

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
