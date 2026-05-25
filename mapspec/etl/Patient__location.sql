-- Stage-2 ETL: Patient (FHIR R4) → location (OMOP CDM)
--
-- location_id is a composite hash of (line, city, state, zip) — two
-- patients sharing an address share a location row. Matches the OMOP
-- LOCATION ETL convention ("Each instance of a Location in the source
-- data should be assigned this unique key" + "unique Location") and
-- the FK side in Patient__person.sql uses the same hash.
--
-- DISTINCT ON (location_id) collapses identical addresses across
-- patients into one row.
--
-- location_source_value: per OMOP user_guidance "Put the verbatim value
-- for the location here, as it shows up in the source." Privacy note
-- (OMOP CDM Privacy guide): this field is PII-bearing and should be
-- reviewed/redacted in de-identified extracts.
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/country-iso-to-omop

SELECT DISTINCT ON (location_id)
    stringToId(concat_ws('|',
        v.location_line,
        v.location_city,
        v.location_state,
        v.location_zip
    ))                                              AS location_id,
    v.location_line                                AS address_1,
    NULL::varchar                                  AS address_2,
    v.location_city                                AS city,
    v.location_state                               AS state,
    v.location_zip                                 AS zip,
    v.location_county                              AS county,
    -- varchar(50) cap; long composites get truncated. Privacy: PII.
    left(concat_ws(', ',
        NULLIF(v.location_line,  ''),
        NULLIF(v.location_city,  ''),
        NULLIF(v.location_state, ''),
        NULLIF(v.location_zip,   '')
    ), 50)                                          AS location_source_value,
    COALESCE(c.concept_id, 0)                      AS country_concept_id,
    v.location_country                             AS country_source_value,
    v.location_lat::numeric                        AS latitude,
    v.location_lng::numeric                        AS longitude
FROM staging.patient_person v
LEFT JOIN cm.country_iso_to_omop c ON c.source_code = v.location_country
WHERE v.location_city IS NOT NULL
   OR v.location_state IS NOT NULL
   OR v.location_zip IS NOT NULL
   OR v.location_line IS NOT NULL
;
