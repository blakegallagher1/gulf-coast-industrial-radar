---
title: Completion Audit 2026-05-01
type: implementation
status: draft
last_updated: 2026-05-01
---

# Completion Audit 2026-05-01

## Objective restated as concrete deliverables

The current objective is not "add more AI." It is to prove and close the gaps
 required to make Gulf Coast Industrial Radar a high-trust, highly shareable,
 evidence-backed operating product for:

- real estate investors
- developers
- engineering and construction teams adjacent to large industrial projects

Within current constraints, success means:

1. The product works using the currently available AI and web-search providers,
   specifically OpenAI and Perplexity.
2. The MVP acceptance criteria from the PRD are either:
   - implemented and evidenced, or
   - explicitly marked partial/missing with a closure plan.
3. The core user loop is strong enough to spread inside deal teams:
   - inspect alert
   - trust evidence
   - take action
   - save/share watchlist
   - circulate weekly brief
4. The product does not rely on fake actionability, fake health signals, or
   placeholder collaboration surfaces.

## Prompt-to-artifact checklist

| Requirement | Evidence inspected | Status | Notes |
|---|---|---|---|
| Use only current AI and web-search credentials | `README.md`, `packages/agents/src/brief-writer.ts` | `verified-partial` | The repo explicitly uses OpenAI-ready agents and Perplexity runtime/presets. No new provider dependency was added in this audit pass. |
| First buyer remains investors/developers | `knowledge/strategy/product-thesis.md`, `knowledge/product/research-prd.md`, `README.md` | `verified` | All strategy docs align on investor/developer wedge first. |
| Engineering/construction should benefit | `apps/web/components/radar/tabs/ActionsTab.tsx` | `partial` | Audience labels now include engineering/construction where relevant, but there is no dedicated workflow or delivery surface yet. |
| Map-first evidence-backed radar exists | `README.md`, `apps/web/components/radar/Drawer.tsx`, `apps/web/components/radar/tabs/SummaryTab.tsx`, `apps/web/components/radar/tabs/EvidenceTab.tsx` | `verified` | Core radar drawer and evidence surfaces exist. |
| Quiet Land Assembly Detector is the highest-leverage feature | `knowledge/product/quiet-land-assembly-detector.md`, `README.md` | `verified` | Product docs and shipped-status docs agree. |
| Scheduled source ingestion exists | `apps/worker/src/index.ts` | `verified` | Worker schedules source-watch, evidence, extraction, scoring, QLAD, actions, brief, and budget report jobs. |
| At least 6 public-source lanes are ingested on a schedule | `README.md`, `apps/worker/src/index.ts`, `packages/db/src/seed-data/sources.ts` via `rg` | `verified-partial` | Source registry claims 17 sources and the worker schedules source-watch. This proves intent and breadth, but not live successful runtime execution. |
| At least 3 launch parishes/counties have parcel/GIS ingestion | `README.md`, `packages/db/src/seed-data/sources.ts` via `rg` | `verified-partial` | README claims Ascension, EBR, and Calcasieu parcel adapters. This is documented in repo fixtures, but live ingestion success is not proven in this audit. |
| Every signal links to raw source evidence | `README.md`, `packages/db/prisma/schema.prisma`, `apps/web/components/radar/tabs/EvidenceTab.tsx` | `verified-partial` | Data model and UI support provenance, but this audit did not inspect live records to prove every signal is populated correctly. |
| AI extraction returns structured claims with confidence and excerpts | `packages/db/prisma/schema.prisma`, `knowledge/implementation/agent-architecture.md` | `verified` | `ExtractedClaim` schema includes `confidence` and `evidenceSpan`; Document Extraction architecture requires verbatim evidence. |
| Project formation score is calculated and visible | `knowledge/sources/signal-taxonomy.md`, `apps/web/components/radar/Drawer.tsx`, `apps/web/components/radar/tabs/SummaryTab.tsx` | `verified` | Score and weighted contributors are visible in the drawer. |
| QLAD alerts are produced | `README.md`, `apps/worker/src/index.ts` | `verified-partial` | QLAD evaluate job is wired. This audit did not inspect live alert rows. |
| Map UI shows clusters, parcels, infrastructure, timeline, and actions | `README.md`, `apps/web/components/radar/Drawer.tsx` | `verified` | Tabs exist for summary, timeline, parcels, entities, evidence, and actions. |
| Analyst can dismiss/watch/escalate/merge/split alerts | `knowledge/implementation/agent-architecture.md`, `packages/db/prisma/schema.prisma` | `verified-partial` | Analyst states and workflow concepts exist in schema/docs, but this audit did not verify a live UI/control surface for all transitions. |
| Weekly investor brief can be generated from live alert state | `apps/worker/src/index.ts`, `packages/agents/src/brief-writer.ts`, `apps/web/app/(app)/briefs/page.tsx`, `apps/web/app/(app)/briefs/[id]/page.tsx` | `verified-partial` | Brief generation exists and UI exists. It is still more of a draft/read surface than a full circulation workflow. |
| Backtest report across at least 5 known projects | `knowledge/validation/validation-plan.md`, `packages/db/src/seed-data/index.ts`, `packages/db/src/seed-data/projects-validation-1.ts`, `packages/db/src/seed-data/projects-validation-2.ts` via `rg` | `verified-partial` | Repo contains 10 validation fixture projects plus Aurora, but this is not yet the same as a surfaced backtest report with lead-time evidence. |
| Product should avoid fake actionability | `apps/web/components/radar/tabs/ActionsTab.tsx`, `apps/web/app/(app)/briefs/[id]/page.tsx` | `improved-partial` | Dead-end action buttons and synthetic source-health percentages were removed/replaced in touched surfaces, but broader placeholder risk remains elsewhere. |
| Product should support internal sharing/virality loops | `apps/web/components/radar/Drawer.tsx`, `apps/web/components/radar/FilterRail.tsx`, `apps/web/app/api/watchlists/route.ts`, `apps/web/app/(app)/watchlists/[id]/page.tsx` | `improved-partial` | Drawer deep-linking, shared watchlist save flow, and watchlist criteria display now exist. Followed/notification loops still do not. |

