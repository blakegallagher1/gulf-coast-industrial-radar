# Gulf Coast Industrial Radar

Research and build PRD for an AI-agent platform that detects industrial project formation before bid day and tells real estate investors and developers what to do next.

Prepared: 2026-04-30  
First buyer: real estate investors and developers  
Data constraint: free and public sources only

## 1. Ideabrowser Run Status

Ideabrowser idea submitted successfully.

- Ideabrowser title: AI-Powered Insights Platform — Gulf Coast Real Estate
- User idea ID: `b4b5d1cb-6dfa-447d-8c3a-36a567f3b533`
- Ideabrowser research status: `in_progress`
- Estimated Ideabrowser completion time: 15-30 minutes from submission
- Curated platform insight searches returned no matching pre-researched market insight for:
  - industrial real estate site selection permits land assembly
  - real estate investors developers public data monitoring
  - construction bid intelligence industrial projects contractors

Important: the full Ideabrowser 40+ step research pipeline is running asynchronously. Per Ideabrowser tool rules, it should not be polled automatically. Once complete, the research can be attached and merged into this PRD.

## 2. Product Thesis

Industrial megaprojects do not appear suddenly at bid day. Before a project is announced, multiple public signals usually leak into the open record: land assembly, shell-company formation, incentive applications, environmental permits, utility interconnection or generation filings, port agenda items, local planning actions, public-company capex language, financing documents, engineering notices, and early procurement.

The buyer for the first version is not the contractor. It is the investor or developer who wants to detect where industrial demand is forming early enough to:

- buy or option adjacent land
- control a future laydown, logistics, workforce housing, truck parking, IOS, or flex-industrial site
- entitle land before the market reprices
- sell or JV into the demand wave
- avoid land that looks cheap but cannot support industrial use
- monitor a corridor with a defensible evidence trail

The contractor workflow comes later, after the platform can reliably identify project formation and site-level demand.

## 3. Why Now

Several independent trends make this worth building now:

- Industrial occupiers are still prioritizing strategic locations, manufacturing reshoring, network resilience, and future-ready facilities.
- AI/data-center demand is pushing power availability into the center of site selection.
- Gulf Coast industrial projects create large land-control footprints before they create obvious bid packages.
- State and federal permitting, incentive, utility, and securities-disclosure systems are increasingly searchable online.
- The hardest work is not finding one source; it is normalizing many weak public signals into a site-level probability score.

Useful market references:

- CBRE 2026 U.S. industrial outlook notes continued reshoring and forecasts a year-over-year increase in industrial leasing activity: https://www.cbre.com/insights/books/us-real-estate-market-outlook-2026/industrial
- Deloitte 2026 Manufacturing Industry Outlook highlights manufacturing investment, incentives, data-center growth, and semiconductors as potential growth drivers: https://www.deloitte.com/us/en/insights/industry/manufacturing-industrial-products/manufacturing-industry-outlook.html
- JLL industrial research frames manufacturing as a long-term demand driver and emphasizes multimodal logistics access: https://www.jll.com/en-us/newsroom/us-industrial-market-shows-resilience-amid-evolving-tenant-strategies
- Deloitte 2026 Power and Utilities Outlook identifies data centers as a fast-growing source of electricity demand: https://www.deloitte.com/us/en/insights/industry/power-and-utilities/power-and-utilities-industry-outlook.html

## 4. Buyer, ICP, and Jobs To Be Done

### Initial ICP

Primary:

- Gulf Coast industrial land investors
- merchant developers
- local/regional industrial developers
- real estate private equity groups with land or industrial strategies
- family offices and developers seeking pre-announcement land positions

Secondary:

- site-selection consultants
- industrial brokers
- ports and economic-development groups
- infrastructure-adjacent investors

Not first:

- contractors
- EPC firms
- government-contracting consultants
- general CRE data buyers

### Jobs To Be Done

When an industrial project may be forming, the investor/developer wants to know:

