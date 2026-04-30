# Gulf Coast Industrial Radar — Agent Guide

This file tells AI coding assistants (Claude Code, Cursor, Copilot, etc.) how to work effectively in this monorepo.

## Repo layout

```
gcir/
  apps/
    web/          Next.js 15 app (Clerk auth, MapLibre, shadcn/ui)
    worker/       Long-running Node process (croner scheduler)
  packages/
    adapters/     Source adapters (fetch → typed signals)
    agents/       OpenAI-powered AI agents
    db/           Prisma 6 client + PostGIS schema + seed
    scoring/      Pure-function scoring engines
    shared/       Shared types, constants, taxonomy
```

## Key conventions

- **pnpm workspaces** — run `pnpm -F <package> <cmd>` from the repo root.
- **TypeScript strict** — all packages use `@gcir/tsconfig/base`.
- **Prisma 6** — schema lives in `packages/db/prisma/schema.prisma`; always run `pnpm db:push` after changes.
- **Scoring engines** are pure functions: `(input) => score`. No DB or network calls.
- **Adapters** implement `BaseAdapter` and export a default instance.
- **Agents** are thin wrappers around OpenAI structured outputs.
- **No secrets** in source. Use `.env.local` (gitignored).

## Common tasks

| Task | Command |
|------|---------|
| Dev (web) | `pnpm dev` |
| DB migrate | `pnpm db:push` |
| DB seed | `pnpm db:seed` |
| Type-check all | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Build | `pnpm build` |

## Adding a new source adapter

1. Create `packages/adapters/src/<name>.adapter.ts`.
2. Extend `BaseAdapter` and implement `fetch()`.
3. Export from `packages/adapters/src/index.ts`.
4. Add to `packages/agents/src/source-watcher.agent.ts` dispatching.

## Adding a new AI agent

1. Create `packages/agents/src/<name>.agent.ts`.
2. Use `openai.beta.chat.completions.parse` with a Zod schema.
3. Export from `packages/agents/src/index.ts`.
