---
title: Signal Taxonomy
type: source_model
status: draft
last_updated: 2026-04-30
---

# Signal Taxonomy

## Signal Families

| Signal Family | Examples | Investor Value |
|---|---|---|
| Land control | Parcel purchases, options, related buyers, mailing-address clusters | Earliest site formation clue |
| Entity formation | New LLCs, registered agents, opaque project names, law-firm addresses | Connects shell entities to potential projects |
| Environmental permits | Air, water, wetlands, stormwater, dredging, NPDES | Indicates facility/site work is advancing |
| Incentives | ITEP, JETI, state/local economic development approvals | Confirms capital-project seriousness |
| Utility / power | Large load, substations, transmission, generation, interconnection | Critical for LNG, data centers, hydrogen, ammonia, manufacturing |
| Port / terminal | Leases, dredging, terminal expansion, land options | Indicates logistics and waterfront industrial demand |
| Public-company filings | Capex, FID, FEED, named site, named corridor | Sponsor-level confirmation |
| Local agendas | Zoning, infrastructure, roads, drainage, tax districts | Local entitlement and infrastructure clues |
| Financing | Bonds, public finance, grants, EMMA notices | Confirms infrastructure support and public funding |
| Procurement | SAM.gov, USAspending, public bids | Usually later confirmation |

## Stage Labels

- `watch`
- `site-control`
- `entity-formed`
- `incentive-surfaced`
- `permit-surfaced`
- `wetlands-waterway-surfaced`
- `utility-surfaced`
- `port-agenda-surfaced`
- `financing-surfaced`
- `public-announced`
- `FID`
- `EPC`
- `construction`

## Project Formation Score

Use a 0-100 score until backtesting produces better thresholds.

| Score | Meaning |
|---:|---|
| 90-100 | Likely active industrial project formation |
| 75-89 | Strong site-control or permitting signal |
| 60-74 | Watchlist with multiple corroborating signals |
| 40-59 | Weak or early signal needing review |
| Below 40 | Background noise |

Suggested starting weights:

| Signal | Weight |
|---|---:|
| Land control / parcel assembly | 25 |
| Environmental, wetlands, or coastal permit | 15 |
| Incentive filing | 15 |
| Utility, power, or FERC signal | 15 |
| Entity formation, opacity, or relatedness | 10 |
| Port or local-agenda signal | 8 |
| SEC or corporate disclosure | 7 |
| Procurement or engineering signal | 5 |

Weights should be calibrated through backtesting and false-positive review.

## Confidence Inputs

- Number of corroborating sources.
- Source reliability.
- Stage maturity.
- Entity/site match strength.
- Industrial infrastructure fit.
- Signal freshness.
- Public-announcement status.
- False-positive history for the source pattern.
- Infrastructure fit.
- Entity/site match strength.
- Contradictory evidence.