- Where is the site or likely site cluster?
- Who appears to be controlling land?
- How much acreage is controlled or adjacent?
- Is the buyer newly formed, opaque, or linked to a known sponsor?
- What infrastructure makes the site plausible?
- Which public documents support the hypothesis?
- What milestone is the project likely in?
- What should I do this week?

## 5. Launch Geography

Start with a narrow Gulf Coast corridor where industrial project density, infrastructure, and public-signal availability are highest.

Recommended launch wedge:

1. Lake Charles / Calcasieu / Cameron
2. Baton Rouge-New Orleans industrial river corridor: Ascension, St. James, Iberville, St. John, St. Charles, Plaquemines, St. Bernard, East Baton Rouge
3. Houston Ship Channel / Beaumont-Port Arthur
4. Mobile / Baldwin / coastal Alabama
5. Pascagoula / Gulfport / coastal Mississippi

Do not start with full Gulf Coast coverage. Start with a corridor where public parcel and permit data are usable enough to produce high-confidence alerts.

## 6. Free/Public Data Source Research

The platform should classify data sources by legality, cost, update cadence, historical depth, structure, and alert usefulness.

### Louisiana Sources

High priority:

- LED FastLane and ITEP: public search for projects before the Board of Commerce and Industry. Useful for capex, jobs, parish, company, incentive status, and megaproject signals. Source: https://www.opportunitylouisiana.gov/incentive/incentives-management-system-fastlane
- Louisiana Industrial Tax Exemption Program: useful for manufacturing project economics and large ad valorem exemption signals. Source: https://www.opportunitylouisiana.gov/incentive/industrial-tax-exemption
- LDEQ EDMS: official repository for LDEQ public records. Useful for air, water, waste, permit applications, facility documents, and enforcement records. Source: https://www.deq.louisiana.gov/page/edms
- LDEQ Information & Records: confirms public-record access path and EDMS linkage. Source: https://deq.louisiana.gov/page/information-records
- USACE New Orleans District public notices: Section 10, Section 404, Section 408, NEPA, and regulatory notices. Source: https://www.mvn.usace.army.mil/Public-Notices/
- Louisiana Public Service Commission docket portal: utility, power, generation, and transmission filings. Source handle: https://lpscpubvalence.lpsc.louisiana.gov/portal/lpsc-web-portal
- SEC EDGAR APIs: real-time public-company filings, nightly bulk JSON, 10-K, 10-Q, 8-K, XBRL data. Source: https://www.sec.gov/edgar/sec-api-documentation
- FERC eLibrary: LNG, pipeline, interstate natural gas, power, and FERC-regulated project filings. Source: https://www.ferc.gov/ferc-online/elibrary
- SAM.gov contracting: federal opportunities, awards, and subcontract reports. Source: https://sam.gov/contracting
- USAspending API: federal award data by recipient, place of performance, agency, award type, and obligations. Source: https://api.usaspending.gov/
- EMMA / MSRB: municipal bond offering documents and continuing disclosures. Source: https://www.msrb.org/Transparency-and-Technology/About-EMMA

Parcel/GIS examples:

- East Baton Rouge GIS open data: public geospatial portal with property, zoning, boundaries, land use, roads, and other layers. Source: https://www.brla.gov/827/Maps-Apps
- EBR tax parcel ArcGIS item: parcel layer maintained by the East Baton Rouge Parish Assessor. Source: https://www.arcgis.com/home/item.html?id=b961ea0510d04a2b86fa0ca55a79e8a7
- Ascension Parish GIS: parish GIS, web maps, zoning, and parcel-related public mapping. Source: https://www.ascensionparish.net/geographic-information-system-gis-division/
- Ascension parcel FeatureServer: queryable public layer observed in ArcGIS REST. Source: https://gis.ascensionparishla.gov/server/rest/services/AssessorData/Assessor_Parcels/FeatureServer/layers
- Calcasieu Assessor GIS map page: public parcel/map viewer, with disclaimer that records are not a replacement for official documents. Source: https://calcasieuassessor.org/app/clientpages/calcasieu/maps.html

