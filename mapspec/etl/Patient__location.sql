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
    state,
    county,
    zip,
    location_source_value
FROM (
    -- Match reference ETL-Synthea: dedupe by (city, state, zip) only — keeps
    -- the location count at ~386 instead of ~1169 unique street addresses.
    -- address_1 (street line) is intentionally NULL here.
    SELECT DISTINCT
        NULL::text      AS address_1,
        NULL::text      AS address_2,
        v.address_city  AS city,
        v.address_state AS state,
        NULL::text      AS county,
        v.address_zip   AS zip,
        v.address_zip   AS location_source_value
    FROM staging.patient_person v
    WHERE v.address_city IS NOT NULL
       OR v.address_state IS NOT NULL
       OR v.address_zip IS NOT NULL
) addresses
;
