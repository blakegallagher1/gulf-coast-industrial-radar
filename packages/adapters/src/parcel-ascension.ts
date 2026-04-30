/**
 * Ascension Parish Assessor — ArcGIS REST parcel adapter.
 *
 * Source: Ascension Parish ArcGIS Feature Service (public, no auth required)
 * Emits PARCEL_TRANSACTION signals when recent sale dates are found.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE =
  process.env.ASCENSION_ARCGIS_BASE ??
  "https://gis.ascensionparish.net/server/rest/services/Assessor/Parcels/MapServer/0";

export const ascensionParcelAdapter: SourceAdapter = {
  slug: "parcel-ascension",
  family: "PARCEL_TRANSACTION",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const since = ctx.since ?? daysAgo(30);
    const sinceMs = since.getTime();

    const url = new URL(`${BASE}/query`);
    url.searchParams.set("where", `SALE_DATE >= DATE '${since.toISOString().slice(0, 10)}'`);
    url.searchParams.set("outFields", "APN,OWNER,SALE_DATE,SALE_PRICE,ACRES,ZONING,SITUS_ADDR");
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
        externalId: `ascension:${a.APN}`,
        family: "PARCEL_TRANSACTION",
        predicate: "parcel.sale.recent",
        subjectLabel: `Ascension · ${a.APN} · ${a.SITUS_ADDR ?? "unknown address"}`,
        documentDate: a.SALE_DATE ? new Date(a.SALE_DATE) : undefined,
        observedAt: new Date(),
        confidence: 0.91,
        url: BASE,
        rawBytes: JSON.stringify(f),
        rawMime: "application/json",
        evidenceSnippet: `${a.OWNER ?? "?"} · $${a.SALE_PRICE?.toLocaleString() ?? "?"} · ${a.ACRES ?? "?"}ac`,
        payload: {
          apn: a.APN,
          owner: a.OWNER ?? null,
          salePrice: a.SALE_PRICE ?? null,
          saleDate: a.SALE_DATE ? new Date(a.SALE_DATE).toISOString() : null,
          acres: a.ACRES ?? null,
          zoning: a.ZONING ?? null,
          address: a.SITUS_ADDR ?? null,
          parish: "Ascension",
        },
      };
    });

    void sinceMs; // used in where-clause string above
    return {
      records,
      nextCursor: null,
      notes: `Ascension parcels: ${records.length} recent sales since ${since.toISOString().slice(0, 10)}`,
    };
  },
};

type ArcGisResponse = { features?: Array<{ attributes: Record<string, unknown> }> };

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