Constraint:

- Louisiana has no single free statewide authoritative parcel layer. Parcel ingestion must be parish-by-parish, with per-source license and export checks.

### Texas Sources

High priority:

- TCEQ pending air permits: pending NSR and Title V applications, public notices, comment information, and summaries. Source: https://www.tceq.texas.gov/permitting/air/airpermit-applications-notices
- TCEQ air permitting portal: permit types, participation, application status, and document search guidance. Source: https://www.tceq.texas.gov/permitting/air/air_permits.html
- TCEQ air permit status: pending and completed air quality permit applications; Central File Room used for document searches. Source: https://www.tceq.texas.gov/permitting/air/nav/air_status_permits.html/
- Texas JETI program: large economic-development incentive applications for jobs, energy, technology, and innovation projects. Source: https://comptroller.texas.gov/economy/development/prop-tax/jeti/
- Texas JETI public listing PDF: published project list with company, location, industry, capital investment, required jobs, and incentive estimates. Source: https://gov.texas.gov/uploads/files/business/JETI_Public_Listing.pdf
- Railroad Commission of Texas GIS data: public oil/gas well and pipeline GIS data where available. Source: https://www.rrc.texas.gov/about-us/faqs/general-faq/digital-map-information-gis-data/
- Texas Comptroller taxable entity search: useful public entity status and public information reports. Source handle: https://comptroller.texas.gov/taxes/franchise/account-status/search

### Mississippi, Alabama, and Florida Sources

Initial source lanes:

- MDEQ public notices: environmental permit notices in Mississippi. Source: https://www.mdeq.ms.gov/permits/public-notices/
- Alabama Secretary of State business entity records: entity name, number, officer/agent/incorporator search. Source: https://www.sos.alabama.gov/index.php/government-records/business-entity-records
- Florida Sunbiz: Florida Division of Corporations business entity search and filings. Source handle: https://search.sunbiz.org/Inquiry/CorporationSearch/ByName
- Florida DEP public records and Oculus: permit and document records. Source: https://floridadep.gov/sec/sec/content/public-records

Follow-up verification needed:

- Mississippi SOS direct entity-search endpoint and bulk export options
- Alabama ADEM permit/public notice source structure
- Florida industrial incentive and local economic-development board records
- county parcel availability across Mobile, Baldwin, Jackson, Harrison, Escambia, Santa Rosa, and Gulf counties

### Federal and National Infrastructure Layers

Base infrastructure layers:

- USGS National Map: free, nationally consistent geospatial datasets, including transportation, hydrography, boundaries, structures, and NAIP imagery access. Source: https://www.usgs.gov/tools/download-data-maps-national-map
- USGS National Map transportation MapServer: road, rail, airport, and transportation reference layers. Source: https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer
- BTS National Transportation Atlas Database: national geospatial transportation facility and network datasets, including ports and intermodal freight layers. Source: https://www.bts.gov/newsroom/bts-updates-datasets-national-transportation-atlas-database-winter-2025
- HIFLD / DHS: high-quality geospatial data for critical infrastructure, with a distinction between public and secure/licensed layers. Source: https://www.dhs.gov/gmo/hifld
- Data.gov electric substations dataset: HIFLD-linked public substation dataset. Source: https://catalog.data.gov/dataset/electric-substations-c633a

Constraint:

- Some power infrastructure layers may be restricted, stale, incomplete, or sensitive. The platform should store source vintage and confidence, and it should support substituting state/utility/FERC-derived layers when public federal layers are insufficient.

## 7. Competitive Landscape

### Direct and adjacent competitors

