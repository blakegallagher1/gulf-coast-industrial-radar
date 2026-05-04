---
title: Viral Gap Closure Plan
type: implementation
status: draft
last_updated: 2026-05-01
---

# Viral Gap Closure Plan

## Decision

Do not widen the product yet.

The fastest path to a genuinely breakout product is to make the existing
investor/developer wedge undeniably useful, then layer distribution mechanics on
top of that evidence-backed workflow. The repo already claims coverage across
map UI, source adapters, scoring, agents, weekly briefs, and Quiet Land
Assembly detection. The remaining risk is not "lack of AI." The risk is that
the system may still have gaps between:

- documented acceptance criteria
- actual live ingestion coverage
- evidence quality
- actionability for buyers
- repeatable alert trust

The product should therefore be tightened around one sharp promise:

**Find site-control formation and industrial demand early enough for a real
estate investor or developer to act this week, with evidence strong enough to
share.**

## What "viral" should mean here

For this product, virality should not mean casual consumer sharing. It should
mean:

1. A user sees a cluster and forwards it immediately to partners, brokers,
   land teams, engineers, or capital partners.
2. The forwarded alert contains enough evidence and suggested next actions that
   the recipient can work from it without extra explanation.
3. Teams want shared watchlists, shared briefs, and shared validation because
   the product improves real deal flow.

That means the growth loop is driven by evidence-backed collaboration, not by
generic dashboards or additional source count.

## Verified current state from first-pass docs

- The core buyer is still investors and developers.
- The core promise is early industrial formation and site-control detection.
- The highest-leverage feature is the Quiet Land Assembly Detector.
- The codebase already claims:
  - map-first radar UI
  - six-tab alert drawer
  - weekly brief generation
  - 12 source adapters
  - 9 AI agents
  - scoring engines
  - Perplexity validation runtime
  - feature-flagged QLAD live alerting
- The PRD acceptance criteria still require proof of:
  - 3+ launch parishes/counties with parcel ingestion
  - 6+ scheduled source lanes
  - evidence-linked signals
  - structured AI extraction with confidence and excerpts
  - visible formation score
  - QLAD alerts
  - map UI with infrastructure and actions
  - analyst triage actions
  - weekly brief from live alerts
  - backtest lead-time across 5+ known projects

## Product gaps to close next

These are the highest-probability gaps between "interesting prototype" and
"must-use operating tool."

### 1. Trust gap

Users will not forward alerts unless the evidence package is obviously solid.

Required bar:

- Every alert shows why it exists in plain English.
- Every major conclusion is tied to source evidence, dates, and confidence.
- Contradictory evidence is visible, not hidden.
- Public-announcement checks are explicit so users know whether the alert is
  genuinely early.

### 2. Actionability gap

A high score is not enough. The user needs a concrete next move.

Required bar:

- Each alert should end in a short "what to do this week" section.
- Actions should differ by user type:
  - investor
  - developer
  - engineering/construction observer
- The recommendation must reference the actual evidence and stage, not generic
  playbooks.

### 3. Workflow gap

If the product is not easy to pass around internally, it will not spread.

Required bar:

- Shared watchlists
- saveable alerts
- brief-friendly output
- linkable evidence views
- analyst status that distinguishes new, watched, validated, false positive,
  and passed

### 4. Coverage-proof gap

The README claims broad capability, but the PRD bar requires evidence that the
system works across launch corridors and known backtests.

Required bar:

- explicit source-by-source live status
- explicit parish coverage status
- explicit backtest scoreboard
- explicit feature-flag and production-readiness checklist

## Highest-leverage build sequence

### Phase A. Completion audit

Audit the codebase against the PRD acceptance criteria and README claims.

Output:

- one checklist showing what is implemented
- one checklist showing what is documented but not verified
- one list of gaps requiring code

### Phase B. Alert quality hardening

Tighten the main alert detail experience until one alert can stand alone as a
shareable investment memo.

Target result:

- summary answers "what is happening, why we think so, why now"
- evidence tab is human-credible
- recommendations are differentiated by audience and stage
- validation state is obvious

### Phase C. Distribution surfaces

Make the product easy to circulate inside a deal team.

Target result:

- watchlists that feel collaborative
- weekly brief that is directly forwardable
- durable URLs and share-safe alert views

### Phase D. Launch-proof evidence

Backtest and corridor proof should be visible in-product or in admin surfaces so
the team can trust rollout decisions.

Target result:

- reference-project scoreboard
- source freshness indicators
- source outage visibility
- corridor coverage summary

## Constraints for this execution

- Use only current AI and web-search credentials already available in the repo
  workflow, especially OpenAI and Perplexity.
- Do not introduce paid proprietary data dependencies.
- Keep the first wedge focused on investor/developer advantage even if later
  views support engineering and construction stakeholders.

## Immediate implementation priority

The next step should be a code-level completion audit against the real modules
that back:

1. alert detail quality
2. watchlist / collaboration workflow
3. weekly brief usefulness
4. backtest and launch-readiness visibility

Only after that audit should new features be added. Otherwise the team risks
adding breadth before proving the trust and workflow loop that makes the
product spread.
