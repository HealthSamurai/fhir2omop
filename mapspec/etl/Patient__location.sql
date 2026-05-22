-- Stage-2 ETL: Patient (FHIR R4) → location (OMOP CDM)
--
-- One location row per Patient (1:1 with person). location_id mirrors
-- person_id (both hashtextextended(Patient.id)). Country resolved via
-- ConceptMap.
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/country-iso-to-omop

SELECT
    referenceToId(v.id)                            AS location_id,
    v.location_line                                AS address_1,
    NULL::varchar                                  AS address_2,
    v.location_city                                AS city,
    v.location_state                               AS state,
    v.location_zip                                 AS zip,
    v.location_county                              AS county,
    v.location_state                               AS location_source_value,
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