- LightBox: broad CRE/location intelligence, parcel boundaries, buildings, zoning, ownership, environmental, lending, valuation, brokers, investors, utilities, and developers. Source: https://www.lightboxre.com/
- LightBox Vision: parcel boundaries, building footprints, zoning, ownership, demographics, traffic, and property data in mapping workflow. Source: https://www.lightboxre.com/data/lightbox-vision/
- LightBox Parcels API: normalized parcel boundary/property data across U.S. counties. Source: https://developer.lightboxre.com/apis/parcels
- Reonomy: CRE property and ownership intelligence, off-market sourcing, transactions, companies, owners, ownership portfolios, and AI record matching. Source: https://www.reonomy.com/
- LandVision: CRE and builder/developer mapping workflows, property details, transaction history, tax/value information, demographics, maps, and site profile reports. Source: https://support.digmap.com/onlinehelp/landvision/site-profile-report.html

### Market gap

Existing CRE data platforms are strong at parcel/ownership lookup and site research, but this product should differentiate by:

- detecting project formation rather than only searching static property records
- using a signal graph across permits, incentives, SEC filings, utility dockets, port agendas, and land assembly
- focusing on Gulf Coast industrial project formation
- providing investor/developer actions, not just search results
- preserving public-source evidence for every alert
- working under a free/public-source-only data constraint for MVP

## 8. Core Product Requirements

### Product Modules

1. Source Registry
   - catalog each source, jurisdiction, URL, cost, license, format, update cadence, fields, scrape/API method, robots/terms review, and ingestion status

2. Ingestion Workers
   - fetch HTML, PDFs, ArcGIS REST, CSV, JSON APIs, agendas, public notices, docket results, and filings
   - preserve raw snapshots
   - normalize document metadata

3. AI Extraction Layer
   - extract entities, sites, parcels, capex, acreage, facility type, permit type, docket number, source dates, milestone, and document links
   - produce confidence score and evidence excerpts
   - store extracted facts as claims, not final truth

4. Entity Resolution
   - normalize company names, shell LLCs, registered agents, addresses, officers, organizers, law firms, lenders, and related buyers
   - link entities across states and document types

5. Parcel and Site Graph
   - unify parcel geometry, assessor fields, ownership snapshots, acreage, zoning, sale history where available, and infrastructure proximity
   - support cluster detection and historical diffs

6. Industrial Formation Scoring
   - compute signal strength by stage:
     - land control
     - entity formation
     - incentive
     - environmental permit
     - wetlands/coastal/navigable-water permit
     - utility/power
     - port/local agenda
     - financing/bond
     - SEC/corporate disclosure
     - procurement/engineering
     - physical site change

7. Action Recommendation Engine
   - generate next actions by buyer type and stage:
     - map adjacent parcels
     - identify owners
     - monitor board agenda
     - check zoning/flood/wetlands
     - call owner/broker
     - prepare option strategy
     - run entitlement checklist
     - watch/dismiss/escalate

8. Map-First UI
   - show scored clusters on a Gulf Coast map
   - click into parcel cluster, signal timeline, evidence drawer, entity graph, infrastructure proximity, and recommended action

9. Analyst Review Workflow
   - mark alerts as valid, false positive, duplicate, merge, split, watch, dismissed, or escalated
   - capture user feedback to improve scoring

10. Weekly Brief Generator
   - generate corridor-level investor brief with top changes, new alerts, upgraded probabilities, and recommended actions

## 9. MVP Scope

### MVP Goal

Deliver a working system that identifies likely industrial project formation in one or two Gulf Coast corridors using only public/free sources, with enough evidence for an investor/developer to act.

### MVP Geography

Recommended:

- Louisiana river corridor and Lake Charles first:
  - Ascension
  - St. James
  - Calcasieu
  - Cameron
  - Plaquemines
  - St. Bernard
  - East Baton Rouge
  - Iberville

Reason:

- known industrial demand
- LED/ITEP signals
- LDEQ and USACE signals
- existing local memory and parcel-source work
- manageable parish-by-parish parcel ingestion

### MVP Data Sources

Must include:

- LED FastLane / ITEP
- LDEQ EDMS / public notices
- USACE New Orleans public notices
- parish parcel and assessor/GIS layers for 3-5 launch parishes
- Louisiana SOS entity lookups where feasible
- SEC EDGAR filings for watchlisted sponsors and sector terms
- FERC eLibrary for LNG/pipeline/power-related projects
- LPSC dockets
- USGS/BTS/HIFLD base infrastructure layers

