/**
 * East Baton Rouge Parish parcel adapter — ArcGIS REST.
 *
 * Schema reference: packages/adapters/src/research/ebr-gis.md
 *
 * Phase 3.1.1 live-probe results (2026-04-30 — replaces all prior TODOs):
 *
 *   1. Canonical endpoint:
 *      https://maps.brla.gov/gis/rest/services/Cadastral/Tax_Parcel/MapServer/0
 *      (Discovered via the EBR Open Data hub /api/search v1 collection.
 *       The ArcGIS Online portal at data-ebrgis.opendata.arcgis.com is just
 *       a metadata catalogue; the live FeatureServer is on the legacy
 *       on-prem maps.brla.gov server, which IS up and serving public traffic.)
 *
 *   2. Real field schema (NOT what the research artifact claimed):
 *        ID                 OID
 *        ASSESSMENT_NUM     string  ← parcel ID  (was ASMT)
 *        PRONO              integer  property number
 *        OWNER              string  ← owner name (correct)
 *        OWNER_ADDRESS, OWNER_CITY_STATE_ZIP, PHYSICAL_ADDRESS
 *        SUBDIVISION, WARD_SECTION, LOT, BLOCK, LEGAL_DESCRIPTION
 *        FLOOD_ZONE         string
 *        SALE_YEAR          string  ← only sale info (no SALE_DATE / SALE_PRICE!)
 *        STATUS             string
 *        SUM_HOMESTEAD_EXEMPTION, SUM_LOT_VALUE, SUM_LAND_VALUE,
 *        SUM_IMPROVEMENT_VALUE, SUM_FAIR_MARKET_VALUE, SUM_ASSESSED_VALUE
 *        GEOMETRY           polygon
 *
 *   3. Fields that DON'T exist on this layer: ACRES, ZONING, SALE_DATE,
 *      SALE_PRICE, LAST_EDIT, LAST_UPDATE. We can't filter by edit time
 *      and can't derive transfer events from this single layer alone.
 *
 *   4. Acreage must be computed from polygon geometry (Shape area in
 *      WKID-projected units) when needed. Zoning is in a separate layer
 *      ("Zoning" published from the same hub) — left as a TODO.
 *
 *   5. Practical adapter behaviour:
 *      - emit `land.parcel.update` records with the fields we DO have
 *      - SALE_YEAR (string) populates `payload.saleYear`; we don't claim
 *        a sale date or price (we don't have them)
 *      - Without LAST_EDIT we can't query incrementally; the run is
 *        effectively a full snapshot. Throttled to a small batch each
 *        tick (resultOffset paging).
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const BASE =
  process.env.EBR_ARCGIS_BASE ??
  "https://maps.brla.gov/gis/rest/services";
const LAYER_QUERY = "/Cadastral/Tax_Parcel/MapServer/0/query";

const PAGE_SIZE = 200;

export const ebrParcelAdapter: SourceAdapter = {
  slug: "ebr-gis",
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
      "ASSESSMENT_NUM,PRONO,OWNER,OWNER_ADDRESS,OWNER_CITY_STATE_ZIP,PHYSICAL_ADDRESS,SUBDIVISION,WARD_SECTION,LEGAL_DESCRIPTION,FLOOD_ZONE,SALE_YEAR,STATUS,SUM_FAIR_MARKET_VALUE,SUM_ASSESSED_VALUE",
    );
    url.searchParams.set("returnGeometry", "true");
    url.searchParams.set("outSR", "4326");
    url.searchParams.set("resultOffset", String(offset));
    url.searchParams.set("resultRecordCount", String(PAGE_SIZE));
    url.searchParams.set("f", "json");

    const res = await fetchWithRetry(url.toString(), {
      timeoutMs: 30_000,
      userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
    });
    const json = (await res.json()) as {
      features?: Array<{ attributes: Record<string, unknown>; geometry?: unknown }>;
      exceededTransferLimit?: boolean;
    };

    const records: AdapterRecord[] = (json.features ?? []).map((f) => {
      const a = f.attributes as {
        ASSESSMENT_NUM?: string;
        PRONO?: number;
        OWNER?: string;
        OWNER_ADDRESS?: string;
        OWNER_CITY_STATE_ZIP?: string;
        PHYSICAL_ADDRESS?: string;
        SUBDIVISION?: string;
        WARD_SECTION?: string;
        LEGAL_DESCRIPTION?: string;
        FLOOD_ZONE?: string;
        SALE_YEAR?: string;
        STATUS?: string;
        SUM_FAIR_MARKET_VALUE?: number;
        SUM_ASSESSED_VALUE?: number;
      };
      const parcelNumber = a.ASSESSMENT_NUM ?? String(a.PRONO ?? "");
      return {
        externalId: `ebr:${parcelNumber}`,
        family: "LAND_CONTROL",
        // EBR has no transfer-date field, so we can only emit a generic
        // parcel update; downstream entity-resolution decides whether the
        // owner change implies a transfer.
        predicate: "land.parcel.update",
        subjectLabel: `${parcelNumber} · ${a.OWNER ?? "—"}`,
        observedAt: new Date(),
        confidence: 0.84,
        url: `${BASE}${LAYER_QUERY.replace("/query", "")}`,
        rawBytes: JSON.stringify(f),
        rawMime: "application/json",
        payload: {
          parcelNumber,
          propertyNumber: a.PRONO ?? null,
          owner: a.OWNER ?? null,
          ownerAddress: [a.OWNER_ADDRESS, a.OWNER_CITY_STATE_ZIP].filter(Boolean).join(", ") || null,
          physicalAddress: a.PHYSICAL_ADDRESS ?? null,
          subdivision: a.SUBDIVISION ?? null,
          wardSection: a.WARD_SECTION ?? null,
          legalDescription: a.LEGAL_DESCRIPTION ?? null,
          floodZone: a.FLOOD_ZONE ?? null,
          saleYear: a.SALE_YEAR ?? null,
          status: a.STATUS ?? null,
          fairMarketValueUsd: a.SUM_FAIR_MARKET_VALUE ?? null,
          assessedValueUsd: a.SUM_ASSESSED_VALUE ?? null,
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
      notes: `EBR: ${records.length} parcels (offset=${offset}${json.exceededTransferLimit ? ", more pages" : ""})`,
    };
  },
};
