/**
 * Gulf Coast launch geography — parishes, counties, corridors.
 * Mirrors knowledge/strategy/market-research-and-gtm.md and
 * knowledge/sources/public-source-research-map.md.
 */

export type ParishCounty = {
  name: string;
  state: "LA" | "TX" | "MS" | "AL" | "FL";
  corridor: Corridor;
  centerLat: number;
  centerLng: number;
  /** Public parcel-source slug (matches Source.slug when ingested). */
  parcelSourceSlug?: string;
};

export type Corridor =
  | "Ascension / River corridor"
  | "St. James / St. John"
  | "St. Charles"
  | "Plaquemines / Lower Miss"
  | "Calcasieu / Cameron"
  | "EBR · Iberville · WBR"
  | "Houston Ship Channel / TX"
  | "Mobile / Baldwin / AL"
  | "Pascagoula / Gulfport / MS";

export const CORRIDORS: Corridor[] = [
  "Ascension / River corridor",
  "Plaquemines / Lower Miss",
  "Calcasieu / Cameron",
  "St. James / St. John",
  "St. Charles",
  "EBR · Iberville · WBR",
  "Houston Ship Channel / TX",
  "Mobile / Baldwin / AL",
  "Pascagoula / Gulfport / MS",
];

export const LAUNCH_PARISHES: ParishCounty[] = [
  { name: "Ascension",          state: "LA", corridor: "Ascension / River corridor", centerLat: 30.099, centerLng: -90.992, parcelSourceSlug: "ascension-assessor" },
  { name: "St. James",          state: "LA", corridor: "St. James / St. John",       centerLat: 30.030, centerLng: -90.780 },
  { name: "Iberville",          state: "LA", corridor: "EBR · Iberville · WBR",     centerLat: 30.225, centerLng: -91.351 },
  { name: "St. John the Baptist", state: "LA", corridor: "St. James / St. John",     centerLat: 30.057, centerLng: -90.480 },
  { name: "St. Charles",        state: "LA", corridor: "St. Charles",                centerLat: 29.999, centerLng: -90.408 },
  { name: "Plaquemines",        state: "LA", corridor: "Plaquemines / Lower Miss",   centerLat: 29.476, centerLng: -89.687 },
  { name: "St. Bernard",        state: "LA", corridor: "Plaquemines / Lower Miss",   centerLat: 29.870, centerLng: -89.832 },
  { name: "East Baton Rouge",   state: "LA", corridor: "EBR · Iberville · WBR",     centerLat: 30.452, centerLng: -91.143, parcelSourceSlug: "ebr-gis" },
  { name: "Calcasieu",          state: "LA", corridor: "Calcasieu / Cameron",        centerLat: 30.226, centerLng: -93.217, parcelSourceSlug: "calcasieu-assessor" },
  { name: "Cameron",            state: "LA", corridor: "Calcasieu / Cameron",        centerLat: 29.798, centerLng: -93.318 },
  { name: "Jefferson, TX",      state: "TX", corridor: "Houston Ship Channel / TX",  centerLat: 30.080, centerLng: -94.101 },
  { name: "Cameron, TX",        state: "TX", corridor: "Houston Ship Channel / TX",  centerLat: 25.994, centerLng: -97.212 },
  { name: "Mobile",             state: "AL", corridor: "Mobile / Baldwin / AL",       centerLat: 30.694, centerLng: -88.043 },
  { name: "Jackson, MS",        state: "MS", corridor: "Pascagoula / Gulfport / MS",  centerLat: 30.366, centerLng: -88.556 },
];

/** Industrial-enabling assets, used by the site-fit and quiet-land-assembly scoring. */
export type InfraAsset = {
  kind:
    | "rail"
    | "port"
    | "interstate"
    | "transmission"
    | "substation"
    | "pipeline"
    | "navigable_water"
    | "industrial_zoning"
    | "industrial_cluster";
  weight: number;
};

export const INFRA_WEIGHTS: Record<InfraAsset["kind"], number> = {
  rail: 1.0,
  port: 1.2,
  interstate: 0.8,
  transmission: 0.9,
  substation: 1.0,
  pipeline: 0.7,
  navigable_water: 1.1,
  industrial_zoning: 0.8,
  industrial_cluster: 1.0,
};
