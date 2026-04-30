/**
 * Louisiana Secretary of State Commercial Search adapter
 *
 * Phase 3 fix: path changed from /BusinessServices/SearchForABusiness/
 * to /commercialsearch/ (coraweb.sos.la.gov subdomain).
 */

import { fetch } from "undici";
import * as cheerio from "cheerio";

const SEARCH_URL = "https://coraweb.sos.la.gov/commercialsearch/CommercialSearch.aspx";

export type SosEntity = {
  entityName: string;
  entityType: string;
  status: string;
  dateFormed: string;
  parish: string;
};

export async function searchEntities(
  entityName: string,
  status: "Active" | "Inactive" | "All" = "Active",
): Promise<SosEntity[]> {
  // First GET to obtain ViewState
  const getRes = await fetch(SEARCH_URL, {
    headers: { "User-Agent": "GulfCoastIndustrialRadar/0.3 (contact@gcir.dev)" },
  });
  const getHtml = await getRes.text();
  const $get = cheerio.load(getHtml);
  const viewstate = $get("#__VIEWSTATE").val() as string;
  const eventValidation = $get("#__EVENTVALIDATION").val() as string;

  const body = new URLSearchParams({
    __EVENTTARGET: "btnSearch",
    __VIEWSTATE: viewstate ?? "",
    __EVENTVALIDATION: eventValidation ?? "",
    txtEntityName: entityName,
    rblStatus: status,
    rblSearchType: "Contains",
  });

  const postRes = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "GulfCoastIndustrialRadar/0.3 (contact@gcir.dev)",
    },
    body: body.toString(),
  });

  const postHtml = await postRes.text();
  const $ = cheerio.load(postHtml);

  const entities: SosEntity[] = [];
  $("#searchResultsTable tbody tr").each((_, row) => {
    const cells = $(row)
      .find("td")
      .map((_, td) => $(td).text().trim())
      .get();
    if (cells.length < 5) return;
    entities.push({
      entityName: cells[0],
      entityType: cells[1],
      status: cells[2],
      dateFormed: cells[3],
      parish: cells[4],
    });
  });

  return entities;
}
