# Gulf Coast Industrial Radar

A private real estate intelligence platform for tracking industrial development signals across the Gulf Coast region.

## What it does

- **Source monitoring** — polls 12 public data sources (LED FastLane, LDEQ EDMS, USACE permits, LPSC filings, LA SOS, parcel records, SEC EDGAR, SAM.gov, EMMA/MSRB, TCEQ)
- **AI extraction** — 9 AI agents extract structured signals from raw documents
- **Scoring** — project formation, quiet land assembly detection, and site fit scoring
- **Radar map** — MapLibre-based interactive map with alert overlays and filter rail
- **Alert drawer** — 6-tab drawer (Summary / Timeline / Parcels / Entities / Evidence / Actions)
- **Briefs** — AI-generated project briefs with structured outputs

## Tech stack

| Layer | Technology |
|-------|------------|
| Monorepo | pnpm workspaces |
| DB | PostgreSQL 16 + PostGIS 3 (Prisma 6) |
| Auth | Clerk v7 |
| AI | OpenAI GPT-4o |
| Web | Next.js 15 + Tailwind CSS v4 + shadcn/ui |
| Map | MapLibre GL JS |
| Scheduler | croner |

## Quick start

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions.

## Architecture

See [AGENTS.md](./AGENTS.md) for a monorepo layout overview and conventions for AI coding assistants.

## License

Private — all rights reserved.
