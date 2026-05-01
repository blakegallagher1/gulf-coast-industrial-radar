# Source Schema Research

Auto-generated research artifacts mapping the actual current public surface
of each ingestion source. Produced by `SourceSchemaResearcher` running
Perplexity Sonar Pro against each source's home URL.

**Re-run any source:**

```bash
pnpm --filter @gcir/agents research <slug>
```

**Re-run all 14:**

```bash
pnpm research:sources
```

**Use `sonar-deep-research` for a more thorough pass (1-3 min/source):**

```bash
pnpm --filter @gcir/agents research:all -- --quality deep
```

## Index

| Slug | Source | Family | Status |
|---|---|---|---|
| [led-fastlane](./led-fastlane.md)             | LED FastLane / IMS                       | INCENTIVE             | ✅ |
| [la-itep](./la-itep.md)                       | LA Industrial Tax Exemption Program      | INCENTIVE             | ⚠ portal-only / PDF agendas |
| [la-bd-ci](./la-bd-ci.md)                     | LA Board of Commerce & Industry          | INCENTIVE             | ⚠ portal-only / PDF agendas |
| [ldeq-edms](./ldeq-edms.md)                   | LDEQ EDMS public document search         | ENVIRONMENTAL_PERMIT  | ⚠ form-only, AI-number primary key |
| [usace-mvn](./usace-mvn.md)                   | USACE New Orleans public notices         | ENVIRONMENTAL_PERMIT  | ✅ stable HTML |
| [lpsc](./lpsc.md)                             | LA Public Service Commission dockets     | UTILITY_POWER         | ✅ stable HTML |
| [la-sos](./la-sos.md)                         | LA SOS commercial entity search          | ENTITY_FORMATION      | ⚠ CAPTCHA-gated; URL path moved to /commercialsearch/ |
| [ascension-assessor](./ascension-assessor.md) | Ascension Parish Assessor + GIS          | LAND_CONTROL          | ✅ ArcGIS REST; domain moved to ascensionparishla.gov |
| [ebr-gis](./ebr-gis.md)                       | East Baton Rouge GIS open data           | LAND_CONTROL          | ✅ ArcGIS REST |
| [calcasieu-assessor](./calcasieu-assessor.md) | Calcasieu Parish Assessor GIS            | LAND_CONTROL          | ⚠ slow / degraded since 2026-04-30 |
| [sec-edgar](./sec-edgar.md)                   | SEC EDGAR submissions API                | PUBLIC_COMPANY        | ✅ JSON API; 10 req/s cap; mandatory UA |
| [sam-gov](./sam-gov.md)                       | SAM.gov Opportunities API v2             | PROCUREMENT           | ✅ JSON API; FPDS merged 2026-02-24 |
| [emma-msrb](./emma-msrb.md)                   | EMMA / MSRB IDB & continuing disclosures | FINANCING             | ⚠ no public IDB-specific surface; RSS broad |
| [tceq](./tceq.md)                             | TCEQ pending air permits                 | ENVIRONMENTAL_PERMIT  | ✅ stable HTML |

## Notes

- **CAPTCHA-gated sources** (la-sos) need either Playwright + an anti-bot
  bypass or a paid Commercial API subscription. The current adapter is
  best-effort under that constraint.
- **JS-rendered SPA sources** (led-fastlane public search) need Playwright
  to fully scrape. The current adapter targets the SSR shell + any inline
  hydration JSON; full coverage ships with the Playwright migration.
- **Portal-only / PDF sources** (la-itep, la-bd-ci) require either a PDF
  pipeline (PyMuPDF + LLM extraction) or a manual operator-driven import
  workflow. Both are tractable but were de-prioritized for v0.

## Provenance

Every artifact includes a citations section listing the Perplexity search
results that backed the synthesis. When a source's reality drifts from the
artifact, re-run the researcher and review the diff before updating the
matching adapter.
