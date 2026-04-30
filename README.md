# Gulf Coast Industrial Radar

> Real-time intelligence platform for Gulf Coast industrial project activity.

## Architecture

```
gulf-coast-industrial-radar/
├── apps/
│   ├── web/          # Next.js 15 dashboard
│   └── worker/       # Cron job scheduler (node-cron)
├── packages/
│   ├── adapters/     # Data source scrapers (14 sources)
│   ├── agents/       # AI agent clients (OpenAI, Perplexity)
│   ├── db/           # Prisma schema + migrations
│   └── scoring/      # Signal scoring + QLAD detector
└── packages/adapters/src/research/  # Source schema artifacts
```

## Phases

| Phase | Description | Status |
|---|---|---|
| 1 | Core adapters + DB schema | ✓ Done |
| 2 | QLAD detector + scoring | ✓ Done |
| 3 | Perplexity validation + live alerting | ✓ Done |

## Phase 3 Highlights

- **Perplexity Agent API** (`packages/agents/src/perplexity-client.ts`): structured, text, and deepResearch helpers with 7-day DB cache and daily budget cap.
- **AssemblyValidator** (`packages/agents/src/assembly-validator.ts`): 2-step Perplexity pass for QLAD alerts — public coverage check + entity research.
- **QLAD live worker** (`apps/worker/src/jobs/qlad-evaluate.ts`): clusters LAND_CONTROL signals every 20 minutes, fires alerts.
- **14 source research artifacts** (`packages/adapters/src/research/`): documents the current API/HTML schema of every Gulf Coast source.
- **UI surfacing**: SummaryTab and EvidenceTab now show `publicCoverageFound` banner and supplementary evidence.

## Setup

```bash
cp .env.example .env
# Fill in DATABASE_URL, OPENAI_API_KEY, PERPLEXITY_API_KEY
pnpm install
pnpm db:migrate
pnpm dev
```

## Research Sources

To regenerate source schema research artifacts:

```bash
pnpm research-sources
# or for specific sources:
npx ts-node packages/agents/scripts/research-sources.ts --sources led-fastlane,la-sos
```

See [`packages/adapters/src/research/`](packages/adapters/src/research/) for current artifacts.
