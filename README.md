# Gulf Coast Industrial Radar

Detect Gulf Coast industrial demand and site-control opportunities before they
become public knowledge.

## What It Does

GCIR is a **Quiet Land Assembly Detection (QLAD)** system that:

1. **Ingests** parcel, permit, port-authority, and broker-listing data for
   Gulf Coast industrial submarkets (Houston Ship Channel, Beaumont, Lake
   Charles, etc.).
2. **Detects** emerging land assemblies using spatial clustering and ownership
   graph analysis.
3. **Validates** each assembly with a two-step Perplexity Agent API pass
   (structured field verification + freeform enrichment research).
4. **Surfaces** opportunities through a Next.js dashboard with map overlays,
   confidence scores, and historical trends.

## Architecture

```
gulf-coast-industrial-radar/
├── apps/
│   └── web/                  Next.js 15 app (dashboard + API routes)
├── packages/
│   ├── agents/               AI agent layer
│   │   ├── src/
│   │   │   ├── perplexity-client.ts   Perplexity Agent API (presets, cache, budget)
│   │   │   ├── assembly-validator.ts  2-step assembly validation agent
│   │   │   ├── source-schema-researcher.ts  Dev-time schema research utility
│   │   │   └── openai-client.ts       OpenAI structured-extraction helper
│   │   ├── scripts/
│   │   │   └── research-sources.ts   CLI orchestrator for schema research
│   │   └── test/
│   │       ├── assembly-validator.test.ts
│   │       └── qlad-pipeline.test.ts
│   └── db/                   Prisma schema + generated client
│       └── prisma/
│           └── schema.prisma
└── .env.example
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy env template
cp .env.example .env.local
# Edit .env.local with real credentials

# Start Postgres (Docker Compose)
docker compose up -d postgres

# Run DB migrations
pnpm --filter @gcir/db db:push

# Start dev server
pnpm dev
```

## Perplexity Integration

GCIR uses the **Perplexity Agent API** (POST `/v1/agent`) via three presets:

| Preset constant | Preset ID | Use case |
|---|---|---|
| `PPLX_PRESETS.structured` | `gcir-structured-extraction` | Validate assembly fields against public records |
| `PPLX_PRESETS.search` | `gcir-web-search` | Freeform enrichment research with live web search |
| `PPLX_PRESETS.deepResearch` | `gcir-deep-research` | Multi-step deep research (10 reasoning steps) |

Configure presets in the [Perplexity dashboard](https://www.perplexity.ai/settings/api/presets)
and set the corresponding env vars in `.env.local` (see `.env.example`).

### Budget Guard

Set `PERPLEXITY_DAILY_BUDGET_USD` to cap daily spend. The client checks
`AgentRun.costUsd` totals before every call and throws if the cap is reached.

### Cache Layer

Responses are cached in the `PerplexityCache` table (7-day TTL, keyed by
`sha256(preset + prompt)`). Target hit rate: >40% on AssemblyValidator calls.

## Running Tests

```bash
pnpm --filter @gcir/agents test
```

Tests mock `@gcir/db` and `perplexity-client`, so no real credentials are
needed.

## Environment Variables

See `.env.example` for the full list with descriptions. Key vars:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | Postgres connection string |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `PERPLEXITY_API_KEY` | Yes | — | Perplexity API key |
| `PERPLEXITY_DAILY_BUDGET_USD` | No | `5.00` | Daily spend cap (USD) |
| `PPLX_PRESET_STRUCTURED` | No | `gcir-structured-extraction` | Structured-extraction preset ID |
| `PPLX_PRESET_SEARCH` | No | `gcir-web-search` | Web-search preset ID |
| `PPLX_PRESET_DEEP_RESEARCH` | No | `gcir-deep-research` | Deep-research preset ID |
