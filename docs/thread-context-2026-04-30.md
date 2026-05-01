# Thread Context — Gulf Coast Industrial Radar
*Exported from Hyperagent working memory · 2026-04-30*

---

## Key Entities

**Gulf Coast Industrial Radar** — AI-agent platform that detects industrial project formation before public bid day or broad market awareness via free/public data only. Buyer: real estate investors and developers.

**Geography:** Louisiana parishes (Ascension, St. James, Iberville, St. John, St. Charles, Plaquemines, St. Bernard, EBR, Calcasieu/Cameron). Plus Houston Ship Channel/Beaumont-Port Arthur, Mobile/Baldwin, Pascagoula/Gulfport. Wedge: LA river corridor + Lake Charles.

**Hero feature:** Quiet Land Assembly Detector. Trigger: same/related buyer entities controlling 200+ acres within 24 months, contiguous or 0.5–2 mi, near 2+ industrial-enabling assets (rail/port/interstate/transmission/substation/pipeline/water/zoning), buyer is opaque, no public announcement explains it.

**Core IA:** Map-first radar | Alert list/feed | Alert detail (Summary/Map/Timeline/Entities/Infrastructure/Evidence/Actions) | Weekly investor brief | Watchlists | Source registry | Backtest dashboard.

**Signal taxonomy (10 types):** Land control, Entity formation, Environmental permits, Incentives (ITEP/JETI), Utility/power, Port/terminal, Public-company filings (SEC), Local agendas, Financing (EMMA/bonds), Procurement (SAM/USAspending).

**Stage labels:** watch → site-control → entity-formed → incentive-surfaced → permit-surfaced → wetlands-waterway-surfaced → utility-surfaced → port-agenda-surfaced → financing-surfaced → public-announced → FID → EPC → construction.

**Score 0-100:** 90-100 active formation; 75-89 strong site-control; 60-74 watchlist; 40-59 weak/early; <40 noise.

**Agents (9):** SourceWatcher, EvidenceArchive, DocumentExtraction, EntityResolution, SiteScoring, ProjectFormationScoring, InvestorAction, BriefWriter, AnalystReview.

**Stack from spec:** Postgres + PostGIS, object storage for evidence, queue-based extraction, structured-JSON LLM extraction, MapLibre frontend, email alerts.

---

## Decisions

**Phase 2 scaffold decisions (Apr 30, confirmed by Blake):**

1. **Repo strategy:** Standalone — Next.js scaffold commits directly to `gulf-coast-industrial-radar` repo (currently markdown-only).
2. **Stack:** Full Roux pattern — Next.js 16 App Router + Tailwind + Prisma + PostGIS + Clerk v7 + OpenAI agent runtime. Match gpc-cres conventions (proxy.ts middleware naming, monorepo with apps/web + apps/worker + packages/{db,agents,adapters,scoring,shared}).
3. **Next step after scaffold:** Keep building here — implement real ingestion adapters (LED, LDEQ, USACE, parcel, SOS, SEC) and seed backtest data (Hyundai Steel Donaldsonville, Woodside Louisiana LNG, Meta/Entergy Richland data center, Louisiana International Terminal, Lake Charles LNG/petrochem expansions, hydrogen/ammonia projects, Mobile/Pascagoula port/industrial, transmission/generation, port terminal/dredging).

---

## Notes

### Perplexity API status (2026-04-30 — verified)

The "401 on /me" was a complete red herring. Perplexity's public API exposes only `/v1/agent`, `/chat/completions`, `/search`, `/embeddings`, and a few async/auth-token endpoints — there is **NO** `/me` or user-info endpoint. Composio's `current_user_info: {error: invalid_api_key}` block is meaningless because there's nothing to validate against. The same key authenticates fine for both `/v1/agent` and `/chat/completions`.

