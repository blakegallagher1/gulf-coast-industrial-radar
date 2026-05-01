/**
 * PostGIS helpers — Prisma's `Unsupported("geometry(...)")` columns can't be
 * read or written through the standard client API, so we emit raw SQL.
 *
 * Convention: every geometry column is SRID 4326 (WGS-84 lat/lng).
 */

import { prisma } from "./index";

/** Convert a GeoJSON polygon / multipolygon to PostGIS geometry text. */
export function toGeoSql(geojson: unknown): string {
  return JSON.stringify(geojson);
}

/** Update a parcel's geometry from GeoJSON. */
export async function setParcelGeometry(
  parcelId: string,
  geojson: GeoJSON.MultiPolygon | GeoJSON.Polygon,
): Promise<void> {
  const text = toGeoSql(
    geojson.type === "MultiPolygon"
      ? geojson
      : { type: "MultiPolygon", coordinates: [geojson.coordinates] },
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "Parcel" SET geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) WHERE id = $2`,
    text,
    parcelId,
  );
}

/** Set a site's footprint geometry. */
export async function setSiteGeometry(
  siteId: string,
  geojson: GeoJSON.MultiPolygon,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "Site" SET geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) WHERE id = $2`,
    JSON.stringify(geojson),
    siteId,
  );
}

/** All parcels within `radiusMeters` of a lat/lng. */
export async function parcelsWithinRadius(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<{ id: string; parcelNumber: string; acres: number | null }[]> {
  return prisma.$queryRawUnsafe(
    `SELECT id, "parcelNumber", acres
     FROM "Parcel"
     WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`,
    lng,
    lat,
    radiusMeters,
  );
}

/** Sum acreage across a set of parcel ids and return the convex hull. */
export async function assemblageStats(parcelIds: string[]): Promise<{
  totalAcres: number;
  contiguousAcres: number;
  envelope: GeoJSON.Polygon | null;
}> {
  if (parcelIds.length === 0) {
    return { totalAcres: 0, contiguousAcres: 0, envelope: null };
  }
  const rows: { total_acres: number | null; envelope: string | null }[] =
    await prisma.$queryRawUnsafe(
      `SELECT
         COALESCE(SUM(acres),0)::float AS total_acres,
         ST_AsGeoJSON(ST_ConvexHull(ST_Collect(geom)))::text AS envelope
       FROM "Parcel"
       WHERE id = ANY($1::text[])`,
      parcelIds,
    );
  const r = rows[0];
  return {
    totalAcres: r?.total_acres ?? 0,
    contiguousAcres: r?.total_acres ?? 0,
    envelope: r?.envelope ? JSON.parse(r.envelope) : null,
  };
}
