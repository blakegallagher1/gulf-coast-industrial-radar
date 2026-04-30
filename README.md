# Gulf Coast Industrial Radar (GCIR)

A full-stack monorepo for tracking, validating, and analysing Gulf Coast industrial
facilities, assemblies, and regulatory data.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma
- **AI / Research**: OpenAI (GPT-4o-mini) + Perplexity Agent API
- **Monorepo**: pnpm workspaces + Turborepo
- **Testing**: Vitest

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template
cp .env.example .env
# Fill in DATABASE_URL, OPENAI_API_KEY, PERPLEXITY_API_KEY at minimum.

# 3. Push the DB schema
pnpm db:push

# 4. Run the dev server
pnpm dev
```

## Perplexity preset routing

GCIR routes Perplexity calls through named **presets** rather than raw model IDs.
Each preset bundles a model, tool config, and step budget:

| Preset key | API preset string | Approx cost | When used |
|------------|-------------------|-------------|------------------------------|
| `fast` | `fast-research` | ~$0.002/call | Simple, known-schema lookups |
| `balanced` | `pro-search` | ~$0.005/call | Default — most calls |
| `deep` | `deep-research` | ~$0.015/call | Multi-step research tasks |

### How to enable

1. Set `PERPLEXITY_API_KEY` in `.env`.
2. Optionally override the default preset: `PERPLEXITY_DEFAULT_PRESET=fast-research`.
3. Optionally set a daily spend cap: `PERPLEXITY_DAILY_BUDGET_USD=5.00`.

See [`packages/agents/src/perplexity-client.ts`](packages/agents/src/perplexity-client.ts)
for the full implementation including caching, telemetry, and cost estimation.

## Packages

| Package | Description |
|---------|-------------|
| `apps/web` | Next.js web application |
| `packages/agents` | AI agent clients (OpenAI, Perplexity) + pipelines |
| `packages/db` | Prisma schema + client |
| `packages/ui` | Shared React components |

## Testing

```bash
# Run all tests
pnpm test

# Run agent tests only
pnpm --filter @gcir/agents test
```

## Environment variables

See [`.env.example`](.env.example) for the full list with descriptions.

## Licence

MIT