Live verification (2026-04-30):
- `PERPLEXITYAI_EXECUTE_AGENT preset=pro-search` → 200 OK, `usage.cost.total_cost: $0.00798`, returned correct Donaldsonville LA population (6,695) with citations from Wikipedia + Census Bureau.
- 14 source-research artifacts already generated successfully ($0.47 total).

### Real Phase 3 fixes shipped (commit `c8189c91`)

1. Switched from raw model ids (which don't exist on the Agent API) to documented presets: `fast-search`, `pro-search` (default), `deep-research`, `advanced-deep-research`.
2. Cost estimator reads `usage.cost.total_cost` from server response (Perplexity returns it on every call); falls back to a 16-model rate table sourced from `docs.perplexity.ai/docs/agent-api/models`.
3. AssemblyValidator's public-check + entity-research both default to pro-search (was fast-search) — better fit for a 3-step web-grounded validation.
4. README + .env.example: removed misleading "refresh the key" instruction; added preset-routing table; replaced `PERPLEXITY_MODEL_DEFAULT` with `PERPLEXITY_DEFAULT_PRESET`.

**Operational status:** Set `PERPLEXITY_API_KEY` in `.env.local` (the existing key works fine), `FEATURE_PERPLEXITY_VALIDATION=true`, `FEATURE_QLAD_LIVE_ALERTING=true`, `WORKER_CRON_ENABLED=true`. The QLAD detector → AssemblyValidator → Alert pipeline is ready.

---

### 2026-04-30 21:05 UTC — seed.ts restoration complete

Phase 3.1.1 finally landed. The corrupted seed.ts (1,971 bytes of mojibake from a prior failed sub-agent push) was replaced via 7 sequential commits, splitting the original 33,371-byte monolith into a `seed-data/` directory + slim entry:

| File | Size | Commit |
|---|---|---|
| `seed.ts` | 7,477 B | `eca20963` |
| `seed-data/types.ts` | 1,002 B | `deaf059a` |
| `seed-data/index.ts` | 948 B | `1aae6c8f` |
| `seed-data/sources.ts` | 6,815 B | `108d8443` |
| `seed-data/projects-aurora.ts` | 4,913 B | `2aa7a1dc` |
| `seed-data/projects-validation-1.ts` | 6,548 B | `ce880282` |
| `seed-data/projects-validation-2.ts` | 7,831 B | `375e8145` |

**Why split:** A single ExecuteIntegration tool call truncates around the 30-40 KB mark (the 44 KB inlined base64 attempt failed mid-parameter). Splitting into 5-10 KB modules side-steps the limit and makes individual fixtures cheaper to amend.

**Live-probe corrections preserved in sources.ts:**
- ebr-gis → `https://maps.brla.gov/.../Cadastral/Tax_Parcel/MapServer/0`
- calcasieu → `https://lak-dc-arcgis.cppj.net/.../HubLayers/Parcels/FeatureServer/0`
- ldeq-edms → `SourceStatus.TODO` (auth-gated)
- emma-msrb → `SourceStatus.TODO` (no public RSS, paid only)

---

### 2026-04-30 22:20 UTC — remote/local drift discovered during Phase 3.2

Mid-execution of the agent migration, GET on remote files revealed substantial unpushed local work from the prior 3.1.1 effort. Sizes (remote → local):

| File | Remote | Local | Status |
|---|---|---|---|
| openai-client.ts | 363 B | 4 KB | stub on remote, full impl local |
| document-extraction.ts | 2.2 KB | 4.3 KB | different API — local uses `extractClaims` |
| entity-resolution.ts | 1.4 KB | 4.7 KB | local has `runEntityResolution` API |
| investor-action.ts | 1.7 KB | 4.0 KB | local has `recommendActions(projectId)` |
| analyst-review.ts | 1.8 KB | 2.4 KB | small drift |
| brief-writer.ts | 1.8 KB | 3.5 KB | local has full `writeWeeklyBrief()` |
| index.ts (agents) | 226 B | 490 B | local exports the 9 agents the worker imports |
| apps/worker/src/index.ts | 684 B | 5.2 KB | remote has just qlad on node-cron, local has 8 jobs on croner |

Phase 3.2 absorbed the sync: **same end-state, more files to push.**

---

## Phase 3.3 Entry-State Audit (2026-05-01)

**Already in main (the foundation is solid):**
- Alert model: `publishedAt`, `silencedAt`, `publicCoverageFound`, `validationCostUsd`, `supplementaryEvidence`, `watchlistId` FK, indexed by `(publicCoverageFound, createdAt)`
- `AlertChannel` enum: IN_APP (default) | EMAIL | SLACK | WEBHOOK
- `tickQlad` (every 20m, gated on `FEATURE_QLAD_LIVE_ALERTING`) — clusters LAND_CONTROL signals, writes Alert with `publishedAt=now` (or silences when AssemblyValidator finds public coverage), triggers RecommendedActions on first publish
- AssemblyValidator (2-step Perplexity, `FEATURE_PERPLEXITY_VALIDATION`-gated)
- Watchlist model with `filter: Json` and `alerts: Alert[]` relation — already the user-subscription primitive (no separate AlertSubscription needed)
- AnalystReview workflow (UNREVIEWED / VALID / FALSE_POSITIVE / DUPLICATE / MERGED / SPLIT / WATCH / DISMISSED)
- Resend transport proven via budget-report.ts (commit `dd17c36f`)

**Phase 3.3 gap (what makes FEATURE_PROACTIVE_ALERTS meaningful):**
- `FEATURE_PROACTIVE_ALERTS` is referenced nowhere in code — only in .env.example. Pure intent today.
- No `/alerts` web route
- No alert-digest cron job
- No Watchlist→Alert match-and-link pass — QLAD writes Alerts but never connects them to subscriber watchlists
- No alert email rendering / sending pipeline
- No unsubscribe flow
- Only QLAD writes alerts today — no stage-transition or score-crossing triggers
- BriefWriter writes Brief rows but doesn't email them either (`FEATURE_BRIEF_GENERATE=true` is a misnomer today)

**Phase 3.3 staged plan:**
1. Stage A: Watchlist→Alert routing wire + `notifyChannel`/`notifyCadence` fields + `User.timezone`
2. Stage B: Broaden trigger surface (stage transitions, score crossings, source health)
3. Stage C: `alert-digest.ts` cron + email transport (Resend) + one-click unsub (`/u/[token]`)
4. Stage D: `/alerts` in-app page + `/admin/alerts` ops view
5. Stage E: Backtest validator precision ≥ 80% → soft launch to `blake@gallagherpropco.com` → flip `FEATURE_PROACTIVE_ALERTS=true`

**Ship-ready criteria for FEATURE_PROACTIVE_ALERTS=true:**
1. Idempotent delivery (`Alert.deliveredAt` as source of truth; cron restart-safe)
2. Validator precision ≥ 80% on seed backtest
3. Failure mode is durable (Resend down → alerts queue, not lost)
4. Cap-aware (validation costs roll into `PERPLEXITY_DAILY_BUDGET_USD`)
5. Unsubscribe in ≤ 2 clicks, no auth required
6. Kill switch fast (`FEATURE_PROACTIVE_ALERTS=false` stops outbound within one tick)
7. Default subscription is sane (Blake gets a sensible Watchlist out of the box)
8. End-to-end Vitest covering the full deliver-and-unsub path

---

## Sync audit (2026-05-01)

Full local-vs-remote audit run before the 102-file bulk push:
- 182 local files, 185 remote files
- 80 files identical
- 102 files differ (local larger in nearly all cases — unpushed local work)
- 0 files only-local (all have remote stubs)
- 3 files only-remote: `gulf-coast-industrial-radar-research-prd.md`, `ideabrowser-full-research-gulf-coast-industrial-radar.md`, `log.md`

All 102 differing files pushed to main in 10 batched commits on 2026-05-01.
