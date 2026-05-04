/**
 * Louisiana Industrial Tax Exemption Program.
 *
 * No public read API is available for approved ITEP projects.
 *
 * - Primary site: https://www.opportunitylouisiana.gov/incentive/industrial-tax-exemption
 * - Applications are submitted in Fastlane NextGen (portal + account + fee model),
 *   which is currently not machine-readable for anonymous bulk ingestion.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";

const SOURCE_URL = "https://www.opportunitylouisiana.gov/incentive/industrial-tax-exemption";

export const laItepAdapter: SourceAdapter = {
  slug: "la-itep",
  family: "INCENTIVE",
  implemented: false,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const records: AdapterRecord[] = [];
    const notes = [
      "No public searchable data endpoint for LA ITEP approvals was identified.",
      `Current public surface is portal-centric at ${SOURCE_URL}.`,
      "Treat as deferred ingestion until board minutes / approval PDFs are mapped with stable links.",
    ].join(" ");
    return { records, nextCursor: null, notes };
  },
};

