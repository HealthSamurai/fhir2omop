-- Stage-2 ETL: Location (FHIR R4) → location (OMOP CDM)
-- Appends to cdm_ours_fhir.location (run after Patient__location.sql).

SELECT
    referenceToId(v.id)              AS location_id,
    left(v.line, 50)                 AS address_1,
    NULL::varchar                    AS address_2,
    left(v.city, 50)                 AS city,
    NULL::varchar                    AS state,
    left(v.zip, 9)                   AS zip,
    NULL::varchar                    AS county,
    left(v.state, 50)                AS location_source_value,
    COALESCE(c.concept_id, 0)        AS country_concept_id,
    left(v.country, 80)              AS country_source_value,
    v.lat::numeric                   AS latitude,
    v.lng::numeric                   AS longitude

FROM staging.location_location v
LEFT JOIN cm.country_iso_to_omop c ON c.source_code = v.country
;