Should include:

- local parish council and planning/zoning agendas
- port authority agendas and minutes
- SAM.gov and USAspending for confirmation/procurement signals
- EMMA/bond disclosures

Not MVP:

- paid parcel aggregators
- paid corporate ownership databases
- paid bid-intelligence products
- automated paid deed downloads
- paid satellite imagery

## 10. Quiet Land Assembly Detector

This is the highest-leverage feature.

### Detection Rule

Flag a possible quiet industrial land assembly when:

- same buyer or related buyer entities acquire, lease, or appear to control 200+ acres
- acquisitions occur within 24 months
- parcels are contiguous or within 0.5-2 miles
- site is near at least two industrial-enabling assets:
  - rail
  - port
  - interstate
  - high-voltage transmission
  - substation
  - pipeline
  - navigable water
  - industrial zoning
  - major existing industrial cluster
- buyer is newly formed, opaque, out-of-state, project-like, or linked to known industrial sponsors
- no matching public announcement already explains the land control

### Scoring Components

- acreage score
- contiguity score
- acquisition velocity score
- infrastructure proximity score
- industrial zoning / land-use score
- buyer opacity score
- entity relatedness score
- price premium score where sale price is available
- public announcement penalty
- contradictory evidence penalty

### Alert Output

Each alert should include:

- suspected project/site name
- parish/county
- score
- stage
- confidence
- detected control acreage
- parcel count
- acquisition window
- buyer entities
- related registered agents/officers/addresses
- nearest rail/port/interstate/power/pipeline
- zoning/flood/wetlands flags
- source evidence
- recommended investor/developer action

## 11. Project Formation Score

Use a 0-100 score. Suggested thresholds:

- 90-100: likely active industrial project formation
- 75-89: strong site-control or permitting signal
- 60-74: watchlist with multiple corroborating signals
- 40-59: weak or early signal needing review
- below 40: background noise

Suggested signal weights:

- land control / parcel assembly: 25
- environmental/wetlands/coastal permit: 15
- incentive filing: 15
- utility/power/FERC signal: 15
- entity formation / opacity / relatedness: 10
- port/local-agenda signal: 8
- SEC/corporate disclosure: 7
- procurement/engineering signal: 5

Weights should be calibrated through backtesting.

## 12. Backtesting Plan

Backtest 10 known projects and ask: what could have been detected earlier using only free sources?

Candidate backtest set:

- Woodside Louisiana LNG
- Hyundai Steel Donaldsonville / Ascension
- Meta / Entergy Richland Parish data-center power infrastructure
- Louisiana International Terminal
- major Lake Charles LNG/petrochemical expansions
- hydrogen/ammonia projects in the Mississippi River corridor
- large Texas Gulf Coast chemical or LNG projects
- Mobile or Pascagoula port/industrial expansions
- major transmission/generation projects tied to industrial load
- known port terminal or dredging projects

For each:

- public announcement date
- earliest land-control signal
- earliest entity signal
- earliest permit signal
- earliest incentive signal
- earliest utility/FERC signal
- earliest SEC/corporate signal
- earliest local/port-agenda signal
- lead time in days
- false-positive risks
- what recommendation would have been sent to an investor

## 13. User Experience

### First Screen

Map-first. Not a generic dashboard.

Primary layout:

- Gulf Coast map
- scored site clusters
- alert list sorted by score and change
- filters by corridor, stage, source, project type, acreage, and confidence
- right-side evidence/action panel

### Alert Detail

Tabs:

1. Summary
2. Map / Parcels
3. Signal Timeline
4. Entity Graph
5. Infrastructure
6. Source Evidence
7. Recommended Actions
8. Analyst Notes

### Recommended Actions

Actions must be specific and operational:

- Call adjacent landowners for parcels X, Y, Z
- Watch the next Board of Commerce & Industry meeting
- Pull zoning and wetlands constraints before pursuing option
- Monitor TCEQ/LDEQ permit number X
- Add sponsor/entity to watchlist
- Escalate for broker outreach
- Build target assemblage map
- Pass due to wetlands/flood/power constraint

