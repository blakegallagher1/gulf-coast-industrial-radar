/**
 * Ascension Parish Assessor — ArcGIS REST parcel adapter.
 *
 * Source: https://gis.ascensionparishla.gov/server/rest/services/AssessorData/Parcel_View/FeatureServer/2
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
const LAYER_QUERY = "/AssessorData/Parcel_View/FeatureServer/2/query";
const PAGE_SIZE = 200;

export const ascensionParcelAdapter: SourceAdapter = {
  slug: "ascension-assessor",
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
      "OBJECTID_12,PN_Join,Owner_Name,Owner_Address,Owner_CityStateZipCode,Address_Number,Street_Name,Street_Direction,Physical_Address_City,Physical_Address_State,Physical_Address_Zip_Code,Subdivision,Lot,Block,AISSection,Township,Range,Legal_Description,Assessed_Value,DeedNumber,SaleDate,SalesPrice,Qualified,Ward,Prior_Owner,ParcelType,EditDate,Parcel_Link",
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
    const json = (await res.json()) as ArcgisFeatureCollection;
    if (json.error) {
      throw new Error(`Ascension ArcGIS error ${json.error.code}: ${json.error.message}`);
    }
    const features = json.features ?? [];

    const records: AdapterRecord[] = features.map((f) => {
      const a = f.attributes;
      const parcelNumber = a.PN_Join ?? String(a.OBJECTID_12 ?? "");
      const physicalAddress = [
        a.Address_Number,
        a.Street_Direction,
        a.Street_Name,
        a.Physical_Address_City,
        a.Physical_Address_State,
        a.Physical_Address_Zip_Code,
      ].filter(Boolean).join(" ");
      const documentDate = a.SaleDate ?? a.EditDate;
      return {
        externalId: `ascension:${parcelNumber}`,
        family: "LAND_CONTROL",
        predicate: a.SalesPrice ? "land.transfer" : "land.parcel.update",
        subjectLabel: `${parcelNumber} · ${a.Owner_Name ?? "—"}`,
        documentDate: documentDate ? new Date(documentDate) : undefined,
        observedAt: new Date(),
        confidence: a.SalesPrice ? 0.97 : 0.86,
        url: a.Parcel_Link ?? `${BASE}${LAYER_QUERY.replace("/query", "")}`,
        rawBytes: JSON.stringify(f),
        rawMime: "application/json",
        evidenceSnippet: `${parcelNumber} · owner ${a.Owner_Name ?? "?"}`,
        payload: {
          parcelNumber,
          owner: a.Owner_Name ?? null,
          priorOwner: a.Prior_Owner ?? null,
          ownerAddress: [a.Owner_Address, a.Owner_CityStateZipCode].filter(Boolean).join(", ") || null,
          physicalAddress: physicalAddress || null,
          subdivision: a.Subdivision ?? null,
          lot: a.Lot ?? null,
          block: a.Block ?? null,
          section: a.AISSection ?? null,
          township: a.Township ?? null,
          range: a.Range ?? null,
          legalDescription: a.Legal_Description ?? null,
          assessedValueUsd: a.Assessed_Value ?? null,
          deedNumber: a.DeedNumber ?? null,
          saleDate: a.SaleDate ? new Date(a.SaleDate).toISOString() : null,
          salePriceUsd: a.SalesPrice ?? null,
          qualifiedSale: a.Qualified ?? null,
          ward: a.Ward ?? null,
          parcelType: a.ParcelType ?? null,
          editDate: a.EditDate ? new Date(a.EditDate).toISOString() : null,
          geometry: f.geometry ?? null,
        },
      };
    });

    const nextCursor = json.exceededTransferLimit ? { offset: offset + PAGE_SIZE } : null;

    return {
      records,
      nextCursor,
      notes: `Ascension: ${records.length} parcels (offset=${offset}${json.exceededTransferLimit ? ", more pages" : ""})`,
    };
  },
};

type ArcgisFeatureCollection = {
  features?: Array<{
    attributes: AscensionParcelAttributes;
    geometry?: unknown;
  }>;
  exceededTransferLimit?: boolean;
  error?: {
    code: number;
    message: string;
  };
};

type AscensionParcelAttributes = {
  OBJECTID_12?: number;
  PN_Join?: string;
  Owner_Name?: string;
  Owner_Address?: string;
  Owner_CityStateZipCode?: string;
  Address_Number?: string;
  Street_Name?: string;
  Street_Direction?: string;
  Physical_Address_City?: string;
  Physical_Address_State?: string;
  Physical_Address_Zip_Code?: string;
  Subdivision?: string;
  Lot?: string;
  Block?: string;
  AISSection?: string;
  Township?: string;
  Range?: string;
  Legal_Description?: string;
  Assessed_Value?: number;
  DeedNumber?: string;
  SaleDate?: number;
  SalesPrice?: number;
  Qualified?: number;
  Ward?: string;
  Prior_Owner?: string;
  ParcelType?: string;
  EditDate?: number;
  Parcel_Link?: string;
};