## Changes completed during this goal run

### Closed or improved gaps

- Added a repo-local execution memo:
  - `knowledge/implementation/viral-gap-closure-plan.md`
- Improved weekly brief detail:
  - real radar links for top movers
  - removed fake source-health percentages
  - preserved compatibility with legacy brief fixtures
- Improved watchlist detail:
  - saved criteria are readable
  - shared path is explicit
- Improved drawer behavior:
  - deep-linkable tabs through `focus=...`
  - share links preserve active view
- Improved action workflow:
  - action generation on demand
  - audience labels for investor/developer/engineering/construction relevance
  - action CTAs jump into real drawer tabs
- Added shared watchlist save flow from live radar filters
- Unified `POST /api/watchlists` so both single-project and filter-based watchlist creation work

## Missing or weakly verified requirements

### Still missing product capability

1. Dedicated engineering/construction workflow
   - The product now acknowledges those audiences in actions, but still behaves
     mainly like an investor/developer radar.
2. Notification/follow loop
   - Watchlists can be created and shared, but there is no delivery loop tied to
     them yet.
3. Strong analyst operations surface
   - Schema and concepts exist, but a full review/merge/split/escalate surface
     was not verified in this audit.
4. Surfaced backtest proof
   - Validation fixtures exist, but the product does not yet present a verified
     lead-time scoreboard as proof content.

### Still unverified against runtime or DB

1. Live source success rates
2. Live parcel/parish coverage quality
3. Live QLAD alert quality
4. Live provenance completeness across all signals
5. Live brief usefulness with production-like data

### Runtime verification blocker observed in this audit

An attempted Prisma runtime check against the real DB layer failed with:

- host: `192.168.1.164`
- port: `54323`
- error: `Can't reach database server at 192.168.1.164:54323`

That means the remaining runtime-verification items above are currently blocked
by database reachability in this environment, not by lack of a query path.

## Supabase runtime evidence captured after local DB failure

The Supabase project `gulf-coast-industrial-radar` (`imgobphnhwkpilbmxdny`) was
reachable and materially changed the audit picture.

### Verified live counts from Supabase

- `Source`: 17
- `SourceRun`: 29
- `RawDocument`: 12,488
- `Signal`: 13,782
- `Brief`: 2
- `AgentRun`: 2
- `Project`: 0
- `Site`: 0
- `Parcel`: 0
- `Entity`: 0
- `Alert`: 0
- `RecommendedAction`: 0
- `Watchlist`: 0
- `WatchlistItem`: 0
- `BriefRecipient`: 0
- `ExtractedClaim`: 0

### Interpretation

This is the most important live finding in the audit:

- ingestion is running
- evidence is being archived
- signals are being written
- but the downstream product graph is not materializing

That means the current live Supabase project does **not** yet support the
claimed core user loop end to end:

1. detect project/site formation
2. create project/site entities
3. generate alerts
4. generate recommended actions
5. accumulate watchlists and delivery state

In other words, the product currently has live source/evidence momentum but not
live investor-ready object formation.

### Latest deploy checkpoint

After wiring:

- a cron-callable QLAD web route
- Vercel cron schedules
- a package-boundary-safe QLAD import path
- a likely-correct `apps/web/vercel.json` for the live root

the linked Vercel deployment `dpl_GdsHz3QLRAnJd1eQF6JDN9xwzkch` was still in
`BUILDING` state at the end of this audit pass.

At that same checkpoint, the live Supabase counts remained:

- `Project`: 0
- `Alert`: 0
- `RecommendedAction`: 0
- `Watchlist`: 0
- `BriefRecipient`: 0

That means the end-to-end materialization gap remains open until the new
deployment resolves and a follow-up DB audit confirms downstream object
creation.

### Authenticated deployed QLAD invocation result

An authenticated `POST` to the deployed preview route
`/api/cron/qlad` completed successfully and returned:

- `signalsConsidered`: 0
- `clustersBuilt`: 0
- `clustersTriggered`: 0
- `alertsCreated`: 0
- `alertsSilenced`: 0
- `totalValidationUsd`: 0

A follow-up Supabase audit immediately after that invocation still showed:

- `Project`: 0
- `Alert`: 0
- `RecommendedAction`: 0
- `Watchlist`: 0
- `BriefRecipient`: 0

This proves the route exists and is callable in the deployed runtime, but the
live materialization problem is still unresolved. The remaining likely causes
are now narrowed to:

1. deployed feature flags keep QLAD effectively disabled, or
2. the deployed runtime is pointed at a DB/state where no qualifying recent
   `LAND_CONTROL` signals are visible to the job.

### Final deployed-runtime blocker observed

After correcting the preview branch envs to point at the Supabase project and
explicitly enabling:

- `FEATURE_QLAD_LIVE_ALERTING=true`
- `FEATURE_PERPLEXITY_VALIDATION=true`

an authenticated deployed `POST /api/cron/qlad` failed with a runtime Prisma
connection error:

- `Can't reach database server at db.imgobphnhwkpilbmxdny.supabase.co:5432`

At the same checkpoint, Supabase still showed:

- `Project`: 0
- `Alert`: 0
- `RecommendedAction`: 0

This is the final blocker in the current audit. The remaining gap is no longer
product logic or deployment wiring; it is deployed-runtime database reachability
from Vercel to the chosen Supabase connection target.

### Latest local+Supabase recovery checkpoint

After:

- aligning local web and worker processes to the intended env source
- widening the QLAD scan window from 5,000 to 15,000 recent `LAND_CONTROL` rows
- re-running the local `/api/cron/qlad` path

the live target Supabase project finally materialized downstream objects:

- `Project`: 3
- `Alert`: 3
- `RecommendedAction`: 21

Latest created rows:

- `PRJ-QLAD-3d8be818` — `Quiet Assembly · Calcasieu`
- `PRJ-QLAD-065dcb20` — `Quiet Assembly · Calcasieu`
- `PRJ-QLAD-4aa217cf` — `Quiet Assembly · Calcasieu`

Latest alerts:

- `Quiet Land Assembly · 333 ac · Calcasieu`
- `Quiet Land Assembly · 254 ac · Calcasieu`
- `Quiet Land Assembly · 231 ac · Calcasieu`

This materially changes the completion audit: the end-to-end pipeline from
signal ingestion to investor-facing formation objects is now proven to work
against the current live data target.

### Latest adoption + delivery checkpoint

After adding the alert-stream watchlist CTA and then verifying it through the
local app against the target Supabase DB:

- `Watchlist`: 2
- `BriefRecipient`: 1

Verified live records:

- Watchlists:
  - `cmono7nfj002xu7e9tkdnsalc` — `Quiet Assembly · Calcasieu watchlist`
  - `cmono7f5l002tu7e9k077l0ag` — `Quiet Assembly · Calcasieu watchlist`
- Brief recipient:
  - `ops+brief-test@example.com` on issue `2`

The first live watchlist verification exposed a duplication defect: repeated
`Save watchlist` clicks created another identical watchlist for the same user
and project. That was then fixed in `POST /api/watchlists` by reusing the
existing matching single-project watchlist instead of always inserting a new
row. A follow-up runtime check returned the existing watchlist and the live
Supabase watchlist count remained at `2`, confirming the duplicate path is now
closed.

