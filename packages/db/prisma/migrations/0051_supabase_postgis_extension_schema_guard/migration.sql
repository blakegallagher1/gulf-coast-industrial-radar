CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
DECLARE
  postgis_schema text;
  dependent_geometry_columns integer;
BEGIN
  SELECT n.nspname
    INTO postgis_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'postgis';

  IF postgis_schema IS NULL THEN
    CREATE EXTENSION postgis WITH SCHEMA extensions;
  ELSIF postgis_schema = 'public' THEN
    SELECT count(*)
      INTO dependent_geometry_columns
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace table_schema ON table_schema.oid = c.relnamespace
    JOIN pg_type t ON t.oid = a.atttypid
    JOIN pg_namespace type_schema ON type_schema.oid = t.typnamespace
    WHERE NOT a.attisdropped
      AND a.attnum > 0
      AND c.relkind IN ('r', 'p')
      AND table_schema.nspname NOT IN ('pg_catalog', 'information_schema')
      AND type_schema.nspname = 'public'
      AND t.typname IN ('geometry', 'geography');

    IF dependent_geometry_columns = 0 THEN
      DROP EXTENSION postgis;
      CREATE EXTENSION postgis WITH SCHEMA extensions;
    ELSE
      RAISE NOTICE 'PostGIS is installed in public with % dependent geometry/geography column(s). Supabase/PostGIS 2.3+ does not support safe ALTER EXTENSION SET SCHEMA relocation; use Supabase Support or planned backup/drop/recreate remediation.', dependent_geometry_columns;
    END IF;
  END IF;
END $$;
