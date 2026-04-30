import {
  SIGNAL_FAMILIES,
  SIGNAL_FAMILY_LABELS,
  SIGNAL_WEIGHTS,
} from "@gcir/shared";

const FAMILY_COLOR: Record<string, string> = {
  LAND_CONTROL: "#10a37f",
  ENVIRONMENTAL_PERMIT: "#1f5fa8",
  INCENTIVE: "#ca8a04",
  UTILITY_POWER: "#7e22ce",
  ENTITY_FORMATION: "#6b6b6b",
  PORT_TERMINAL: "#0891b2",
  PUBLIC_COMPANY: "#dc2626",
  LOCAL_AGENDA: "#475569",
  FINANCING: "#b3261e",
  PROCUREMENT: "#1f5fa8",
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
  return (
    <main className="mx-auto max-w-[1120px] flex-1 overflow-y-auto px-10 py-9">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Reference</div>
      <h1 className="mb-1 text-[36px] font-semibold leading-[1.1] tracking-tighter">
        Signal taxonomy
      </h1>
      <p className="mb-6 text-[15.5px] text-muted-2">
        Ten signal families with starting weights. The radar's project-formation score is a weighted composite across all that fire.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3.5">
        {SIGNAL_FAMILIES.map((fam) => (
          <article
            key={fam}
            className="rounded-md border border-line bg-white px-5 py-4 transition-all hover:border-stone-300 hover:shadow-sm"
          >
            <header className="mb-1.5 flex items-start justify-between gap-2">
              <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold leading-tight tracking-tight">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: FAMILY_COLOR[fam] }} />
                {SIGNAL_FAMILY_LABELS[fam]}
              </h3>
              <span className="rounded border border-line-2 bg-bg-2 px-1.5 py-px font-mono text-[11px] font-semibold text-muted">
                w · {SIGNAL_WEIGHTS[fam]}
              </span>
            </header>
            <p className="mb-2.5 text-[13px] leading-relaxed text-ink-3">{DESC[fam].what}</p>
            <p className="text-[12px] leading-snug text-muted">
              <strong className="font-semibold text-ink-2">Watches:</strong> {DESC[fam].watches}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
