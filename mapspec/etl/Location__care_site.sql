-- Stage-2 ETL: Location (FHIR R4) → care_site (OMOP CDM)
-- Appends a care_site row per Location (separate from Organization-derived
-- care_sites). Useful when Encounter.location is referenced but the
-- corresponding Organization isn't present.

SELECT
    referenceToId(v.id)              AS care_site_id,
    left(v.name, 255)                AS care_site_name,
    0                                AS place_of_service_concept_id,
    referenceToId(v.id)              AS location_id,
    v.id                             AS care_site_source_value,
    left(v.type_code, 50)            AS place_of_service_source_value

FROM staging.location_care_site v
;
