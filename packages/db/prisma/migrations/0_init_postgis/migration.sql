-- Enable PostGIS so geometry(MultiPolygon, 4326) columns compile.
-- This migration runs first; Prisma's own DDL migrations follow.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
