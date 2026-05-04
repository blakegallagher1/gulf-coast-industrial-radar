/**
 * Texas Job and Economic Development Information (JETI) public listing.
 *
 * Live probe baseline indicates there is no stable machine-readable public index for
 * ongoing approved projects in a format we can safely ingest at this stage.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";

const SOURCE_URL = "https://comptroller.texas.gov";

export const txJetiAdapter: SourceAdapter = {
  slug: "tx-jeti",
  family: "INCENTIVE",
  implemented: false,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const records: AdapterRecord[] = [];
    const notes = [
      "No public scrape-safe listing endpoint for JETI project intelligence was identified.",
      `Tracking remains on source home page (${SOURCE_URL}) and official budget/legislative channels instead.`,
      "Adapter marked non-implemented until a stable grant/award surface is confirmed.",
    ].join(" ");
    return { records, nextCursor: null, notes };
  },
};

