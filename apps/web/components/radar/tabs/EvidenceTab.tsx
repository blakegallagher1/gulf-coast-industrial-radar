"use client";

type SupplementaryEvidence = {
  publicCheck: {
    publicCoverageFound: boolean;
    confidence: number;
    summary: string;
  };
  publicCitations: { url: string; title?: string }[];
  entities: {
    entityName: string;
    sector: string;
    parentCompany?: string;
    gulfCoastFootprint: boolean;
    recentActivity: string;
    confidence: number;
  }[];
  totalCostUsd: number;
  runAt: string;
};

type Props = {
  supplementaryEvidence: SupplementaryEvidence | null | undefined;
};

export function EvidenceTab({ supplementaryEvidence: ev }: Props) {
  if (!ev) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No supplementary evidence available. Perplexity validation may be disabled or still running.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Entity research */}
      {ev.entities.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Entity Research</h3>
          <div className="space-y-3">
            {ev.entities.map((entity) => (
              <div key={entity.entityName} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">{entity.entityName}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      entity.gulfCoastFootprint
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {entity.gulfCoastFootprint ? "Gulf Coast presence" : "No Gulf Coast record"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{entity.sector}</div>
                {entity.parentCompany && (
                  <div className="mt-0.5 text-xs text-gray-500">Parent: {entity.parentCompany}</div>
                )}
                <p className="mt-2 text-sm text-gray-600">{entity.recentActivity}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Public citations */}
      {ev.publicCitations.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Sources</h3>
          <ul className="space-y-1">
            {ev.publicCitations.map((cite) => (
              <li key={cite.url}>
                <a
                  href={cite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {cite.title ?? cite.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Meta */}
      <section className="text-xs text-gray-400">
        <div>Validation cost: ${ev.totalCostUsd.toFixed(4)}</div>
        <div>Run at: {new Date(ev.runAt).toLocaleString()}</div>
      </section>
    </div>
  );
}
