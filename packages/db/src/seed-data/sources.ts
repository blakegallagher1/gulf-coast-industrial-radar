/**
 * Source registry — 17 jurisdictions across LA / TX / federal
 *
 * Live-probed 2026-04-30:
 *   - ebr-gis        → maps.brla.gov (was arcgis.brla.gov)
 *   - calcasieu      → CPPJ FeatureService (calcasieuassessor.org offline)
 *   - ldeq-edms      → TODO (auth-gated, anonymous bulk unsupported)
 *   - emma-msrb      → TODO (no public RSS surface; paid subscription only)
 */

import {
  SignalFamily,
  AccessMethod,
  SourceCadence,
  SourceStatus,
} from "../index";

export const sources = [
  {
    slug: "led-fastlane",
    name: "LED FastLane / IMS",
    jurisdiction: "Louisiana · LED",
    state: "LA",
    family: SignalFamily.INCENTIVE,
    url: "https://opportunitylouisiana.gov",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.HTTP_API,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "la-itep",
    name: "Louisiana ITEP",
    jurisdiction: "Louisiana · LED",
    state: "LA",
    family: SignalFamily.INCENTIVE,
    url: "https://opportunitylouisiana.gov",
    cadence: SourceCadence.WEEKLY,
    accessMethod: AccessMethod.HTML_SCRAPE,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "la-bd-ci",
    name: "Louisiana Board of Commerce & Industry",
    jurisdiction: "Louisiana · LED",
    state: "LA",
    family: SignalFamily.INCENTIVE,
    url: "https://www.opportunitylouisiana.com",
    cadence: SourceCadence.MONTHLY,
    accessMethod: AccessMethod.PDF_AGENDA,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "ldeq-edms",
    name: "LDEQ EDMS & public notices",
    jurisdiction: "Louisiana · LDEQ",
    state: "LA",
    family: SignalFamily.ENVIRONMENTAL_PERMIT,
    url: "https://edms.deq.louisiana.gov",
    cadence: SourceCadence.HOURLY,
    accessMethod: AccessMethod.HTML_SCRAPE,
    // 2026-04-30 live probe: EDMS API is auth-gated; anonymous bulk search
    // unsupported. Adapter is `implemented: false` until Playwright lands.
    status: SourceStatus.TODO,
  },
  {
    slug: "usace-mvn",
    name: "USACE New Orleans · public notices",
    jurisdiction: "Federal · USACE MVN",
    state: "US",
    family: SignalFamily.ENVIRONMENTAL_PERMIT,
    url: "https://www.mvn.usace.army.mil",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.HTML_SCRAPE,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "lpsc",
    name: "LPSC docket portal",
    jurisdiction: "Louisiana · LPSC",
    state: "LA",
    family: SignalFamily.UTILITY_POWER,
    url: "https://lpscpubvalence.lpsc.louisiana.gov",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.HTML_SCRAPE,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "la-sos",
    name: "Louisiana SOS · entity",
    jurisdiction: "Louisiana · SOS",
    state: "LA",
    family: SignalFamily.ENTITY_FORMATION,
    url: "https://coraweb.sos.la.gov",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.HTML_SCRAPE,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "ascension-assessor",
    name: "Ascension Assessor + GIS",
    jurisdiction: "Ascension Parish",
    state: "LA",
    family: SignalFamily.LAND_CONTROL,
    url: "https://gis.ascensionparish.net",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.ARCGIS_REST,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "ebr-gis",
    name: "EBR GIS — Cadastral/Tax_Parcel",
    jurisdiction: "East Baton Rouge",
    state: "LA",
    family: SignalFamily.LAND_CONTROL,
    // 2026-04-30 live-probe: canonical layer at maps.brla.gov, not arcgis.brla.gov
    url: "https://maps.brla.gov/gis/rest/services/Cadastral/Tax_Parcel/MapServer/0",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.ARCGIS_REST,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "calcasieu-assessor",
    name: "Calcasieu CPPJ — Parcels FeatureService",
    jurisdiction: "Calcasieu Parish · CPPJ GIS",
    state: "LA",
    family: SignalFamily.LAND_CONTROL,
    // 2026-04-30 live-probe: gis.calcasieuassessor.org is offline; the
    // public parcel layer is published by CPPJ on lak-dc-arcgis.cppj.net.
    url: "https://lak-dc-arcgis.cppj.net/arcgis/rest/services/HubLayers/Parcels/FeatureServer/0",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.ARCGIS_REST,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "tceq",
    name: "TCEQ pending air permits",
    jurisdiction: "Texas · TCEQ",
    state: "TX",
    family: SignalFamily.ENVIRONMENTAL_PERMIT,
    url: "https://www.tceq.texas.gov",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.HTML_SCRAPE,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "tx-jeti",
    name: "TX JETI · public listing",
    jurisdiction: "Texas · Comptroller",
    state: "TX",
    family: SignalFamily.INCENTIVE,
    url: "https://comptroller.texas.gov",
    cadence: SourceCadence.MONTHLY,
    accessMethod: AccessMethod.HTML_SCRAPE,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "sec-edgar",
    name: "SEC EDGAR · APIs / bulk JSON",
    jurisdiction: "Federal · SEC",
    state: "US",
    family: SignalFamily.PUBLIC_COMPANY,
    url: "https://data.sec.gov",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.HTTP_API,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "ferc-elibrary",
    name: "FERC eLibrary",
    jurisdiction: "Federal · FERC",
    state: "US",
    family: SignalFamily.UTILITY_POWER,
    url: "https://elibrary.ferc.gov",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.HTML_SCRAPE,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "sam-gov",
    name: "SAM.gov · Opportunities + Awards",
    jurisdiction: "Federal · GSA",
    state: "US",
    family: SignalFamily.PROCUREMENT,
    url: "https://api.sam.gov",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.HTTP_API,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "emma-msrb",
    name: "EMMA / MSRB",
    jurisdiction: "Federal · MSRB",
    state: "US",
    family: SignalFamily.FINANCING,
    url: "https://emma.msrb.org/MarketActivity/RecentCD",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.HTML_SCRAPE,
    // 2026-04-30 live-probe: no public RSS/JSON feed surface. Bulk
    // machine-readable access requires the paid MSRB Continuing Disclosure
    // Subscription. Adapter is `implemented: false` until Playwright lands
    // OR we route around EMMA via the LA Bond Commission agenda adapter.
    status: SourceStatus.TODO,
  },
  {
    slug: "la-bond-commission",
    name: "LA Bond Commission · agendas",
    jurisdiction: "Louisiana · DOA",
    state: "LA",
    family: SignalFamily.FINANCING,
    url: "https://www.doa.la.gov/doa/sbc",
    cadence: SourceCadence.WEEKLY,
    accessMethod: AccessMethod.PDF_AGENDA,
    status: SourceStatus.ACTIVE,
  },
] as const;

export type SourceSeed = (typeof sources)[number];
