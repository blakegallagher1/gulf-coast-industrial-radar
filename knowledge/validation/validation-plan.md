---
title: Validation Plan
type: validation
status: active
last_updated: 2026-05-05
---

# Validation Plan

## Backtest

Backtest 10 known Gulf Coast industrial projects using only free historical sources.

Candidate set from the research PRD:

- Woodside Louisiana LNG.
- Hyundai Steel Donaldsonville / Ascension.
- Meta / Entergy Richland Parish data-center power infrastructure.
- Louisiana International Terminal.
- Major Lake Charles LNG/petrochemical expansions.
- Hydrogen/ammonia projects in the Mississippi River corridor.
- Large Texas Gulf Coast chemical or LNG projects.
- Mobile or Pascagoula port/industrial expansions.
- Major transmission/generation projects tied to industrial load.
- Known port terminal or dredging projects.

For each project, reconstruct:

- Public announcement date.
- First visible land-control signal.
- First visible entity signal.
- First visible permit signal.
- First visible incentive signal.
- First visible utility/power signal.
- First visible FERC signal when applicable.
- First visible port/local-agenda signal.
- First visible SEC/corporate signal.
- First public announcement.
- Lead time between earliest useful signal and public awareness.
- False-positive risks.
- What recommendation would have been sent to an investor.

## Metrics

Computed on 2026-05-05 by `runBacktest()` against the 10 seeded validation
fixtures, using only the existing scoring package and fixture `RawDocument`
rows. The in-product surfaces are `/proof`, `/proof/[projectKey]`, and
`/admin/backtest`.

| Metric | Result | Notes |
|---|---:|---|
| Project count | 10 | Seeded public-project validation fixtures only. |
| Alerted ahead of announcement | 9 | Air Products first seeded signal is on the announcement date, so it remains a late/unmet lead-time row. |
| Average lead time | 304.44 days | Positive lead-time rows only. |
| Median lead time | 265 days | Positive lead-time rows only. |
| Longest lead | 730 days | Lake Charles LNG Expansion. |
| Shortest positive lead | 125 days | AM/NS Calvert Expansion. |
| Precision | 90% | 9 of 10 surfaced ahead of announcement. |
| Recall | 90% | 9 of 10 seeded reference projects surfaced ahead of announcement. |
| Duplicate rate | 90% | 9 projects have more than one alert family in the fixture timeline. |
| False-positive rate | 0% | Every fixture has a downstream public announcement match; no unmatched alert rows are introduced. |

Remaining validation gaps:

- Missing-source rate and source freshness should stay on `/proof` because they
  depend on the live local database, not the offline seeded backtest.
- Recommended-action usefulness still requires buyer/operator review; the
  backtest now shows which action would have fired, but not whether a user
  acted on it.

## Market Validation

Treat Ideabrowser traction claims as hypotheses to test, not accepted truth.

- Run a manual or semi-automated weekly brief before a full UI.
- Recruit 20-30 Gulf Coast investors, developers, brokers, or site-selection-adjacent operators for interviews.
- Use a 5-project backtest as proof content.
- Test willingness to pay for a paid pilot or manual intelligence brief.
- Track trial-to-paid conversion, deposit rate, and interview-to-pilot conversion before assuming SaaS demand.

## Pilot

Run a manual or semi-automated weekly investor brief before building a full UI.

Track:

- Which signals create follow-up.
- Which signals are stale or already known.
- Which recommended actions are actually useful.
- Which sources produce noise.
- Which corridors generate investable opportunities.
