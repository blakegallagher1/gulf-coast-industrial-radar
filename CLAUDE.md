# Gulf Coast Industrial Radar

Detect Gulf Coast industrial project formation before the market prices it in, so real estate investors can buy, option, entitle, or avoid land early.

> Read `knowledge/INDEX.md` first — that directory is the source of truth for product decisions, not the code.

## Tech stack

- **Language:** TypeScript, strict mode with `noUncheckedIndexedAccess: true`
- **Runtime:** Node ≥ 20.10
- **Package manager:** pnpm 9 (workspaces monorepo)
- **Web:** Next.js 16 App Router · Tailwind · Clerk v7 · MapLibre
- **Worker:** cron-driven ingestion + scoring loop (`apps/worker`)
- **DB:** Prisma 6 + PostGIS (16 models). Local: Docker Postgres. Prod: Supabase project `imgobphnhwkpilbmxdny`
- **AI:** OpenAI (default `gpt-5.4`) + Perplexity Agent API with preset routing (fast-search / pro-search / deep-research / advanced-deep-research)
- **Auth:** Clerk v7 · **Email:** Resend · **Payments:** Stripe ($10/mo subs) · **Deploy:** Vercel

## Layout

```
apps/           Next.js web + cron worker
packages/       db · shared · adapters · agents · scoring
knowledge/      Markdown PRD / spec — source of truth
docker-compose.yml   Postgres + PostGIS + Mailhog (dev)
```

## Key commands

```bash
pnpm install
docker compose up -d                          # Postgres + PostGIS + Mailhog (UI: localhost:8025)
cp .env.example .env.local                    # then fill secrets
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev                                      # web + worker in parallel
pnpm dev:web | pnpm dev:worker                # individual apps
pnpm build && pnpm lint && pnpm typecheck
pnpm --filter @gcir/scoring test              # Vitest
pnpm --filter @gcir/agents test
pnpm research:sources                         # regen 14 source-schema research artifacts
pnpm studio                                   # Prisma Studio
```

## Required env vars

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres + PostGIS (Docker locally, Supabase in prod) |
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth |
| `OPENAI_API_KEY`, `AGENT_MODEL_ID` | Agent runtime |
| `PERPLEXITY_API_KEY` | AssemblyValidator + dev-time source research |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, `MAPTILER_KEY` | Map tiles |
| `RESEND_API_KEY` | Weekly briefs + budget alerts |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | Subscriptions |
| `SAM_GOV_API_KEY` | Optional — SAM.gov adapter |
| `EVIDENCE_ACCESS_KEY`, `EVIDENCE_SECRET_KEY` | S3-compatible raw-evidence object storage |
| `SENTRY_DSN` | Optional observability |
| `GCIR_EMAIL_ALLOWLIST` | Login allowlist; defaults to `blake@gallagherpropco.com` |

Feature flags (all off by default in prod): `FEATURE_QLAD_LIVE_ALERTING`, `FEATURE_PERPLEXITY_VALIDATION`, `WORKER_CRON_ENABLED`.

## Existing docs

- `README.md` — architecture, quickstart, phase status, provenance promise
- `AGENTS.md` — agent/contributor read order and code conventions
- `CONTRIBUTING.md`
- `knowledge/INDEX.md` → `strategy/`, `product/`, `sources/`, `implementation/`, `validation/`

## Conventions and gotchas (verified)

1. **No bare `fetch()` against external sources.** All adapters must go through `fetchWithRetry` in `packages/adapters/src/utils/`. Transient failures must not abort full ingestion runs.
2. **Every claim-bearing object requires provenance:** `sourceId`, `rawDocumentId`, `observedAt`, `documentDate`, `confidence`, and a verbatim `evidenceSpan` from `DocumentExtraction`.
3. **`knowledge/` is canonical** for product decisions. Read it before making architectural choices.
4. **Signal predicates follow `family.subject.qualifier`** (e.g. `permit.air.NOI`, `incentive.itep.eligible`). New ones must be documented in `packages/agents/src/document-extraction.ts`.
5. **High-impact conclusions require `AnalystReview`** before external distribution — sponsor identity, acquisition strategy, legal/environmental/entitlement risk.
6. **QLAD live alerting:** enable `FEATURE_QLAD_LIVE_ALERTING` together with `FEATURE_PERPLEXITY_VALIDATION` and `WORKER_CRON_ENABLED=true`.
7. **Perplexity budget caps:** $50/day (`PERPLEXITY_DAILY_BUDGET_USD`), $0.50/trigger. `/admin/runs` shows a red banner when spend exceeds 75% of daily cap.
8. **Per-agent OpenAI fallback:** `AGENT_BACKEND_<NAME>=openai` rolls a specific agent off Perplexity without redeploying.
9. **Three ArcGIS base URLs verified** for parish assessors (env-controlled): Ascension, EBR (`maps.brla.gov`), Calcasieu (`lak-dc-arcgis.cppj.net` — `gis.calcasieuassessor.org` is offline).
10. **Don't auto-publish briefs** — Resend delivery is gated on `AnalystReview` for any signal that names a sponsor or assembles parcels.

## Routing for Claude

For deep CRE/underwriting analysis on detected signals → invoke the `cre-underwriter` subagent. For database/Prisma migrations on the Postgres+PostGIS stack → `supabase-dba` (after confirming the project is using Supabase, not local Docker). For pre-merge review → `code-reviewer-strict`.