## 14. Technical Architecture

Suggested stack:

- Postgres + PostGIS for parcels, sites, geometry, source records, and signal graph
- object storage for raw evidence snapshots
- background jobs for source ingestion and document parsing
- queue-based extraction pipeline
- LLM extraction with structured JSON schema and evidence pointers
- map frontend using MapLibre or similar
- internal admin/review interface
- alerting via email initially

Core tables:

- `source_registry`
- `source_runs`
- `raw_documents`
- `extracted_claims`
- `entities`
- `entity_relationships`
- `parcels`
- `parcel_snapshots`
- `sites`
- `site_parcels`
- `signals`
- `projects`
- `project_milestones`
- `alerts`
- `recommended_actions`
- `analyst_reviews`
- `watchlists`

## 15. Acceptance Criteria

MVP is complete when:

- at least 3 launch parishes/counties have parcel/GIS ingestion
- at least 6 public-source lanes are ingested on a schedule
- every signal links to raw source evidence
- AI extraction returns structured claims with confidence and excerpts
- project formation score is calculated and visible
- quiet land assembly detector produces site-cluster alerts
- map UI shows clusters, parcels, infrastructure proximity, signal timeline, and recommended action
- analyst can dismiss/watch/escalate/merge/split alerts
- weekly investor brief can be generated from live alert state
- backtest report shows lead-time performance across at least 5 known projects

## 16. Risks and Mitigations

### Risk: free parcel data is inconsistent

Mitigation:

- start parish/county-by-parish/county
- store source quality and coverage
- support manual review
- allow source-specific adapters

### Risk: false positives from ordinary land transactions

Mitigation:

- require multi-signal corroboration above high thresholds
- penalize low-infrastructure-fit sites
- add human review workflow
- backtest known false positives

### Risk: entity resolution is hard

Mitigation:

- start with deterministic matching
- expose entity evidence rather than hiding it
- let analysts confirm/deny relationships
- store confidence per relationship

### Risk: public records lag reality

Mitigation:

- combine multiple weak signals
- track observed date and document date
- disclose lag per source

### Risk: legal/terms issues with scraping

Mitigation:

- maintain source registry with terms and allowed methods
- prefer APIs and open-data endpoints
- throttle responsibly
- do not bypass access controls
- exclude paid or restricted sources from MVP

## 17. Roadmap

### Phase 0: Source and Backtest Setup

- create source registry
- select launch parishes/counties
- build backtest dataset
- ingest base infrastructure layers
- define scoring schema

### Phase 1: Evidence Pipeline

- ingest LED/ITEP, LDEQ, USACE, SEC, parish parcels, and base infrastructure
- preserve raw evidence
- build structured extraction

### Phase 2: Site and Signal Graph

- unify parcel snapshots
- build entity resolution
- build signal-to-site matching
- compute site/project formation score

### Phase 3: Quiet Land Assembly MVP

- detect parcel clusters
- score buyer opacity and infrastructure proximity
- generate alerts with evidence

### Phase 4: Investor UI

- map-first alert UI
- evidence drawer
- signal timeline
- recommended actions
- watchlists

### Phase 5: Weekly Brief and Feedback Loop

- weekly investor/developer brief
- analyst review workflow
- backtest/eval dashboard

### Phase 6: Contractor Expansion

- add EPC/procurement workflows
- SAM.gov and USAspending become more prominent
- contractor-specific next actions and bid-prep recommendations

## 18. First Build Task List

