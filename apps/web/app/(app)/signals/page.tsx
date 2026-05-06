import {
  SIGNAL_FAMILIES,
  SIGNAL_FAMILY_LABELS,
  SIGNAL_WEIGHTS,
} from "@gcir/shared";
import { PageHeader } from "@/components/page-header";

const FAMILY_COLOR: Record<string, string> = {
  LAND_CONTROL:        "#2f7575",
  ENVIRONMENTAL_PERMIT: "#3b6ea5",
  INCENTIVE:            "#a87016",
  UTILITY_POWER:        "#7a4ab8",
  ENTITY_FORMATION:     "#7a847f",
  PORT_TERMINAL:        "#1f8aa3",
  PUBLIC_COMPANY:       "#c9402a",
  LOCAL_AGENDA:         "#5b6b66",
  FINANCING:            "#a52e1a",
  PROCUREMENT:          "#3b6ea5",
};

const DESC: Record<string, { what: string; watches: string }> = {
  LAND_CONTROL: {
    what: "Parcel purchases, options, related buyers, mailing-address clusters, contiguous assembly with elevated price-per-acre.",
    watches: "assessor transfer feeds · series-LLC patterns · escrow agent re-use · sale-price premium vs. parish median",
  },
  ENVIRONMENTAL_PERMIT: {
    what: "Air, water, wetlands, stormwater, dredging, NPDES. NOIs and major-source filings are the highest-conviction inputs.",
    watches: "LDEQ EDMS · TCEQ NSR/Title V · MDEQ public notices · USACE 404/408/Sec.10 · NEPA",
  },
  INCENTIVE: {
    what: "ITEP, JETI, state/local economic-development approvals; capex tier and parish disclosure are high-precision.",
    watches: "LED FastLane / IMS · TX JETI · LA Board of Commerce & Industry agendas · MS / AL incentive boards",
  },
  UTILITY_POWER: {
    what: "Large load, substation upgrades, transmission, generation, interconnection. Industrial-scale loads (>100 MW) are rare and project-shaped.",
    watches: "LPSC dockets · MISO / SPP queue · Entergy interconnection · FERC eLibrary · public IRPs",
  },
  ENTITY_FORMATION: {
    what: "Newly formed LLCs, opaque project names, shared registered agents, law-firm escrow addresses, series-LLC patterns.",
    watches: "LA SOS · Sunbiz · TX Comptroller · AL SOS · MS SOS",
  },
  PORT_TERMINAL: {
    what: "Lease and option items, dredging, terminal expansion, land options on port-controlled tracts.",
    watches: "Port of New Orleans · Port of South LA · Plaquemines · Mobile · Pascagoula · Lake Charles",
  },
  PUBLIC_COMPANY: {
    what: "Capex, FID, FEED, named-site or named-corridor disclosures in 10-K, 10-Q, 8-K and capital plans.",
    watches: "EDGAR full-text · XBRL fact extraction · sponsor capex slides · earnings-call transcripts",
  },
  LOCAL_AGENDA: {
    what: "Zoning, infrastructure, road and drainage items, tax districts. The earliest local-government conversations live here.",
    watches: "Parish council packets · planning & zoning agendas · industrial development authorities",
  },
  FINANCING: {
    what: "Bonds, public finance, grants, EMMA notices, IDB authorizations. Surfaces capital structure before public announcement.",
    watches: "LA Bond Commission · EMMA / MSRB · TX Bond Review Board · DOE LPO · Treasury allocations",
  },
  PROCUREMENT: {
    what: "Federal opportunities and awards, subcontract reports, public bids that reference a corridor or named site.",
    watches: "SAM.gov Opportunities · USAspending · public bids · federal grants",
  },
};

export default function SignalsReference() {
  const totalWeight = SIGNAL_FAMILIES.reduce((sum, fam) => sum + SIGNAL_WEIGHTS[fam], 0);

  return (
    <main className="mx-auto max-w-[1180px] flex-1 overflow-y-auto px-10 py-12">
      <PageHeader
        sectionCode="§T"
        eyebrow="Signal taxonomy"
        title="Ten signal families."
        titleAccent="One weighted composite."
        description="The radar's project-formation score is a weighted composite across all signal families that fire. Every weight is honest. Every contributor inspectable. No proprietary aggregators."
        meta={`Σ weights = ${totalWeight}`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {SIGNAL_FAMILIES.map((fam, idx) => {
          const color = FAMILY_COLOR[fam] ?? "#0c100e";
          const weight = SIGNAL_WEIGHTS[fam];
          return (
            <article
              key={fam}
              className="group relative overflow-hidden rounded-[7px] border border-line bg-bone p-6 transition-all hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md"
            >
              {/* Color bar */}
              <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: color }} />

              <header className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-[24px] leading-tight tracking-tight text-ink">
                    {SIGNAL_FAMILY_LABELS[fam]}
                  </h3>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <div className="relative h-1 w-16 overflow-hidden rounded-full bg-bone-3">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${(weight / 25) * 100}%`, background: color }}
                    />
                  </div>
                  <span className="rounded-[3px] border border-line bg-bone-2 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-ink-2">
                    w · {weight}
                  </span>
                </div>
              </header>

              <p className="text-[13.5px] leading-[1.65] text-ink-3">{DESC[fam]?.what}</p>

              <div className="gcir-horizon mt-4 opacity-50" />

              <p className="mt-3.5 text-[12.5px] leading-[1.6] text-muted">
                <strong className="mr-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-2">watches</strong>
                {DESC[fam]?.watches}
              </p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
