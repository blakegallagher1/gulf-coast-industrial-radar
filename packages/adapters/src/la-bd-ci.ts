/**
 * Louisiana Board of Commerce and Industry.
 *
 * We can see public meeting schedules and references to approvals, but there is no
 * consistent machine-readable agenda/approval feed in the current surface.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";

const SOURCE_URL = "https://www.opportunitylouisiana.gov/about-led/advisory-boards/louisiana-board-of-commerce-and-industry";

export const laBdCiAdapter: SourceAdapter = {
  slug: "la-bd-ci",
  family: "INCENTIVE",
  implemented: false,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const records: AdapterRecord[] = [];
    const notes = [
      "No consistently structured public feed for Board of Commerce & Industry approvals is currently available.",
      `Static notice sources remain at ${SOURCE_URL}; links for approvals and meeting notices are not yet normalized.`,
      "Keeping this source as degraded until notice PDFs or a stable scrape target is mapped.",
    ].join(" ");
    return { records, nextCursor: null, notes };
  },
};

