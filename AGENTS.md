<!-- codex-model-defaults:start -->
## Codex Model Defaults

- Default Codex model: `gpt-5.5`. Keep this as the verified catalog default for daily sessions.
- GPT-5.5 Pro on demand: start a new session with `codex --profile gpt55-pro`, or use `codex -m gpt-5.5-pro` for a one-off session when that model slug is exposed in the current Codex build/account.
- The opt-in profile lives at `/Users/gallagherpropertycompany/.codex/gpt55-pro.config.toml` and sets `model = "gpt-5.5-pro"`, `model_reasoning_effort = "xhigh"`, and `service_tier = "priority"`.
- Use GPT-5.5 Pro for high-accuracy review, architecture, security, diligence, and other complex agentic tasks; fall back to the verified `gpt-5.5` default if the Pro slug is unavailable.

<!-- codex-model-defaults:end -->

# Agent Instructions — Gulf Coast Industrial Radar

This is now a runnable Next.js + Prisma monorepo. The original markdown-first
knowledge base (`knowledge/`) remains the source of truth for product decisions;
the code under `apps/` and `packages/` implements that spec.

## Read order for any new agent / contributor

1. `README.md`
2. `knowledge/INDEX.md`
3. `knowledge/strategy/product-thesis.md`
4. `knowledge/product/research-prd.md`
5. `knowledge/product/quiet-land-assembly-detector.md`
6. `knowledge/sources/signal-taxonomy.md`
7. `knowledge/implementation/data-model.md`
8. `knowledge/implementation/agent-architecture.md`
9. `packages/db/prisma/schema.prisma`
10. The specific module relevant to the task

## Project constraints

- First-pass buyer: real estate investors and developers.
- First-pass data: free / public sources only. No paid aggregators, GovWin /
  GovTribe subscriptions, paid satellite, or proprietary bid-alert databases.
- Do not treat contractor / vendor BD as the wedge unless explicitly redirected.
- Preserve source provenance. Every fact links to its `RawDocument` with URL,
  observed date, confidence label, and content hash.
- Prefer concise markdown files in `knowledge/` over one giant document.

## Code conventions

- TypeScript strict mode, `noUncheckedIndexedAccess: true`.
- Every adapter goes through `fetchWithRetry` (`packages/adapters/src/utils/`).
  No bare `fetch()` against external sources — single transient failures must
  not abort entire ingestion runs (lesson from gpc-cres April '26 audit).
- Every claim-bearing object preserves `sourceId`, `rawDocumentId`,
  `observedAt`, `documentDate`, `confidence`. The DocumentExtraction agent
  always returns a verbatim `evidenceSpan`.
- High-impact conclusions (likely sponsor identity, acquisition strategy,
  legal / environmental / entitlement risk) require `AnalystReview` before
  external distribution.
- New signal predicates go in the `predicate` field as
  `family.subject.qualifier` (e.g., `permit.air.NOI`, `incentive.itep.eligible`)
  and are documented in `packages/agents/src/document-extraction.ts`.

## Markdown standards (knowledge/)

- Semantic headings, short sections, tables where comparison helps.
- YAML frontmatter for durable metadata.
- Relative links inside project markdown.
- Keep files focused on one concept, workflow, source family, or decision area.
