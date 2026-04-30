# Contributing to Gulf Coast Industrial Radar

Thank you for contributing! Please read this before opening PRs.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local Postgres + PostGIS)

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/blakegallagher1/gulf-coast-industrial-radar.git
cd gulf-coast-industrial-radar
pnpm install

# 2. Copy env
cp .env.example .env.local
# Edit .env.local with your secrets

# 3. Start database
docker compose up -d

# 4. Push schema & seed
pnpm db:push
pnpm db:seed

# 5. Start dev
pnpm dev
```

## Code style

- Run `pnpm lint` and `pnpm typecheck` before committing.
- Prettier is enforced via pre-commit (husky + lint-staged).

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `chore:` build/config changes
- `docs:` documentation only

## Branch strategy

- `main` — production-ready code only
- `feat/<name>` — feature branches
- `fix/<name>` — bug fixes

## Pull requests

1. Fork the repo or create a branch from `main`.
2. Make your changes.
3. Open a PR against `main`.
4. At least one approval required before merging.
