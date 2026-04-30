"use client";

import type { Alert } from "@gcir/db";

type Props = {
  alert: Alert & { supplementaryEvidence?: SupplementaryEvidence | null };
};

type SupplementaryEvidence = {
  publicCheck: {
    publicCoverageFound: boolean;
    confidence: number;
    projectName?: string;
    announcementDate?: string;
    estimatedValueUsd?: number;
    summary: string;
  };
  publicCitations: { url: string; title?: string }[];
  entities: {
    entityName: string;
    sector: string;
    parentCompany?: string;
    gulfCoastFootprint: boolean;
    recentActivity: string;
  }[];
  totalCostUsd: number;
  runAt: string;
};

export function SummaryTab({ alert }: Props) {
  const ev = alert.supplementaryEvidence as SupplementaryEvidence | null;

  return (
    <div className="space-y-4 p-4">
      {/* Public Coverage Banner */}
      {ev && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            ev.publicCheck.publicCoverageFound
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}
        >
          <span className="font-semibold">
            {ev.publicCheck.publicCoverageFound
              ? "✓ Public announcement found"
              : "⚠️ No public announcement found"}
          </span>
          {ev.publicCheck.projectName && (
            <span className="ml-2 opacity-80">— {ev.publicCheck.projectName}</span>
          )}
          <div className="mt-1 text-xs opacity-70">
            Confidence: {Math.round(ev.publicCheck.confidence * 100)}%
          </div>
        </div>
      )}

      {/* Alert summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Summary</h3>
        <p className="mt-1 text-sm text-gray-600">{alert.summary}</p>
      </div>

      {/* Perplexity summary */}
      {ev && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700">AI Analysis</h3>
          <p className="mt-1 text-sm text-gray-600">{ev.publicCheck.summary}</p>
        </div>
      )}

      {/* Key figures */}
      {ev?.publicCheck.estimatedValueUsd && (
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <span className="text-xs text-gray-500">Estimated Project Value</span>
          <div className="text-lg font-semibold text-gray-800">
            ${(ev.publicCheck.estimatedValueUsd / 1e9).toFixed(1)}B
          </div>
        </div>
      )}
    </div>
  );
}
