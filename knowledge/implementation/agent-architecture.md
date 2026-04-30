---
title: Agent Architecture
type: implementation
status: draft
last_updated: 2026-04-30
---

# Agent Architecture

## First-Pass Agents

| Agent | Job |
|---|---|
| Source Watcher Agent | Checks configured free sources and detects new or changed records |
| Evidence Archive Agent | Saves raw PDFs, HTML snapshots, API responses, agendas, notices, and search result evidence |
| Document Extraction Agent | Extracts sponsor, site, capex, acreage, permit type, dates, facility type, and next milestone |
| Entity Resolution Agent | Links shell LLCs, sponsors, registered agents, landowners, consultants, project names, and facility aliases |
| Site Scoring Agent | Scores industrial fit based on infrastructure, zoning, flood/wetlands, acreage, and corridor context |
| Project Formation Scoring Agent | Scores suspected projects by corroborating signals and stage |
| Investor Action Agent | Produces recommended next actions and reason codes |
| Brief Writer Agent | Writes weekly investor briefs and per-signal summaries |
| Analyst Review Agent | Supports merge, split, dismiss, escalate, watch, and false-positive workflows |

## Human Review Boundary

The agent can recommend actions, but humans should approve high-impact conclusions before external distribution, especially when:

- A source is ambiguous.
- A signal involves a shell entity.
- A site recommendation implies acquisition or option strategy.
- A legal, environmental, or entitlement conclusion is material.

