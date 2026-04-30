/**
 * PostGIS helper utilities
 * Wraps raw SQL for geometry operations that Prisma doesn’t natively support.
 */
import { prisma } from './index'

export interface LatLng {
  lat: number
  lng: number
}

/** Convert a lat/lng to a WKT Point string for PostGIS */
export function toWktPoint({ lat, lng }: LatLng): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}

/** Find signals within radius (km) of a point */
export async function signalsWithinRadius(center: LatLng, radiusKm: number) {
  const radiusM = radiusKm * 1000
  return prisma.$queryRawUnsafe<{ id: string; title: string; distance: number }[]>(
    `SELECT id, title,
       ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance
     FROM "Signal"
     WHERE location IS NOT NULL
       AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
     ORDER BY distance`,
    center.lng,
    center.lat,
    radiusM,
  )
}

/** Find projects within radius (km) of a point */
export async function projectsWithinRadius(center: LatLng, radiusKm: number) {
  const radiusM = radiusKm * 1000
  return prisma.$queryRawUnsafe<{ id: string; name: string; distance: number }[]>(
    `SELECT id, name,
       ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance
     FROM "Project"
     WHERE location IS NOT NULL
       AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
     ORDER BY distance`,
    center.lng,
    center.lat,
    radiusM,
  )
}