This is the first audit checkpoint where the target DB proves not just
formation objects, but also a recurring operator workflow:

1. detect formation
2. create alert/project/action objects
3. save alert into a shared watchlist
4. publish a brief with queued recipients

### Latest proof-surface checkpoint

The trust gap on `/proof` was narrowed by separating two different evidence
classes:

1. seeded backtest fixtures for historical lead-time proof
2. live DB rows for current operating proof

The `/proof` surface now shows a validation backtest scoreboard built from the
seeded public-project fixtures rather than incorrectly relying on the current
live DB project table for historical proof. Verified live page output now
shows:

- `10` seeded validation projects with public announcement dates
- average lead time: `283d`
- longest lead: `730d`
- explicit rows such as:
  - `Hyundai Steel Donaldsonville` — `141 days`
  - `Woodside Louisiana LNG` — `340 days`
  - `Meta Richland Data Center` — `230 days`

This changed the first checklist item on `/proof` from a gap caused by the
wrong data source to a met criterion backed by actual seeded validation data.

### Latest breadth checkpoint

The live target DB is still narrow in true downstream project materialization:

- `Project`: 3
- `Alert`: 3
- all current live formation objects are Calcasieu quiet-assembly cases

But the live signal mix is broader than the original alert stream exposed. A
live query against the target DB showed:

- `LAND_CONTROL`: 12,874
- `ENVIRONMENTAL_PERMIT`: 885
- `PUBLIC_COMPANY`: 23

The alert stream now surfaces this broader live state through an explicit
`Emerging permit and company candidates` section built from the live
`ENVIRONMENTAL_PERMIT` and `PUBLIC_COMPANY` signal families. Verified live
examples on `/alerts` include:

- `Formosa Plastics Corporation, Texas` — `Pe3 Plant · permit 4166`
- `ET Gathering & Processing LLC` — `Benedum Gas Plant · permit 946`
- `Exxon Mobil Corporation` — `Baytown Refinery · permit 1229`

This does not solve the deeper materialization-breadth problem, but it does
close an important product gap: the app no longer hides non-QLAD live signal
breadth behind a stream that only showed the three current project alerts.

### Latest candidate-promotion checkpoint

The app now has a real workflow that promotes weaker live candidates into
tracked project objects instead of leaving them as observational cards only.

Verified end-to-end through the running local app against the target Supabase
project:

- promoted candidate:
  - `Formosa Plastics Corporation, Texas`
  - summary: `Pe3 Plant · permit 4166`
- returned project id:
  - `cmonoxphg0032u7e9tafh7ly7`
- matched signals attached:
  - `12`
- generated recommended actions:
  - `7`

Verified resulting tracked project row:

- `PRJ-CAND-49087569`
- name: `Formosa Plastics Corporation, Texas`
- stage: `PERMIT_SURFACED`
- score: `32`

Verified target DB counts after promotion:

- `Project`: 4
- `RecommendedAction`: 28

This materially changes the breadth story. The product is no longer limited to
QLAD-only downstream object creation; it now has a live path that turns
permit/company candidates into tracked project objects with attached signals and
generated actions.

### Latest conversion-breadth checkpoint

The candidate-promotion path now has verified breadth across two different live
signal families:

1. `ENVIRONMENTAL_PERMIT`
   - `Formosa Plastics Corporation, Texas`
   - created tracked project `PRJ-CAND-49087569`
   - stage `PERMIT_SURFACED`
   - `12` linked signals
   - `7` generated actions
   - `1` linked alert after promotion-route self-heal

2. `PUBLIC_COMPANY`
   - `Cheniere Energy`
   - created tracked project `PRJ-CAND-777D2E72`
   - stage `FINANCING_SURFACED`
   - `1` linked alert
   - `5` generated actions

Verified target DB counts after both promotions:

- `Project`: 5
- `Alert`: 5
- `RecommendedAction`: 33

This is the first checkpoint where the product has live downstream object
creation across:

- QLAD / quiet land assembly
- permit-surfaced candidate promotion
- public-company / financing-surfaced candidate promotion

That does not prove undeniable virality, but it does materially close the
earlier “single-family only” weakness in the live object graph and brings the
non-QLAD promoted projects into the same recurring alert loop as the original
QLAD objects.

### Latest batch-promotion checkpoint

The product now has a bounded operator action that promotes the top emerging
non-QLAD candidates in one pass instead of relying on one-by-one manual
promotion.

