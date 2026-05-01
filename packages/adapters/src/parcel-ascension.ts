/**
 * Ascension Parish Assessor — ArcGIS REST parcel adapter.
 *
 * Source: https://gis.ascensionparishla.gov/server/rest/services/AssessorData/Parcel_View/MapServer/2
 *
 * Schema reference: packages/adapters/src/research/ascension-assessor.md
 * (Note: the home domain moved from gis.ascensionparish.net → gis.ascensionparishla.gov in 2025.
 *  The active layer is "AssessorData/Parcel_View/MapServer/2" — AssessorParcel.)
 *
 * The layer exposes parcel attributes + polygon geometry. Owner information
 * is NOT always populated in the GIS layer per the maintainer note —
 * `OWNER` may be empty; the assessor's own site (ascensionassessor.com) is
 * the authoritative owner source. We emit LAND_CONTROL signals from this
 * layer for parcel updates and transfers; an owner-resolution agent fills
 * gaps from the assessor site asynchronously.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE = process.env.ASCENSION_ARCGIS_BASE ?? "https://gis.ascensionparishla.gov/server/rest/services";
// AssessorParcel layer (research artifact: layer id 2)
const LAYER_QUERY = "/AssessorData/Parcel_View/MapServer/2/query";

export const ascensionParcelAdapter: SourceAdapter = {
  slug: "ascension-assessor",
  family: "LAND_CONTROL",
  implemented: true,
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const since = ctx.since ?? daysAgo(14);
    const url = new URL(BASE + LAYER_QUERY);
    url.searchParams.set("where", `LAST_UPD > date '${arcDate(since)}'`);
    url.searchParams.set("outFields", "PARCEL_ID,OWNER,ACRES,ADDRESS,ZONING,LAST_UPD,SALE_DATE,SALE_PRICE");
    url.searchParams.set("returnGeometry", "true");
    url.searchParams.set("outSR", "4326");
    url.searchParams.set("f", "json");

    const res = await fetchWithRetry(url.toString(), {
      timeoutMs: 30_000,
      userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
    });
    const json = (await res.json()) as ArcgisFeatureCollection;
    const features = json.features ?? [];

    const records: AdapterRecord[] = features.map((f) => {
      const a = f.attributes;
      return {
        externalId: `ascension:${a.PARCEL_ID}`,
        family: "LAND_CONTROL",
        predicate: a.SALE_PRICE ? "land.transfer" : "land.parcel.update",
        subjectLabel: `${a.PARCEL_ID} · ${fmtAcres(a.ACRES)}`,
        documentDate: a.SALE_DATE ? new Date(a.SALE_DATE) : a.LAST_UPD ? new Date(a.LAST_UPD) : undefined,
        observedAt: new Date(),
        confidence: a.SALE_PRICE ? 0.97 : 0.86,
        url: `${BASE}/Public/ParcelView/MapServer/0/${a.OBJECTID ?? ""}`,
        rawBytes: JSON.stringify(f),
        rawMime: "application/json",
        evidenceSnippet: `${a.PARCEL_ID} · owner ${a.OWNER ?? "?"} · ${fmtAcres(a.ACRES)}`,
        payload: {
          parcelNumber: a.PARCEL_ID,
          owner: a.OWNER,
          acres: a.ACRES,
          address: a.ADDRESS,
          zoning: a.ZONING,
          saleDate: a.SALE_DATE ?? null,
          salePriceUsd: a.SALE_PRICE ?? null,
          geometry: f.geometry ?? null,
        },
      };
    });

    return {
      records,
      nextCursor: null,
      notes: `Ascension: ${records.length} parcel deltas since ${arcDate(since)}`,
    };
  },
};

type ArcgisFeatureCollection = {
  features?: Array<{
    attributes: Record<string, any>;
    geometry?: unknown;
  }>;
};

function fmtAcres(n: number | undefined): string {
  if (!n) return "—";
  return `${n.toFixed(1)} ac`;
}
function arcDate(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
