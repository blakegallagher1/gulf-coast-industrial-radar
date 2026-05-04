---
title: Supabase PostGIS extension hygiene
status: active
updated: 2026-05-01
---

# Supabase PostGIS extension hygiene

Supabase Security Advisor can report `postgis`, `spatial_ref_sys`, and
`st_estimatedextent` as extension-owned artifacts in `public`.

For fresh databases, the repo installs PostGIS in the `extensions` schema via
`packages/db/prisma/migrations/0_init_postgis/migration.sql`.

For the existing Supabase project, PostGIS was originally installed in
`public`. PostGIS 2.3+ is not safely relocatable with:

```sql
ALTER EXTENSION postgis SET SCHEMA extensions;
```

Supabase's current PostGIS documentation says the support-assisted remediation
path is:

- contact Supabase Support and ask them to run their catalog-assisted PostGIS
  relocation sequence.

This project used a project-local safe path instead because the live database
had zero parcel/site rows and zero geometry values when the migration was
applied:

1. guard that `Parcel.geom` and `Site.geom` have no non-null geometry data;
2. drop only those two application geometry columns;
3. drop the public PostGIS extension;
4. recreate PostGIS in `extensions`;
5. recreate the two geometry columns as `extensions.geometry(MultiPolygon, 4326)`.

Do not add a quick Prisma migration that runs `DROP EXTENSION postgis CASCADE`
against production. That can drop dependent geometry columns/data.

If this ever needs to be repeated after geometry data exists, use Supabase
Support or a planned backup/export/recreate/restore path instead of this
empty-column migration pattern.
