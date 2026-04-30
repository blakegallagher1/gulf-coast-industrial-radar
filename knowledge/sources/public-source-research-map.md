---
title: Public Source Research Map
type: source_inventory
status: draft
last_updated: 2026-04-30
---

# Public Source Research Map

## Purpose

Preserve the detailed public/free source inventory extracted from the April 30, 2026 PRD. These are source-derived leads, not all independently verified live in this knowledge-base update.

## Source Documents

- `gulf-coast-industrial-radar-research-prd.md` - Sections 6 and 20.
- `ideabrowser-full-research-gulf-coast-industrial-radar.md` - competitive, traction, and product opportunity sections.

## Louisiana

| Source | Use | URL |
|---|---|---|
| LED FastLane / Incentives Management System | Capex, jobs, parish, company, incentive status, megaproject signals | https://www.opportunitylouisiana.gov/incentive/incentives-management-system-fastlane |
| Louisiana Industrial Tax Exemption Program | Manufacturing project economics and ad valorem exemption signals | https://www.opportunitylouisiana.gov/incentive/industrial-tax-exemption |
| LDEQ EDMS | Air, water, waste, permit applications, facility documents, enforcement records | https://www.deq.louisiana.gov/page/edms |
| LDEQ Information and Records | Public-record access path and EDMS linkage | https://deq.louisiana.gov/page/information-records |
| USACE New Orleans District public notices | Section 10, Section 404, Section 408, NEPA, and regulatory notices | https://www.mvn.usace.army.mil/Public-Notices/ |
| Louisiana Public Service Commission docket portal | Utility, power, generation, and transmission filings | https://lpscpubvalence.lpsc.louisiana.gov/portal/lpsc-web-portal |
| East Baton Rouge GIS open data | Property, zoning, boundaries, land use, roads, and other layers | https://www.brla.gov/827/Maps-Apps |
| EBR tax parcel ArcGIS item | Assessor-maintained parcel layer | https://www.arcgis.com/home/item.html?id=b961ea0510d04a2b86fa0ca55a79e8a7 |
| Ascension Parish GIS | Parish GIS, web maps, zoning, and parcel-related mapping | https://www.ascensionparish.net/geographic-information-system-gis-division/ |
| Ascension parcel FeatureServer | Queryable public parcel layer observed in ArcGIS REST | https://gis.ascensionparishla.gov/server/rest/services/AssessorData/Assessor_Parcels/FeatureServer/layers |
| Calcasieu Assessor GIS map | Public parcel/map viewer with official-record disclaimer | https://calcasieuassessor.org/app/clientpages/calcasieu/maps.html |

Constraint: Louisiana has no single free statewide authoritative parcel layer. Parcel ingestion must be parish-by-parish, with per-source license and export checks.

## Texas

| Source | Use | URL |
|---|---|---|
| TCEQ pending air permits | Pending NSR and Title V applications, public notices, comment information, summaries | https://www.tceq.texas.gov/permitting/air/airpermit-applications-notices |
| TCEQ air permitting portal | Permit types, participation, application status, document search guidance | https://www.tceq.texas.gov/permitting/air/air_permits.html |
| TCEQ air permit status | Pending/completed air quality permit applications and Central File Room search path | https://www.tceq.texas.gov/permitting/air/nav/air_status_permits.html/ |
| Texas JETI program | Large economic-development incentive applications | https://comptroller.texas.gov/economy/development/prop-tax/jeti/ |
| Texas JETI public listing | Company, location, industry, capital investment, jobs, and incentive estimates | https://gov.texas.gov/uploads/files/business/JETI_Public_Listing.pdf |
| Railroad Commission of Texas GIS data | Public oil/gas well and pipeline GIS data where available | https://www.rrc.texas.gov/about-us/faqs/general-faq/digital-map-information-gis-data/ |
| Texas Comptroller taxable entity search | Entity status and public information report lookup | https://comptroller.texas.gov/taxes/franchise/account-status/search |

## Mississippi, Alabama, And Florida

| State | Source | Use | URL |
|---|---|---|---|
| Mississippi | MDEQ public notices | Environmental permit notices | https://www.mdeq.ms.gov/permits/public-notices/ |
| Alabama | Alabama Secretary of State business entity records | Entity name, number, officer, agent, incorporator search | https://www.sos.alabama.gov/index.php/government-records/business-entity-records |
| Florida | Sunbiz | Business entity search and filings | https://search.sunbiz.org/Inquiry/CorporationSearch/ByName |
| Florida | Florida DEP public records and Oculus | Permit and document records | https://floridadep.gov/sec/sec/content/public-records |

Follow-up verification needed:

- Mississippi SOS direct entity-search endpoint and bulk export options.
- Alabama ADEM permit/public notice source structure.
- Florida industrial incentive and local economic-development board records.
- County parcel availability across Mobile, Baldwin, Jackson, Harrison, Escambia, Santa Rosa, and Gulf counties.

## Federal And National Infrastructure

| Source | Use | URL |
|---|---|---|
| SEC EDGAR APIs | Public-company filings, nightly bulk JSON, 10-K, 10-Q, 8-K, XBRL data | https://www.sec.gov/edgar/sec-api-documentation |
| FERC eLibrary | LNG, pipeline, interstate natural gas, power, and FERC-regulated project filings | https://www.ferc.gov/ferc-online/elibrary |
| SAM.gov contracting | Federal opportunities, awards, and subcontract reports | https://sam.gov/contracting |
| SAM.gov Opportunities API | Public opportunities API | https://open.gsa.gov/api/get-opportunities-public-api/ |
| USAspending API | Federal awards by recipient, place of performance, agency, award type, and obligations | https://api.usaspending.gov/ |
| EMMA / MSRB | Municipal bond offering documents and continuing disclosures | https://www.msrb.org/Transparency-and-Technology/About-EMMA |
| USGS National Map | Transportation, hydrography, boundaries, structures, and NAIP imagery access | https://www.usgs.gov/tools/download-data-maps-national-map |
| USGS transportation MapServer | Road, rail, airport, and transportation reference layers | https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer |
| BTS National Transportation Atlas Database | Transportation facility and network datasets, including ports and intermodal freight layers | https://www.bts.gov/newsroom/bts-updates-datasets-national-transportation-atlas-database-winter-2025 |
| HIFLD / DHS | Critical infrastructure geospatial data, with public vs secure/licensed distinctions | https://www.dhs.gov/gmo/hifld |
| Data.gov electric substations | HIFLD-linked public substation dataset | https://catalog.data.gov/dataset/electric-substations-c633a |

Constraint: some power infrastructure layers may be restricted, stale, incomplete, or sensitive. Store source vintage and confidence, and support substitution with state, utility, or FERC-derived layers when public federal layers are insufficient.

## Competitor And Adjacent Product Sources

| Source | Relevance | URL |
|---|---|---|
| LightBox | Broad CRE/location intelligence and data infrastructure | https://www.lightboxre.com/ |
| LightBox Vision | Parcel boundaries, buildings, zoning, ownership, demographics, traffic, and mapping workflow | https://www.lightboxre.com/data/lightbox-vision/ |
| LightBox Parcels API | Normalized parcel boundary/property data across U.S. counties | https://developer.lightboxre.com/apis/parcels |
| Reonomy | CRE property and ownership intelligence | https://www.reonomy.com/ |
| LandVision Site Profile Report | CRE and developer mapping workflows | https://support.digmap.com/onlinehelp/landvision/site-profile-report.html |

