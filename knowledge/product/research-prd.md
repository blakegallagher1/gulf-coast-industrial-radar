---
title: Research PRD
type: product
status: draft
last_updated: 2026-04-30
---

# Research PRD

## Purpose

Capture the product requirements and decision logic extracted from the April 30, 2026 research PRD and Ideabrowser export.

## Source Documents

- `gulf-coast-industrial-radar-research-prd.md` - internal research and build PRD prepared on 2026-04-30.
- `ideabrowser-full-research-gulf-coast-industrial-radar.md` - Ideabrowser research export generated on 2026-04-30.

## Current Understanding

Gulf Coast Industrial Radar should detect public evidence of industrial project formation before bid day and translate that evidence into investor/developer action. The first buyer remains real estate investors and developers, with contractor/vendor workflows reserved for later expansion.

The core user question is not simply "what project exists?" It is:

- Where is a plausible site or site cluster forming?
- Who appears to control or influence the land?
- Which public records support the thesis?
- What milestone is the project likely in?
- What should an investor or developer do this week?

## Why Now

The source documents frame the timing thesis around four forces:

- Industrial occupiers continue to value strategic locations, manufacturing reshoring, logistics resilience, and future-ready facilities.
- AI and data-center demand make power availability central to industrial site selection.
- Gulf Coast industrial projects often require large land-control footprints before obvious bid packages exist.
- Public permitting, incentive, utility, securities-disclosure, agenda, and GIS systems are now searchable enough to support a public-source monitoring product.

Market references preserved from the PRD:

- CBRE 2026 U.S. industrial outlook: https://www.cbre.com/insights/books/us-real-estate-market-outlook-2026/industrial
- Deloitte 2026 Manufacturing Industry Outlook: https://www.deloitte.com/us/en/insights/industry/manufacturing-industrial-products/manufacturing-industry-outlook.html
- JLL industrial research on manufacturing and multimodal logistics: https://www.jll.com/en-us/newsroom/us-industrial-market-shows-resilience-amid-evolving-tenant-strategies
- Deloitte 2026 Power and Utilities Outlook: https://www.deloitte.com/us/en/insights/industry/power-and-utilities/power-and-utilities-industry-outlook.html

These market references are source-derived and should be independently refreshed before use in customer-facing claims.

## Product Modules

1. Source registry for public source metadata, legal review, cadence, fields, format, and ingestion status.
2. Ingestion workers for HTML, PDFs, ArcGIS REST, CSV, JSON APIs, agendas, public notices, dockets, and filings.
3. AI extraction layer that turns documents into claim-level facts with confidence and evidence excerpts.
4. Entity resolution for companies, shell LLCs, registered agents, officers, addresses, lenders, law firms, and related buyers.
5. Parcel and site graph for geometry, ownership snapshots, acreage, zoning, sale history, infrastructure proximity, and cluster detection.
6. Industrial formation scoring by stage and signal type.
7. Action recommendation engine that converts formation stage into investor/developer next actions.
8. Map-first UI with cluster scoring, timeline, evidence drawer, entity graph, infrastructure context, and recommendations.
9. Analyst review workflow for valid, false positive, duplicate, merge, split, watch, dismiss, and escalate decisions.
10. Weekly brief generator that summarizes corridor-level changes, new alerts, upgraded probabilities, and recommended investor/developer actions.

## MVP Scope

The MVP goal is a working system that identifies likely industrial project formation in one or two Gulf Coast corridors using only public/free sources, with enough evidence for an investor/developer to act.

Must include:

- LED FastLane / ITEP.
- LDEQ EDMS / public notices.
- USACE New Orleans public notices.
- Parish parcel and assessor/GIS layers for 3-5 launch parishes.
- Louisiana SOS entity lookups where feasible.
- SEC EDGAR filings for watchlisted sponsors and sector terms.
- FERC eLibrary for LNG, pipeline, and power-related projects.
- LPSC dockets.
- USGS, BTS, and HIFLD-compatible base infrastructure layers.

Should include:

- Local parish council and planning/zoning agendas.
- Port authority agendas and minutes.
- SAM.gov and USAspending as confirmation or procurement signals.
- EMMA or bond disclosures.

Not MVP:

- Paid parcel aggregators.
- Paid corporate ownership databases.
- Paid bid-intelligence products.
- Automated paid deed downloads.
- Paid satellite imagery.

## Launch Geography

The recommended launch wedge is a narrow Gulf Coast corridor rather than full regional coverage:

1. Lake Charles / Calcasieu / Cameron.
2. Baton Rouge-New Orleans industrial river corridor: Ascension, St. James, Iberville, St. John, St. Charles, Plaquemines, St. Bernard, East Baton Rouge.
3. Houston Ship Channel / Beaumont-Port Arthur.
4. Mobile / Baldwin / coastal Alabama.
5. Pascagoula / Gulfport / coastal Mississippi.

The PRD recommends Louisiana river corridor and Lake Charles first because the area combines known industrial demand, LED/ITEP signals, LDEQ and USACE signals, existing local memory and parcel-source work, and a manageable parish-by-parish parcel ingestion path.

## UX Requirements

The first screen should be a map-first operating view, not a generic dashboard. It should include:

- Gulf Coast map.
- Scored site clusters.
- Alert list sorted by score and change.
- Filters by corridor, stage, source, project type, acreage, and confidence.
- Right-side evidence and action panel.

Alert detail should have tabs for summary, map/parcels, signal timeline, entity graph, infrastructure, source evidence, recommended actions, and analyst notes.

Recommended actions must be operational, such as calling adjacent landowners, watching a specific board agenda, pulling zoning and wetlands constraints, monitoring a permit number, adding a sponsor/entity to a watchlist, escalating for broker outreach, building a target assemblage map, or passing because of wetlands, flood, or power constraints.

## Acceptance Criteria

MVP is complete when:

- At least 3 launch parishes/counties have parcel/GIS ingestion.
- At least 6 public-source lanes are ingested on a schedule.
- Every signal links to raw source evidence.
- AI extraction returns structured claims with confidence and excerpts.
- Project formation score is calculated and visible.
- Quiet land assembly detector produces site-cluster alerts.
- Map UI shows clusters, parcels, infrastructure proximity, signal timeline, and recommended action.
- Analyst can dismiss, watch, escalate, merge, and split alerts.
- Weekly investor brief can be generated from live alert state.
- Backtest report shows lead-time performance across at least 5 known projects.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Free parcel data is inconsistent | Start parish/county-by-parish/county, store source quality and coverage, support manual review, and use source-specific adapters. |
| False positives from ordinary land transactions | Require multi-signal corroboration, penalize low-infrastructure-fit sites, add human review, and backtest known false positives. |
| Entity resolution is hard | Start with deterministic matching, expose entity evidence, let analysts confirm/deny relationships, and store confidence per relationship. |
| Public records lag reality | Combine multiple weak signals, track observed date and document date, and disclose lag per source. |
| Legal or terms issues with scraping | Maintain source registry with terms and allowed methods, prefer APIs/open-data endpoints, throttle responsibly, avoid bypassing access controls, and exclude paid or restricted MVP sources. |

## Open Questions

- Which launch corridor has the best mix of source access, industrial density, and investor urgency?
- Which public parcel sources allow reliable bulk export or API-style querying?
- Which signal combinations produce the best early alerts without creating a false-positive-heavy feed?
- Should the first UI be built inside an existing GPC app or as a standalone prototype?
- What alert frequency is acceptable: daily, weekly, or critical-only?
- Should alerts be sold as SaaS, a weekly intelligence product, or a hybrid analyst-assisted service?
