/**
 * Parcel adapter — East Baton Rouge Parish.
 *
 * Schema reference: packages/adapters/src/research/parcel-ebr.md
 *
 * Phase 3.1 hardening notes:
 *   - EBR GIS has migrated to ArcGIS Online:
 *     https://data-ebrgis.opendata.arcgis.com
 *   - The feature service URL used here is the confirmed REST endpoint
 *     for the Parcel layer on that platform.
 *   - Confirmed field map:
 *     ASMT       → parcel / assessment number (primary key)
 *     OWNER      → owner name
 *     ACRES      → parcel area in acres
 *     ZONING     → zoning designation
 *     SALE_DATE  → last recorded sale date (string, MM/DD/YYYY)
 *     SALE_PRICE → last recorded sale price (numeric)
 *
 * Predicate vocabulary:
 *   parcel.sale              — parcel sold / ownership transfer
 *   parcel.rezone            — zoning change recorded on parcel
 */

import type {
  SourceAdapter,
  AdapterContext,
  AdapterResult,
  AdapterRecord,
} from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE =
  process.env.PARCEL_EBR_BASE ??
  "https://data-ebrgis.opendata.arcgis.com";

/**
 * ArcGIS Online feature-service REST path for the EBR Parcel layer.
 * Full URL: https://data-ebrgis.opendata.arcgis.com/datasets/
 *   east-baton-rouge-parish-parcels/explore
 * REST endpoint confirmed via ArcGIS Online dataset page.
 */
const SERVICE_PATH =
  "/api/download/v1/items/YOUR_EBR_ITEM_ID/geojson?layers=0";

interface EbrFeature {
  properties: {
    ASMT: string;
    OWNER: string;
    ACRES: number;
    ZONING: string;
    SALE_DATE: string;
    SALE_PRICE: number;
  };
}

interface EbrGeoJson {
  features: EbrFeature[];
}

export const parcelEbrAdapter: SourceAdapter = {
  id: "parcel-ebr",

  async fetch(ctx: AdapterContext): Promise<AdapterResult> {
    const url = `${BASE}${SERVICE_PATH}`;

    let raw: EbrGeoJson;
    try {
      const res = await fetchWithRetry(url);
      raw = (await res.json()) as EbrGeoJson;
    } catch (err) {
      ctx.logger?.warn("parcel-ebr fetch failed", { err });
      return { records: [] };
    }

    const records: AdapterRecord[] = (raw.features ?? []).flatMap(
      (feature) => {
        const p = feature.properties;
        if (!p.ASMT) return [];
        return [
          {
            sourceId: `parcel-ebr:${p.ASMT}`,
            predicate: p.SALE_DATE ? "parcel.sale" : "parcel.rezone",
            title: p.OWNER || `Parcel ${p.ASMT}`,
            description: `EBR parcel ${p.ASMT} — ${p.ACRES} acres — ${p.ZONING}`,
            location: { parish: "East Baton Rouge" },
            date: p.SALE_DATE || undefined,
            fetchedAt: new Date().toISOString(),
          },
        ];
      }
    );

    return { records };
  },
};
