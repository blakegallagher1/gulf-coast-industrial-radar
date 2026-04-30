/**
 * Parcel adapter — Calcasieu Parish.
 *
 * Schema reference: packages/adapters/src/research/parcel-calcasieu.md
 *
 * Phase 3.1 hardening notes:
 *   - BASE URL confirmed: https://www.calcasieu.net/departments/assessor
 *   - TODO(phase3.1): Confirm the exact GIS/REST service path. The
 *     research artifact references a web map viewer but does not document
 *     a queryable REST endpoint URL. The SERVICE_PATH constant below is
 *     a best-guess placeholder.
 *   - TODO(phase3.1): Confirm the primary parcel identifier field name.
 *     The research artifact uses "PARCEL_ID" as a label but does not
 *     confirm the ArcGIS layer field alias.
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
  process.env.PARCEL_CALCASIEU_BASE ??
  "https://www.calcasieu.net/departments/assessor";

/**
 * TODO(phase3.1): Replace with confirmed ArcGIS REST query URL once the
 * service endpoint is identified via the Calcasieu GIS portal.
 */
const SERVICE_PATH = "/arcgis/rest/services/Parcels/MapServer/0/query";

const DEFAULT_QUERY = new URLSearchParams({
  where: "1=1",
  outFields: "PARCEL_ID,OWNER,ACRES,ZONING,SALE_DATE,SALE_PRICE",
  f: "json",
  resultRecordCount: "500",
});

interface CalcasieuRecord {
  attributes: {
    PARCEL_ID: string; // TODO(phase3.1): confirm field name
    OWNER: string;
    ACRES: number;
    ZONING: string;
    SALE_DATE: string;
    SALE_PRICE: number;
  };
}

interface CalcasieuResponse {
  features: CalcasieuRecord[];
}

export const parcelCalcasieuAdapter: SourceAdapter = {
  id: "parcel-calcasieu",

  async fetch(ctx: AdapterContext): Promise<AdapterResult> {
    const url = `${BASE}${SERVICE_PATH}?${DEFAULT_QUERY}`;

    let raw: CalcasieuResponse;
    try {
      const res = await fetchWithRetry(url);
      raw = (await res.json()) as CalcasieuResponse;
    } catch (err) {
      ctx.logger?.warn("parcel-calcasieu fetch failed", { err });
      return { records: [] };
    }

    const records: AdapterRecord[] = (raw.features ?? []).flatMap(
      (feature) => {
        const a = feature.attributes;
        if (!a.PARCEL_ID) return [];
        return [
          {
            sourceId: `parcel-calcasieu:${a.PARCEL_ID}`,
            predicate: a.SALE_DATE ? "parcel.sale" : "parcel.rezone",
            title: a.OWNER || `Parcel ${a.PARCEL_ID}`,
            description: `Calcasieu parcel ${a.PARCEL_ID} — ${a.ACRES} acres — ${a.ZONING}`,
            location: { parish: "Calcasieu" },
            date: a.SALE_DATE || undefined,
            fetchedAt: new Date().toISOString(),
          },
        ];
      }
    );

    return { records };
  },
};
