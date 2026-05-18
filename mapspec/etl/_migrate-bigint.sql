-- One-shot migration: cdm_ours_fhir.*  _id columns  INTEGER → BIGINT
--
-- Surrogate IDs are now derived deterministically from FHIR resource UUIDs
-- via `hashtextextended(uuid, 0)::bigint`. The hash output is 64-bit so the
-- columns must be BIGINT. concept_id columns stay INTEGER — those are real
-- Athena concept_ids that comfortably fit 32 bits.
--
-- Idempotent. Re-running on already-bigint columns is a no-op (Postgres
-- still rewrites the table; gate by current data_type to skip).

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name, column_name
      FROM information_schema.columns
     WHERE table_schema = 'cdm_ours_fhir'
       AND data_type    = 'integer'
       AND column_name ~ '_id$'
       AND column_name NOT LIKE '%concept_id%'
  LOOP
    EXECUTE format(
      'ALTER TABLE cdm_ours_fhir.%I ALTER COLUMN %I TYPE bigint USING %I::bigint',
      r.table_name, r.column_name, r.column_name);
  END LOOP;
END$$;
