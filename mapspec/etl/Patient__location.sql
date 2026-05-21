-- Stage-2 ETL: Patient (FHIR R4) → location (OMOP CDM v5.3)
-- Reads staging.patient_person, inserts unique addresses into cdm_ours_fhir.location.
--
-- Surrogate location_id = hashtextextended(city|state|zip, 0)::bigint.
-- The SAME expression is used inline by Patient__person.sql to resolve a
-- person's location_id FK without a JOIN.

SELECT
    hashtextextended(zip, 0)::bigint                AS location_id,
    address_1,
    address_2,
    city,
    -- Synthea outputs full state names ("Massachusetts"), OMOP wants
    -- 2-char code (varchar(2)). Keep the full name in location_source_value.
    NULL::varchar                                   AS state,
    zip,
    county,
    location_source_value,
    NULL::integer                                   AS country_concept_id,
    NULL::varchar                                   AS country_source_value,
    NULL::numeric                                   AS latitude,
    NULL::numeric                                   AS longitude
FROM (
    -- Match reference ETL-Synthea: dedupe by (city, state, zip) only — keeps
    -- the location count at ~386 instead of ~1169 unique street addresses.
    -- address_1 (street line) is intentionally NULL here.
    SELECT DISTINCT
        NULL::text      AS address_1,
        NULL::text      AS address_2,
        v.location_city  AS city,
        NULL::text      AS county,
        v.location_zip   AS zip,
        v.location_state AS location_source_value
    FROM staging.patient_person v
    WHERE v.location_city IS NOT NULL
       OR v.location_state IS NOT NULL
       OR v.location_zip IS NOT NULL
) addresses
;
