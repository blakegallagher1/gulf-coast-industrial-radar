# 2026-04-30 — Live HTTP probes of 4 uncertain sources

This file resolves the `TODO(phase3.1)` flags on `parcel-ebr.ts`,
`parcel-calcasieu.ts`, `ldeq-edms.ts`, and `emma-msrb.ts`. The earlier
sonar-pro research artifacts were partially wrong; these are findings
from actual `curl` calls against the live endpoints.

## EBR — verified ✅

**Canonical endpoint:**
`https://maps.brla.gov/gis/rest/services/Cadastral/Tax_Parcel/MapServer/0`

Discovered via the EBR Open Data hub `api/search/v1/collections/dataset/items?q=tax+parcel`
(`https://data-ebrgis.opendata.arcgis.com/...`) which returns one result
pointing at the maps.brla.gov server. The legacy on-prem GIS is up and
serving public anonymous traffic. The ArcGIS-Online portal at
`data-ebrgis.opendata.arcgis.com` is just a metadata catalogue.

**Real field schema** (verified via `?f=json` on the layer):

| Field | Type | Notes |
|---|---|---|
| `ID` | OID | |
| `ASSESSMENT_NUM` | string | parcel ID — was `ASMT` |
| `PRONO` | integer | property number |
| `OWNER` | string | owner name (correct) |
| `OWNER_ADDRESS` / `OWNER_CITY_STATE_ZIP` | string | mailing address |
| `PHYSICAL_ADDRESS` | string | |
| `SUBDIVISION` / `WARD_SECTION` / `LOT` / `BLOCK` | string | |
| `LEGAL_DESCRIPTION` | string | |
| `FLOOD_ZONE` | string | |
| `SALE_YEAR` | string | only sale info — no DATE / PRICE |
| `STATUS` | string | |
| `SUM_FAIR_MARKET_VALUE`, `SUM_ASSESSED_VALUE` | double | |
| `GEOMETRY` | polygon | |

**Fields that DON'T exist on this layer:** `ACRES`, `ZONING`, `SALE_DATE`,
`SALE_PRICE`, `LAST_EDIT`, `LAST_UPDATE`. Adapter assumptions were wrong
across the board; rewritten to use the real schema.

## Calcasieu — verified ✅ (different host)

**Canonical endpoint:**
`https://lak-dc-arcgis.cppj.net/arcgis/rest/services/HubLayers/Parcels/FeatureServer/0`

The previously-documented host `gis.calcasieuassessor.org` is offline (DNS
or TLS fails — `curl` exit 56). Found the live layer via ArcGIS Online
search for `parcel calcasieu`; the official CPPJ account `giscppj`
publishes the public Parcels FeatureService used by their Hub site at
`gis.calcasieu.gov`.

**Real field schema:**

| Field | Notes |
|---|---|
| `PIN` (string) | parcel ID — was `PARCEL_ID` |
| `NAME` (string) | owner name — was `OWNER` |
| `ADDRESS1` / `ADDRESS2` | owner mailing |
| `ASSESSMENT` (string) | |
| `PHYSICALAD` (string) | physical address (truncated field name) |
| `WARD` | |
| `DATE_` (string) | record / assessment date as string |
| `ZONE` (string) | zoning code — was `ZONING` |
| `Zn_Descr`, `PRIOR_ZONI`, `ZONE_DATE_` (date), `ORD_NO` | zoning history |
| `Shape__Area`, `Shape__Length` | geometry metrics (sq ft / state plane) |

**Fields that DON'T exist:** `SALE_DATE`, `SALE_PRICE`, `OWNER` (it's
`NAME`), `ACRES` (computed from `Shape__Area / 43_560`).

## LDEQ EDMS — auth-gated ⚠️

**Real API base:** `https://edms.deq.louisiana.gov/ASC.API.EDMS.Services/`

Discovered by inspecting the public Angular SPA bundle at `/edmsv2/main.*.js`
and the public config endpoint
`GET /edmsv2/account/GetUIAppSettings` (returns `apiCoreServiceURL`).

**All search endpoints return HTTP 401 anonymous:**

- `POST .../api/document/docSearch` → 401
- `POST .../api/document/Search` → 401
- `GET .../api/document/GetByAiNumber?aiNumber=…` → 401
- `POST /edmsv2/account/signin {username:"public",password:""}` → 500

The previously-documented `/app/svcs/Search.svc/SearchAdvanced` returns
HTTP 500 with empty body — that path does not exist.

The SPA itself works in a browser because it bootstraps a session cookie
on first GET to `/edmsv2/`. There is no documented anonymous machine
flow.

**Adapter status:** `implemented: false`. The adapter still pings
`/edmsv2/account/GetUIAppSettings` each tick to confirm reachability and
surface any LDEQ banner notice. Real ingestion path is deferred to a
Playwright-driven flow OR HTML scrape of `/app/EDMS_Search.aspx` (which
returns HTTP 200 with the legacy ASP.NET form).

## EMMA — no public feed surface ⚠️

**The `/Feeds/RecentDisclosure.aspx?state=…` URLs DO NOT EXIST.** Every
state variant returns HTTP 404 (with a real browser User-Agent — without
one, EMMA returns 403 to bots wholesale). This was a hallucination in the
earlier research artifact.

EMMA is ASP.NET WebForms. The public Recent Continuing Disclosures
listing is at `https://emma.msrb.org/MarketActivity/RecentCD` — rendered
via a server-postback grid that requires JS pagination. There is no RSS,
no JSON, no XML feed.

**Bulk machine-readable access requires the paid MSRB product:**
`https://www.msrb.org/Market-Data-and-Research/Continuing-Disclosure-Subscription`
(annual subscription, not free).

**Adapter status:** `implemented: false`. For LA-specific IDB
authorisations the recommended free path is the LA Bond Commission
agenda adapter (PDF agendas — separate source). EMMA stays in the
registry so the source health UI and a future Playwright migration have a
home, but it produces zero records under the free-data constraint.

## Net result

| slug | status | runtime behaviour |
|---|---|---|
| ebr-gis | ✅ ACTIVE | live-probed, fields rewritten, paginated full snapshot |
| calcasieu-assessor | ✅ ACTIVE | live-probed (CPPJ host), fields rewritten, paginated full snapshot |
| ldeq-edms | ⚠️ TODO | pings public app-settings endpoint each tick; emits 0 records until Playwright lands |
| emma-msrb | ⚠️ TODO | emits 0 records; route IDB intel through LA Bond Commission agenda instead |

All four `TODO(phase3.1)` flags are now resolved with concrete decisions
and live-verified URLs.
