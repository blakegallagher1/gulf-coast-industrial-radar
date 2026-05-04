/**
 * FERC eLibrary.
 *
 * The public FERC eLibrary area is not currently represented with a machine-readable
 * bulk feed for utility project formation intelligence in this version.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";

const SOURCE_URL = "https://elibrary.ferc.gov";

export const fercElibraryAdapter: SourceAdapter = {
  slug: "ferc-elibrary",
  family: "UTILITY_POWER",
  implemented: false,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const records: AdapterRecord[] = [];
    const notes = [
      "No stable public API/JSON feed was identified for incremental FERC filing intelligence.",
      `Current source is reference only via ${SOURCE_URL}; pages still require deeper extraction work.`,
      "Marking as degraded prevents hard failures and keeps ingestion continuity.",
    ].join(" ");
    return { records, nextCursor: null, notes };
  },
};

