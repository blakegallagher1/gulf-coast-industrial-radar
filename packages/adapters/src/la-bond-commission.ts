/**
 * Louisiana Bond Commission agendas.
 *
 * Seeded as the financing path for IDB-related decisions, but there is currently
 * no machine-parsable public data stream tied directly to project entities.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";

const SOURCE_URL = "https://www.doa.la.gov/doa/sbc";

export const laBondCommissionAdapter: SourceAdapter = {
  slug: "la-bond-commission",
  family: "FINANCING",
  implemented: false,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const records: AdapterRecord[] = [];
    const notes = [
      "No public machine-readable Bond Commission agenda/feed endpoint was identified for robust ingest.",
      `Public landing remains at ${SOURCE_URL}, which requires agenda-by-agenda parsing once URLs are stabilized.`,
      "Adapter stays non-production until structured extraction is in place.",
    ].join(" ");
    return { records, nextCursor: null, notes };
  },
};

