-- Shared helper functions for stage-2 ETL.
-- Apply once: `psql … -f mapspec/etl/_functions.sql`
-- Idempotent (CREATE OR REPLACE).

-- stringToId(s text) -> bigint
-- Deterministic 64-bit hash used as a surrogate _id in cdm_ours_fhir.*.
-- Returns NULL for NULL or empty input so LEFT JOINs stay clean.
-- Use directly when the surrogate key is a composite of multiple
-- columns (e.g. address dedup: stringToId(concat_ws('|', line, city, state, zip))).
CREATE OR REPLACE FUNCTION stringToId(s text) RETURNS bigint
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT CASE WHEN s IS NULL OR s = '' THEN NULL
                ELSE hashtextextended(s, 0)::bigint
           END
$$;

-- referenceToId(ref text) -> bigint
-- Specialization of stringToId for a FHIR reference key (bare UUID or
-- empty). Same hash function, separate name to make intent obvious at
-- the call site and to allow per-purpose tweaks later (e.g. handling
-- 'urn:uuid:' prefixes).
CREATE OR REPLACE FUNCTION referenceToId(ref text) RETURNS bigint
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT stringToId(ref)
$$;
