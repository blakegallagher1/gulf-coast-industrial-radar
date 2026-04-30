---
title: Data Model
type: implementation
status: draft
last_updated: 2026-04-30
---

# Data Model

## Core Objects

| Object | Purpose |
|---|---|
| `source_registry` | Catalog of source jurisdiction, URL, cost, license, format, cadence, access method, fields, robots/terms review, and ingestion status |
| `source_run` | Specific ingestion attempt with timing, status, errors, and source snapshot references |
| `raw_document` | Preserved source evidence before AI extraction |
| `extracted_claim` | Claim-level structured fact extracted from a raw source with confidence and evidence pointer |
| `project` | Suspected or confirmed industrial project |
| `site` | Physical site or cluster of parcels |
| `parcel` | Individual parcel record from free public data |
| `parcel_snapshot` | Time-specific parcel owner, acreage, value, sale, zoning, or geometry state |
| `entity` | Company, LLC, owner, sponsor, registered agent, consultant, agency, port, utility |
| `entity_relationship` | Deterministic or analyst-confirmed relationship between entities |
| `signal` | Observed source event or fact |
| `project_milestone` | Stage change or event in the suspected project timeline |
| `alert` | User-facing signal or site-cluster notification |
| `recommended_action` | Investor/developer action generated from evidence and stage |
| `analyst_review` | Human review state and notes for valid, false positive, duplicate, merge, split, watch, dismiss, or escalate |
| `watchlist` | User or analyst watch criteria by corridor, company, parcel, source, project type, or threshold |

## Common Fields

Every claim-bearing object should preserve:

- `source_url`
- `observed_at`
- `extracted_facts`
- `confidence`
- `reason_code`
- `source_excerpt` when available
- `raw_document_id`
- `source_run_id`
- `document_date` when available
- `observed_date`
- `source_vintage`
- `review_status`

## Project Fields

- Name.
- Aliases.
- Sponsor.
- Facility type.
- Geography.
- Estimated capex.
- Stage.
- Probability.
- Related sites.
- Related signals.

## Site Fields

- Address or locality.
- Parcel IDs.
- Acreage.
- Geometry.
- Infrastructure proximity.
- Flood/wetlands constraints.
- Zoning/land-use notes.
- Contiguity score.
- Acquisition window.
- Related buyer entities.

## Signal Fields

- Source family.
- Source name.
- Date observed.
- URL/document.
- Extracted facts.
- Related entities.
- Related site/project.
- Confidence score.
- Stage implication.

## Alert Fields

- Suspected project/site name.
- Parish/county.
- Score.
- Stage.
- Confidence.
- Detected control acreage.
- Parcel count.
- Acquisition window.
- Buyer entities.
- Infrastructure proximity summary.
- Zoning/flood/wetlands flags.
- Source evidence links.
- Recommended action.
