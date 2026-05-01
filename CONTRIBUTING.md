# Contributing

## Local setup

```bash
pnpm install
docker compose up -d
cp .env.example .env.local
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev
```

## Adding a new source adapter

1. Add a row to `seed.ts` so the `Source` exists in the registry.
2. Implement `packages/adapters/src/<slug>.ts` exporting a `SourceAdapter`.
3. Wire it in `packages/adapters/src/index.ts`.
4. Use `fetchWithRetry` for every outbound HTTP call.
5. Return `AdapterRecord` with `family`, `predicate`, `confidence`, `payload`.
6. Persist evidence via `storeEvidence` — never skip the raw archive.

## Adding a new signal predicate

1. Document the predicate in `packages/agents/src/document-extraction.ts` so
   the extraction agent knows the canonical name.
2. If the predicate maps to a new entity / parcel / project field, update
   `packages/db/prisma/schema.prisma` and write a migration.
3. Update the scoring weights in `packages/shared/src/taxonomy.ts` if a new
   family is introduced (rare — most predicates fold into existing families).

## Adding a new tab to the alert drawer

1. Create the component under `apps/web/components/radar/tabs/`.
2. Register it in `apps/web/components/radar/Drawer.tsx`.
3. Add the API route under `apps/web/app/api/projects/[id]/<tab>/route.ts`
   if it needs server-rendered data.

## Running the worker

`WORKER_CRON_ENABLED=false` (default) does a single one-shot pass and exits —
useful for local debugging. `WORKER_CRON_ENABLED=true` activates the schedulers
in `apps/worker/src/index.ts`.

## Style

- 2-space indent · `printWidth=100` · `trailingComma=all` · `semi=true`.
- TypeScript strict; no `any`, no `// @ts-ignore`.
- Prefer absolute imports `@/components/...`, `@gcir/db`, etc. over deep relatives.
