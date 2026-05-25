-- Stage-2 ETL: Practitioner (FHIR R4) → provider (OMOP CDM v5.3)
-- Consumes staging.practitioner_provider.
--
-- Surrogate provider_id = hashtextextended(Practitioner.id, 0)::bigint
-- — ALWAYS the Practitioner.id UUID, never NPI. All consumer ETLs hash
-- the bare Practitioner.id (via getReferenceKey() applied to a
-- 'Practitioner/<UUID>' reference). Synthea's original search-ref form
-- ('Practitioner?identifier=…|NPI') is rewritten to the direct form by
-- `bun script/resolve-search-refs.ts` BEFORE this ETL runs, so all
-- sides see the same Practitioner.id and FKs align.
-- NPI is kept as the standalone `npi` column for traceability.

SELECT
    hashtextextended(v.id, 0)::bigint                   AS provider_id,
    (coalesce(v.family, '') || ', ' || coalesce(v.given, '')) AS provider_name,
    v.npi                                    AS npi,
    NULL::text                               AS dea,
    38004446                                 AS specialty_concept_id,   -- 'Family Practice' (ETL-Synthea hardcodes this)
    NULL::bigint                             AS care_site_id,
    NULL::integer                            AS year_of_birth,
    CASE lower(coalesce(v.gender, ''))
        WHEN 'male'    THEN 8507
        WHEN 'female'  THEN 8532
        WHEN 'other'   THEN 8521
        WHEN 'unknown' THEN 8551
        ELSE 0
    END                                      AS gender_concept_id,
    v.id                                     AS provider_source_value,  -- Practitioner UUID (matches ref); NPI lookup uses npi column
    NULL::text                               AS specialty_source_value,
    38004446                                 AS specialty_source_concept_id,
    v.gender                                 AS gender_source_value,
    CASE lower(coalesce(v.gender, ''))
        WHEN 'male'    THEN 8507
        WHEN 'female'  THEN 8532
        ELSE 0
    END                                      AS gender_source_concept_id
FROM staging.practitioner_provider v
;
