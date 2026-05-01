/**
 * TCEQ pending air permits — Texas environmental quality.
 *
 * Schema reference: packages/adapters/src/research/tceq.md
 *
 * Phase 3.1 hardening notes:
 *   - Previous source URL "/nav/air_status.html" was a navigation/status PAGE,
 *     not an actual data table. The research artifact identifies the concrete
 *     data HTML tables:
 *       NSR pending:    https://www.tceq.texas.gov/assets/public/permitting/air/reports/applications/nsr-pending-permits.html
 *       Title V pending: https://www.tceq.texas.gov/assets/public/permitting/air/reports/applications/titlev-pending-permits.html
 *       Title V current (post-public-notice): https://www.tceq.texas.gov/assets/public/permitting/air/Title_V/announcements/pnwebrpt.htm
 *   - Table column schema confirmed:
 *       NSR/Title V pending: [Applicant Name, Facility Name/Area Name, Permit Number, Received Date, Application Link]
 *       Title V current:     [Applicant Name, Project Description, Permit Number, Project Documents, County Name, Publication of Notice Authorized, ...]
 *   - County field ONLY present in Title V current table; absent in NSR and Title V pending.
 *   - No API; static HTML tables updated periodically.
 *   - Alphabetical-index anchor rows ("A", "B", ..., "Back to top") must be filtered.
 *   - Updated parser to match research-confirmed column order and filter noise rows.
 *
 * Lists pending NSR (New Source Review) and Title V applications.
 * Heavy industrial intent on the Texas Gulf Coast surfaces here first.
 */

import type { SourceAdapter, AdapterContext, AdapterResult, AdapterRecord } from "./types";
import { fetchWithRetry } from "./utils/fetch-with-retry";

// Corrected URLs per research artifact — these are the actual data table pages.
const NSR_URL = "https://www.tceq.texas.gov/assets/public/permitting/air/reports/applications/nsr-pending-permits.html";
const TITLEV_URL = "https://www.tceq.texas.gov/assets/public/permitting/air/reports/applications/titlev-pending-permits.html";

export const tceqAdapter: SourceAdapter = {
  slug: "tceq",
  family: "ENVIRONMENTAL_PERMIT",
  implemented: true,
  async run(_ctx: AdapterContext): Promise<AdapterResult> {
    const records: AdapterRecord[] = [];

    // Fetch both NSR and Title V pending tables.
    for (const { url, permitType } of [
      { url: NSR_URL, permitType: "NSR" },
      { url: TITLEV_URL, permitType: "TitleV" },
    ]) {
      let html: string;
      try {
        const res = await fetchWithRetry(url, {
          timeoutMs: 25_000,
          userAgent: "GulfCoastIndustrialRadar/0.1 contact@gallagherpropco.com",
        });
        html = await res.text();
      } catch {
        continue;
      }
      const items = parsePending(html);
      for (const p of items) {
        records.push({
          externalId: `tceq:${permitType}:${p.permitNo ?? Math.random()}`,
          family: "ENVIRONMENTAL_PERMIT",
          predicate: "permit.tceq.air",
          subjectLabel: `${p.applicant ?? "Applicant"} · ${p.county ?? ""} · ${p.permitNo ?? ""}`,
          observedAt: new Date(),
          confidence: 0.86,
          url,
          rawBytes: JSON.stringify(p),
          rawMime: "application/json",
          payload: { ...p, permitType },
        });
      }
    }
    return { records, nextCursor: null, notes: `TCEQ: ${records.length} pending (NSR + Title V)` };
  },
};

type TceqRow = { permitNo?: string; applicant?: string; facilityName?: string; county?: string; receivedDate?: string; status?: string };

/**
 * Parse confirmed TCEQ pending-permits HTML tables.
 *
 * NSR / Title V pending column order (research artifact confirmed):
 *   [0] Applicant Name  [1] Facility/Area Name  [2] Permit Number  [3] Received Date  [4] Application Link text
 *
 * Title V current (pnwebrpt.htm) adds County Name at [4] but we only parse
 * the NSR and Title V pending tables here.
 *
 * Filter: skip rows where permit number looks like an alpha-index anchor
 * (e.g. "A", "B") or "Back to top" noise rows.
 */
function parsePending(html: string): TceqRow[] {
  const out: TceqRow[] = [];
  const rows = html.split(/<tr[^>]*>/i).slice(1);
  for (const r of rows) {
    const cells = Array.from(r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
      m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#160;/g, " ").trim(),
    );
    if (cells.length < 3) continue;
    // Filter alphabetical-index and "Back to top" noise rows.
    const applicant = cells[0] || "";
    if (!applicant || /^back\s+to\s+top$/i.test(applicant)) continue;
    if (/^\*\*.*\*\*$/.test(applicant)) continue; // section headers like "** NSR Case-by-Case **"
    const permitNo = cells[2] || undefined;
    if (!permitNo || /^[a-z]$/i.test(permitNo)) continue; // single-letter index anchors
    out.push({
      applicant: applicant || undefined,
      facilityName: cells[1] || undefined,
      permitNo,
      receivedDate: cells[3] || undefined,
      status: cells[4] || undefined,
    });
  }
  return out;
}
