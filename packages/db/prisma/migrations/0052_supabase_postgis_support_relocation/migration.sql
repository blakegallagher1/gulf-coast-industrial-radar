-- Relocate PostGIS-owned artifacts out of public for Supabase Security
-- Advisor hygiene.
--
-- The Supabase support path requires catalog writes to pg_extension, which
-- hosted project users cannot run directly. This migration uses the safe
-- project-local path for the current empty database: guard that no geometry
-- values exist, drop only the two application geometry columns, recreate
-- PostGIS in extensions, then recreate the geometry columns.

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
DECLARE
  parcel_geom_count integer;
  site_geom_count integer;
BEGIN
  SELECT count(*) INTO parcel_geom_count FROM public."Parcel" WHERE geom IS NOT NULL;
  SELECT count(*) INTO site_geom_count FROM public."Site" WHERE geom IS NOT NULL;

  IF parcel_geom_count > 0 OR site_geom_count > 0 THEN
    RAISE EXCEPTION 'Refusing to relocate PostGIS because geometry data exists: Parcel.geom=%, Site.geom=%', parcel_geom_count, site_geom_count;
  END IF;
END $$;

ALTER TABLE public."Parcel" DROP COLUMN IF EXISTS geom;
ALTER TABLE public."Site" DROP COLUMN IF EXISTS geom;

DROP EXTENSION IF EXISTS postgis;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

ALTER TABLE public."Parcel" ADD COLUMN geom extensions.geometry(MultiPolygon, 4326);
ALTER TABLE public."Site" ADD COLUMN geom extensions.geometry(MultiPolygon, 4326);
