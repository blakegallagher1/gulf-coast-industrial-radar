# Gulf Coast Industrial Radar

Detect Gulf Coast industrial demand and site-control formation early enough to
buy, option, entitle, sell, or avoid land before the market prices it in.

> **First-pass buyer:** real estate investors and developers, not contractors.
> **First-pass data:** free / public sources only.

The radar pulls from parish assessors, LED, LDEQ, USACE, LPSC, FERC, SAM.gov,
EMMA, SEC EDGAR, USGS / BTS / EIA infrastructure, and state SOS records.
Every alert links back to a preserved source document with observed date and
confidence label.

## Repository

```
gulf-coast-industrial-radar/
├── apps/
│   ├── web/                 Next.js 16 (App Router, Tailwind, Clerk, MapLibre)
│   └── worker/              Cron-driven ingestion + scoring loop
├── packages/
│   ├── db/                  Prisma 6 + PostGIS schema (16 models)
│   ├── shared/              Signal taxonomy, geography, constants
│   ├── adapters/            Free-source ingestion (LED, LDEQ, USACE, …)
│   ├── agents/              9 AI agents (SourceWatcher → BriefWriter)
│   └── scoring/             Project formation + Quiet Land Assembly engines
├── knowledge/               Markdown PRD / spec (single source of truth)
└── docker-compose.yml       Postgres + PostGIS + Mailhog (dev)
```

## Quick start

```bash
# 1) install dependencies
pnpm install

# 2) start local stack (Postgres + PostGIS + Mailhog)
docker compose up -d

# 3) configure secrets
cp .env.example .env.local      # then fill DATABASE_URL, CLERK_*, OPENAI_API_KEY

# 4) database
pnpm db:generate
pnpm db:push
pnpm db:seed                    # 11 backtest projects, 17 sources

# 5) run
pnpm dev                        # web + worker in parallel
# or just one:
pnpm dev:web
pnpm dev:worker
```

App: <http://localhost:3000>
Mailhog: <http://localhost:8025>

## What ships in v0

| Surface             | Status |
|---------------------|--------|
| Map-first radar UI  | ✅ live data via `/api/projects` + drawer tabs |
| Six-tab alert drawer (Summary, Timeline, Parcels, Entities, Evidence, Actions) | ✅ |
| Weekly investor brief | ✅ list + detail; `BriefWriter` agent generator |
| Signal taxonomy / source registry references | ✅ |
| Watchlists scaffold | ✅ list view; create flow ships next |
| Adapters (12 sources) | ✅ real fetch logic for LED, LDEQ, USACE, LPSC, LA SOS, Ascension/EBR/Calcasieu parcels, SEC EDGAR, SAM.gov, EMMA, TCEQ |
| 9 agents | ✅ stubs + structured output schemas; OpenAI runtime ready |
| Scoring | ✅ project formation + Quiet Land Assembly Detector + site-fit |
| Auth | ✅ Clerk v7 |
| Cron loop | ✅ `WORKER_CRON_ENABLED=true` to enable |

## Phase 3: Perplexity validation + QLAD live alerting

| Capability | Status |
|---|---|
| Perplexity Agent API runtime client (`packages/agents/src/perplexity-client.ts`) | ✅ structured + text + deepResearch helpers; 7-day DB cache; daily budget cap |
| Schema additions (`Alert.supplementaryEvidence`, `publicCoverageFound`, `validationCostUsd`, `PerplexityCache`) | ✅ migration `0030_phase3_perplexity` |
| Dev-time `SourceSchemaResearcher` + 14 research artifacts | ✅ `pnpm research:sources` regenerates |
| Adapter URL/path corrections from research (Ascension domain, LED FastLane NextGen, LA SOS path, SEC rate-limit) | ✅ |
| `AssemblyValidator` — 2-step Perplexity pass (public-check + entity research) | ✅ `validateAssembly()` |
| `qlad-evaluate` worker job — clusters new LAND_CONTROL signals, runs detector, writes Alerts | ✅ wired in `apps/worker/src/index.ts` (every 20m) |
| Drawer surfacing — `publicCoverageFound` banner + "Supplementary evidence (Perplexity)" subsection | ✅ `SummaryTab.tsx` + `EvidenceTab.tsx` |
| Sources page · research-artifact links | ✅ |
| Tests — Vitest fixtures for QLAD + AssemblyValidator | ✅ `pnpm --filter @gcir/scoring test` and `pnpm --filter @gcir/agents test` |
| Feature flags | `FEATURE_QLAD_LIVE_ALERTING`, `FEATURE_PERPLEXITY_VALIDATION` (both default off) |

### How to enable in production

1. Set `PERPLEXITY_API_KEY` (generate at <https://www.perplexity.ai/settings/api>).
   The same key works for `/v1/agent`, `/chat/completions`, and `/search`.
   (Note: Perplexity has no `/me` endpoint — Composio's `current_user_info`
   401 is meaningless; the actual API authenticates fine.)
2. `FEATURE_QLAD_LIVE_ALERTING=true` and `FEATURE_PERPLEXITY_VALIDATION=true`.
3. Confirm `WORKER_CRON_ENABLED=true`.
4. The worker's 20-minute QLAD tick clusters new LAND_CONTROL signals, runs
   the detector, and (when triggered) calls Perplexity to validate.
5. Daily budget defaults to $25 (`PERPLEXITY_DAILY_BUDGET_USD`); per-trigger
   $0.50 cap (`PERPLEXITY_PER_TRIGGER_BUDGET_USD`).

### Perplexity preset routing

Runtime calls use Perplexity Agent API **presets** (verified against
`docs.perplexity.ai` 2026-04-30):

| `modelKey` | Preset | Underlying model | Steps | Tools | Use |
|---|---|---|---|---|---|
| `fast` | `fast-search` | xai/grok-4-1-fast-non-reasoning | 1 | web_search | Cheap retrieval |
| `reason` (default) | `pro-search` | openai/gpt-5.1 | 3 | web_search + fetch_url | AssemblyValidator both steps |
| `deep` | `deep-research` | openai/gpt-5.2 | 10 | web_search + fetch_url | Dev-time source schema research |
| `frontier` | `advanced-deep-research` | anthropic/claude-opus-4-6 | 10 | web_search + fetch_url | Edge cases |

Cost is reported per-response in `usage.cost.total_cost`; we record it on the
`AgentRun` row. The 14-source dev-time research run cost $0.47 total.

## What's next

Per `knowledge/implementation/mvp-build-plan.md`:

1. **Phase 0 → 1:** verify backtest fidelity for the 10 reference projects
   (Hyundai Steel, Woodside, Meta/Entergy, LIT, Lake Charles LNG, hydrogen/ammonia,
   Rio Grande LNG, AM/NS Calvert, MISO South backbone, Port of South Louisiana).
2. **Phase 2:** entity-resolution improvements (cross-corridor agent matches).
3. **Phase 3:** Quiet Land Assembly Detector live alerts on new ingestion.
4. **Phase 4:** map-first UI polish + watchlist creation flow + bulk owner skip-trace.
5. **Phase 5:** weekly brief delivery (Resend/Postmark) + analyst review workflow.
6. **Phase 6:** contractor expansion (deferred until investor radar works).

## Provenance promise

Every claim in the radar links back to its raw source document. Each ingestion
run preserves the source URL, observed date, response snapshot, extraction
confidence, and an evidence excerpt. Source license and robots/terms review
status is tracked per source in `Source.termsReview`. No paid aggregators, no
proprietary databases, no scraping that violates terms.

## License

Private. Gallagher PropCo, 2026.
