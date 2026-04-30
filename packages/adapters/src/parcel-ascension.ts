/**
 * Ascension Parish Assessor adapter
 *
 * Phase 3 fix: domain moved from ascensionassessor.com to ascensionparishla.gov.
 * Search endpoint: GET /government/assessor/property-search
 */

import { fetch } from "undici";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.ascensionparishla.gov/government/assessor/property-search";

export type AscensionParcel = {
  parcelId: string;
  ownerName: string;
  siteAddress: string;
  assessedValue: number;
  saleDate: string | null;
  salePrice: number | null;
};

export async function searchParcels(
  ownerName: string,
  page = 1,
): Promise<{ parcels: AscensionParcel[]; hasMore: boolean }> {
  const url = new URL(BASE_URL);
  url.searchParams.set("owner", ownerName);
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "GulfCoastIndustrialRadar/0.3 (contact@gcir.dev)" },
  });

  if (!res.ok) throw new Error(`Ascension assessor HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const parcels: AscensionParcel[] = [];
  $(".results-table tbody tr").each((_, row) => {
    const cells = $(row).find("td").map((_, td) => $(td).text().trim()).get();
    if (cells.length < 6) return;
    parcels.push({
      parcelId: cells[0],
      ownerName: cells[1],
      siteAddress: cells[2],
      assessedValue: parseDollar(cells[3]),
      saleDate: cells[4] || null,
      salePrice: cells[5] ? parseDollar(cells[5]) : null,
    });
  });

  const hasMore = $(".pagination .next").length > 0;
  return { parcels, hasMore };
}

function parseDollar(s: string): number {
  return Number(s.replace(/[^0-9.]/g, "")) || 0;
}
