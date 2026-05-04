CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN
    ALTER EXTENSION unaccent SET SCHEMA extensions;
  END IF;
END $$;

ALTER TABLE IF EXISTS public._prisma_migrations ENABLE ROW LEVEL SECURITY;