Verified through the running local app against the target Supabase project:

- `POST /api/candidates/promote-top`
- result:
  - `promotedCount: 3`
  - `ET Gathering & Processing LLC`
  - `DCP Operating Company, LP`
  - `Exxon Mobil Corporation`

Verified target DB counts after that batch:

- `Project`: 8
- `Alert`: 8
- `RecommendedAction`: 50

This is the strongest live-breadth checkpoint so far. The app is no longer
stuck at a handful of QLAD-only objects plus one-off manual promotions; it now
has a bounded, repeatable path to widen tracked-project coverage from the live
permit/company queue.

### Latest repeated-breadth checkpoint

Running the bounded batch-promotion path a second time against the live queue
still found additional promotable candidates:

- `The Dow Chemical Company`
- `Targa Pipeline Mid-Continent WestTex LLC`
- `Enterprise Products Operating LLC`

Verified target DB counts after this second bounded pass:

- `Project`: 11
- `Alert`: 11
- `RecommendedAction`: 68

This matters because it shows the product is no longer dependent on a tiny,
one-time set of promotable non-QLAD candidates. The live queue still contained
enough additional breadth for the same bounded action to keep widening the
tracked object graph in a repeatable way.

### Latest scheduled-breadth checkpoint

The bounded non-QLAD widening path is no longer only a manual operator action.

Implemented:

- shared candidate-selection helper
- cron-callable route:
  - `/api/cron/promote-candidates`
- Vercel schedule in `apps/web/vercel.json`:
  - `0 * * * *`

Verified by invoking the cron route through the running local app:

- promoted:
  - `Lower Colorado River Authority`
  - `Equistar Chemicals, LP`
  - `Microsoft Corporation`

Verified target DB counts after that run:

- `Project`: 17
- `Alert`: 17
- `RecommendedAction`: 104

This is the first checkpoint where non-QLAD breadth expansion is both:

1. repeatable
2. cron-callable

That still does not prove virality, but it does remove one of the largest
remaining implementation objections: broader live object growth no longer
depends entirely on an operator manually clicking candidate promotion.

### Latest usage-telemetry checkpoint

The product now has live server-side usage telemetry for core surfaces via the
new `UsageEvent` table and `/api/usage-events` write path.

Verified after applying the live DB migration, restarting the local app with the
new Prisma client, and opening core pages through the running app:

- `alerts` page views: `1`
- `proof` page views: `1`
- `brief` page views: `2`

The `/proof` surface now has the first real in-product usage snapshot instead
of relying only on object counts and qualitative assumptions about adoption.

### Latest telemetry + breadth checkpoint

After fixing the client-side telemetry race on the promote actions and clicking
the live `Promote top candidates` button from the main `/alerts` surface:

- `alerts:candidate_promote_batch` usage events: `1`

At the same checkpoint, the bounded breadth path widened the tracked graph
again. Verified target DB counts:

- `Project`: 21
- `Alert`: 21

This is the strongest combined state so far:

1. broader tracked-object graph
2. live usage evidence for the breadth-expansion action itself
3. the breadth-expansion action now lives on the main alerts workflow, not only
   in the proof/recovery surface

### Latest adoption-telemetry checkpoint

After exercising real adoption actions through the running app:

- saved a new watchlist from the alerts stream
- published the current brief with one more queued recipient

Verified target DB counts:

- `Watchlist`: 3
- `BriefRecipient`: 2

Verified usage-event counts:

- `alerts:watchlist_create`: 1
- `brief:brief_publish`: 1

This is the first checkpoint where the product has not only object growth and
page-view telemetry, but also live recorded evidence of the core spread actions
the user actually cares about:

1. save a watchlist
2. publish / queue a brief

## Decision

The project is materially stronger than it was at the start of this goal run,
but it is not complete and should not be described as unquestionably ready or
viral yet.

The strongest next move is no longer basic pipeline wiring. It is to harden and
prove the higher-level trust and adoption layers that still remain weak:

1. Backtest scoreboard surface
2. Source freshness / degradation proof surface
3. Deduplicated, intentional watchlist growth and recurring delivery behavior
4. More explicit engineering/construction action packs where the signal type
   justifies it

## Recommended next build order

1. Build a visible backtest/admin proof surface from the validation fixtures and
   live scoring model.
2. Add watchlist follow state and weekly-brief inclusion mechanics.
3. Add source-health drilldown from the brief or radar footer.
4. Expand action packaging for engineering/construction-specific workflows only
   where the evidence truly supports that audience.
