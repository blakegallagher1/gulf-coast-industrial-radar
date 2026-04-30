/**
 * SAM.gov (System for Award Management) adapter — contract opportunities.
 *
 * Schema reference: packages/adapters/src/research/sam-gov.md
 *
 * Phase 3.1 hardening notes:
 *   - The original BASE was missing the /prod/ path segment required by
 *     the SAM.gov Opportunities API v2.
 *   - Corrected BASE: https://api.sam.gov/opportunities/v2/search
 *     (the /prod/ prefix is prepended automatically by the API gateway;
 *     the direct public URL is as above).
 *   - Date format in the postedFrom / postedTo parameters must be
 *     MM/dd/yyyy, NOT ISO 8601. The research artifact confirms this.
 *   - API key must be supplied via SAM_GOV_API_KEY env var.
 *
 * Predicate vocabulary:
 *   contract.opportunity     — active solicitation / sources-sought
 *   contract.award           — contract award notice
 */

import type {
  SourceAdapter,
  AdapterContext,
  AdapterResult,
  AdapterRecord,
} from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

const SEARCH_URL =
  process.env.SAM_GOV_BASE ??
  "https://api.sam.gov/opportunities/v2/search";

const API_KEY = process.env.SAM_GOV_API_KEY ?? "";

/** Format a Date as MM/dd/yyyy — required by SAM.gov Opportunities API v2. */
function toSamDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

interface SamOpportunity {
  noticeId: string;
  title: string;
  type: string;
  postedDate: string;
  responseDeadLine: string | null;
  naicsCode: string;
  uiLink: string;
  placeOfPerformance?: {
    state?: { code: string };
    city?: { name: string };
  };
}

interface SamResponse {
  opportunitiesData: SamOpportunity[];
  totalRecords: number;
}

export const samGovAdapter: SourceAdapter = {
  id: "sam-gov",

  async fetch(ctx: AdapterContext): Promise<AdapterResult> {
    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - 30);

    const params = new URLSearchParams({
      api_key: API_KEY,
      postedFrom: toSamDate(past),
      postedTo: toSamDate(now),
      limit: "100",
      offset: "0",
    });

    const url = `${SEARCH_URL}?${params}`;

    let raw: SamResponse;
    try {
      const res = await fetchWithRetry(url);
      raw = (await res.json()) as SamResponse;
    } catch (err) {
      ctx.logger?.warn("sam-gov fetch failed", { err });
      return { records: [] };
    }

    const records: AdapterRecord[] = (raw.opportunitiesData ?? []).map(
      (opp) => ({
        sourceId: `sam-gov:${opp.noticeId}`,
        predicate:
          opp.type?.toLowerCase().includes("award")
            ? "contract.award"
            : "contract.opportunity",
        title: opp.title,
        description: `SAM.gov ${opp.type} — NAICS ${opp.naicsCode}`,
        location: {
          state: opp.placeOfPerformance?.state?.code,
          city: opp.placeOfPerformance?.city?.name,
        },
        date: opp.postedDate,
        url: opp.uiLink,
        fetchedAt: new Date().toISOString(),
      })
    );

    return { records };
  },
};
