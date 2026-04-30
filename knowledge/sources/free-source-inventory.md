---
title: Free Source Inventory
type: source_inventory
status: draft
last_updated: 2026-04-30
---

# Free Source Inventory

This file tracks free/public sources for first-pass buildout. Each source should eventually receive coverage notes by geography, access method, update frequency, fields available, and extraction difficulty.

## Louisiana / Baton Rouge Starting Sources

| Source | Signal Type | Use |
|---|---|---|
| LED FastLane / ITEP | Incentives | Detect large capital-project incentives and industrial tax exemption activity |
| Louisiana Board of Commerce and Industry | Incentives / agendas | Monitor approvals, project names, sponsors, and meeting packets |
| LDEQ EDMS and public notices | Environmental permits | Detect air, water, waste, stormwater, and facility permit activity |
| USACE New Orleans public notices | Wetlands / waterways / dredging | Detect Section 10/404, coastal, dredging, and industrial site impacts |
| Louisiana Public Service Commission | Utility / power | Detect large-load, transmission, generation, and utility infrastructure signals |
| Louisiana SOS | Entities | Detect newly formed or opaque project entities |
| Parish assessor / GIS layers | Parcels | Track parcel ownership, acreage, geometry, land use, and valuation where free |
| Parish council / planning / zoning agendas | Local approvals | Detect rezoning, subdivision, permits, variances, infrastructure items |
| Port commission agendas | Port / terminal | Detect leases, land options, infrastructure work, dredging, terminal expansion |
| State Bond Commission / EMMA | Financing | Detect public finance and infrastructure support signals |

## Gulf Coast / Federal Sources

| Source | Signal Type | Use |
|---|---|---|
| SEC EDGAR APIs | Public-company capex | Search filings for Gulf Coast, site selection, FID, FEED, LNG, hydrogen, ammonia, data center, and named geographies |
| FERC eLibrary | LNG / pipeline / power | Monitor LNG, pipeline, power, and regulatory filings |
| SAM.gov | Procurement | Late-stage confirmation for federal industrial, port, engineering, dredging, and infrastructure work |
| USAspending API | Awards | Track federal award patterns and related infrastructure spending |
| EMMA | Municipal finance | Track bond-funded industrial infrastructure and public authority financing |
| EPA ECHO | Environmental compliance | Facility and enforcement context |
| USGS National Map | Base geospatial layers | Elevation, hydrography, transportation, and other base layers |
| BTS NTAD | Transportation infrastructure | Rail, port, road, pipeline, and transportation context |
| EIA energy map/data | Energy infrastructure | Power plants, transmission, energy facilities, and related energy context |

## Other State Sources To Add

| State | Starting Sources |
|---|---|
| Texas | TCEQ pending air permits, TCEQ permit status, Texas JETI, Texas Comptroller taxable entity search, Railroad Commission GIS, utility dockets, port/county agendas |
| Mississippi | MDEQ public notices, Mississippi SOS, port/county agendas |
| Alabama | ADEM public notices, Alabama SOS business entity records, port/county agendas |
| Florida | Florida DEP Oculus/public records, Sunbiz, industrial incentive records, port/county agendas |

See [Public Source Research Map](public-source-research-map.md) for the full April 30, 2026 source list and preserved URLs from the PRD.

## Coverage Matrix Fields

For each parish/county, track:

- Parcel geometry availability.
- Owner name availability.
- Mailing address availability.
- Sale date / sale price availability.
- Deed / transfer access.
- Zoning and land-use layers.
- Permit portal availability.
- Planning agenda availability.
- Port / authority agenda availability.
- Utility docket relevance.
- Notes on access limits.
