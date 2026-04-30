---
title: MVP Build Plan
type: implementation
status: draft
last_updated: 2026-04-30
---

# MVP Build Plan

## Purpose

Turn the April 30, 2026 PRD roadmap into an implementation sequence for a public/free-source-only MVP.

## Source Documents

- `gulf-coast-industrial-radar-research-prd.md` - Sections 14, 15, 17, and 18.
- `ideabrowser-full-research-gulf-coast-industrial-radar.md` - execution plan and product offerings.

## Suggested Stack

- Postgres + PostGIS for parcels, sites, geometry, source records, and signal graph.
- Object storage for raw evidence snapshots.
- Background jobs for source ingestion and document parsing.
- Queue-based extraction pipeline.
- LLM extraction with structured JSON schema and evidence pointers.
- Map frontend using MapLibre or similar.
- Internal admin/review interface.
- Email alerting first, with Slack optional for pilots.

## Core Tables

- `source_registry`
- `source_runs`
- `raw_documents`
- `extracted_claims`
- `entities`
- `entity_relationships`
- `parcels`
- `parcel_snapshots`
- `sites`
- `site_parcels`
- `signals`
- `projects`
- `project_milestones`
- `alerts`
- `recommended_actions`
- `analyst_reviews`
- `watchlists`

## Roadmap

| Phase | Goal | Outputs |
|---|---|---|
| 0 | Source and backtest setup | Source registry, launch parishes/counties, backtest dataset, base infrastructure layers, scoring schema |
| 1 | Evidence pipeline | LED/ITEP, LDEQ, USACE, SEC, parish parcel, and infrastructure ingestion with raw evidence preservation |
| 2 | Site and signal graph | Parcel snapshots, entity resolution, signal-to-site matching, project formation score |
| 3 | Quiet land assembly MVP | Parcel clusters, buyer opacity, infrastructure proximity, evidence-backed alerts |
| 4 | Investor UI | Map-first alert UI, evidence drawer, signal timeline, recommended actions, watchlists |
| 5 | Weekly brief and feedback loop | Weekly investor/developer brief, analyst review workflow, backtest/eval dashboard |
| 6 | Contractor expansion | EPC/procurement workflows and contractor-specific recommendations after investor radar works |

## First Build Task List

1. Create source registry schema and seed verified public/free sources.
2. Create raw evidence archive model and storage path.
3. Build LED FastLane/ITEP ingestion adapter.
4. Build LDEQ EDMS/public notice adapter.
5. Build USACE New Orleans public notice adapter.
6. Build SEC EDGAR keyword/watchlist adapter.
7. Build parcel adapter for one high-value parish.
8. Build base infrastructure ingestion for USGS/BTS/HIFLD-compatible layers.
9. Implement structured AI extraction schema for industrial-project signals.
10. Implement `site`, `signal`, `entity`, `parcel`, and `project` tables.
11. Implement deterministic entity normalization and relationship rules.
12. Implement quiet land assembly cluster detection.
13. Implement first project formation score.
14. Build map-first internal UI.
15. Add evidence drawer and signal timeline.
16. Add recommended-action engine for investor/developer use cases.
17. Add analyst review states.
18. Run 5-project backtest.
19. Tune scoring thresholds.
20. Generate first weekly investor brief.

## Implementation Notes

- Preserve raw snapshots before AI extraction.
- Store extracted facts as claims, not final truth.
- Keep evidence pointers on every claim-bearing object.
- Calibrate scoring through backtests before trusting automated alerts.
- Maintain source terms/access notes in the source registry before scheduling scrapers.

