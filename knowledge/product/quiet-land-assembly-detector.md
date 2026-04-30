---
title: Quiet Land Assembly Detector
type: product
status: draft
last_updated: 2026-04-30
---

# Quiet Land Assembly Detector

## Purpose

Define the highest-leverage feature from the research PRD: detecting quiet industrial land assembly before a public announcement explains the land-control pattern.

## Source Documents

- `gulf-coast-industrial-radar-research-prd.md` - Section 10, "Quiet Land Assembly Detector."
- `ideabrowser-full-research-gulf-coast-industrial-radar.md` - product opportunity and market-gap sections supporting pre-bid alert positioning.

## Detection Rule

Flag a possible quiet industrial land assembly when:

- Same buyer or related buyer entities acquire, lease, or appear to control 200+ acres.
- Acquisitions occur within 24 months.
- Parcels are contiguous or within 0.5-2 miles.
- Site is near at least two industrial-enabling assets:
  - rail
  - port
  - interstate
  - high-voltage transmission
  - substation
  - pipeline
  - navigable water
  - industrial zoning
  - major existing industrial cluster
- Buyer is newly formed, opaque, out-of-state, project-like, or linked to known industrial sponsors.
- No matching public announcement already explains the land control.

## Scoring Components

- Acreage score.
- Contiguity score.
- Acquisition velocity score.
- Infrastructure proximity score.
- Industrial zoning / land-use score.
- Buyer opacity score.
- Entity relatedness score.
- Price premium score where sale price is available.
- Public announcement penalty.
- Contradictory evidence penalty.

## Alert Output

Each alert should include:

- Suspected project/site name.
- Parish/county.
- Score.
- Stage.
- Confidence.
- Detected control acreage.
- Parcel count.
- Acquisition window.
- Buyer entities.
- Related registered agents, officers, and addresses.
- Nearest rail, port, interstate, power, and pipeline assets.
- Zoning, flood, and wetlands flags.
- Source evidence.
- Recommended investor/developer action.

## Investor Actions

Recommended actions should map to stage and evidence quality:

- Map adjacent parcels.
- Identify owners.
- Call owner or broker where appropriate.
- Watch next public board or commission meeting.
- Check zoning, flood, wetlands, and power constraints.
- Prepare option or assemblage strategy.
- Escalate for broker outreach.
- Dismiss or pass when contradictory evidence or site constraints dominate.

## Open Questions

- Does the first acreage threshold need to vary by parish/county or infrastructure type?
- Should leases, options, and memoranda be modeled separately from fee-simple purchases?
- What is the minimum evidence package before an alert can be sent to a paid user rather than held for analyst review?

