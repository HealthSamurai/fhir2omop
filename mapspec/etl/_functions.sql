-- Shared helper functions for stage-2 ETL.
-- Apply once: `psql … -f mapspec/etl/_functions.sql`
-- Idempotent (CREATE OR REPLACE).

-- referenceToId(ref text) -> bigint
-- Maps a FHIR reference key (bare UUID or empty) to the deterministic
-- 64-bit hash used as a surrogate _id in cdm_ours_fhir.*.
-- Returns NULL for NULL or empty input so LEFT JOINs stay clean.
CREATE OR REPLACE FUNCTION referenceToId(ref text) RETURNS bigint
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT CASE WHEN ref IS NULL OR ref = '' THEN NULL
                ELSE hashtextextended(ref, 0)::bigint
           END
$$;
