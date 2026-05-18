-- Stage-2 ETL: Organization (FHIR R4) → care_site (OMOP CDM v5.3)
-- Consumes staging.organization_care_site.

INSERT INTO cdm_ours_fhir.care_site (
    care_site_id,
    care_site_name,
    place_of_service_concept_id,
    location_id,
    care_site_source_value,
    place_of_service_source_value
)
SELECT
    ROW_NUMBER() OVER (ORDER BY v.id)        AS care_site_id,
    v.name                                   AS care_site_name,
    CASE v.type_code
        WHEN 'prov'  THEN 8940     -- Office (generic outpatient provider)
        WHEN 'dept'  THEN 4318944  -- Department (Visit Concept Domain — fits)
        WHEN 'edu'   THEN 4030303  -- Educational institution
        WHEN 'govt'  THEN 4195901  -- Government
        WHEN 'team'  THEN 4217012  -- Team
        ELSE 0
    END                                      AS place_of_service_concept_id,
    NULL::bigint                             AS location_id,
    v.id                                     AS care_site_source_value,  -- UUID; encounters reference this directly
    v.type_code                              AS place_of_service_source_value
FROM staging.organization_care_site v
;