1. Create source registry schema and seed the verified public/free sources above.
2. Create raw evidence archive model and storage path.
3. Build LED FastLane/ITEP ingestion adapter.
4. Build LDEQ EDMS/public notice adapter.
5. Build USACE New Orleans public notice adapter.
6. Build SEC EDGAR keyword/watchlist adapter.
7. Build parcel adapter for one high-value parish.
8. Build base infrastructure ingestion for USGS/BTS/HIFLD-compatible layers.
9. Implement structured AI extraction schema for industrial-project signals.
10. Implement `site`, `signal`, `entity`, `parcel`, and `project` tables.
11. Implement deterministic entity normalization and relationship rules.
12. Implement quiet land assembly cluster detection.
13. Implement first project formation score.
14. Build map-first internal UI.
15. Add evidence drawer and signal timeline.
16. Add recommended-action engine for investor/developer use cases.
17. Add analyst review states.
18. Run 5-project backtest.
19. Tune scoring thresholds.
20. Generate first weekly investor brief.

## 19. Open Questions

- Which launch corridor should be the first paid-user wedge: Louisiana river corridor, Lake Charles, or Houston/Beaumont?
- Are public parcel exports allowed for each target parish/county, or only viewer/API access?
- Should the first UI be built inside an existing GPC app or as a standalone prototype?
- What is the acceptable alert frequency: daily, weekly, or critical-only?
- Should alerts be sold as SaaS, a weekly intelligence product, or a hybrid analyst-assisted service?

## 20. Source Links

- LED FastLane: https://www.opportunitylouisiana.gov/incentive/incentives-management-system-fastlane
- Louisiana ITEP: https://www.opportunitylouisiana.gov/incentive/industrial-tax-exemption
- LDEQ EDMS: https://www.deq.louisiana.gov/page/edms
- LDEQ public records: https://deq.louisiana.gov/page/information-records
- USACE New Orleans public notices: https://www.mvn.usace.army.mil/Public-Notices/
- SEC EDGAR APIs: https://www.sec.gov/edgar/sec-api-documentation
- FERC eLibrary: https://www.ferc.gov/ferc-online/elibrary
- SAM.gov contracting: https://sam.gov/contracting
- SAM.gov Opportunities API: https://open.gsa.gov/api/get-opportunities-public-api/
- USAspending API: https://api.usaspending.gov/
- EMMA / MSRB: https://www.msrb.org/Transparency-and-Technology/About-EMMA
- TCEQ pending air permits: https://www.tceq.texas.gov/permitting/air/airpermit-applications-notices
- TCEQ air permitting: https://www.tceq.texas.gov/permitting/air/air_permits.html
- Texas JETI: https://comptroller.texas.gov/economy/development/prop-tax/jeti/
- Texas JETI public listing: https://gov.texas.gov/uploads/files/business/JETI_Public_Listing.pdf
- Railroad Commission of Texas GIS data: https://www.rrc.texas.gov/about-us/faqs/general-faq/digital-map-information-gis-data/
- USGS National Map: https://www.usgs.gov/tools/download-data-maps-national-map
- USGS Transportation MapServer: https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer
- BTS NTAD update: https://www.bts.gov/newsroom/bts-updates-datasets-national-transportation-atlas-database-winter-2025
- HIFLD: https://www.dhs.gov/gmo/hifld
- Data.gov electric substations: https://catalog.data.gov/dataset/electric-substations-c633a
- East Baton Rouge GIS: https://www.brla.gov/827/Maps-Apps
- EBR parcel ArcGIS item: https://www.arcgis.com/home/item.html?id=b961ea0510d04a2b86fa0ca55a79e8a7
- Ascension Parish GIS: https://www.ascensionparish.net/geographic-information-system-gis-division/
- Ascension parcel FeatureServer: https://gis.ascensionparishla.gov/server/rest/services/AssessorData/Assessor_Parcels/FeatureServer/layers
- Calcasieu Assessor GIS map: https://calcasieuassessor.org/app/clientpages/calcasieu/maps.html
- LightBox: https://www.lightboxre.com/
- LightBox Vision: https://www.lightboxre.com/data/lightbox-vision/
- LightBox Parcels API: https://developer.lightboxre.com/apis/parcels
- Reonomy: https://www.reonomy.com/
- LandVision Site Profile Report: https://support.digmap.com/onlinehelp/landvision/site-profile-report.html
