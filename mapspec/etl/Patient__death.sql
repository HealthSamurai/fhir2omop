-- Stage-2 ETL: Patient (FHIR R4) → death (OMOP CDM)
--
-- One row per Patient with deceasedDateTime. death_type_concept_id 32817
-- 'EHR' default. cause_concept_id NULL — Synthea doesn't carry CoD code.

SELECT
    referenceToId(v.id)              AS person_id,
    v.death_dt::date                 AS death_date,
    v.death_dt::timestamp            AS death_datetime,
    32817                            AS death_type_concept_id,
    NULL::integer                    AS cause_concept_id,
    NULL::varchar                    AS cause_source_value,
    NULL::integer                    AS cause_source_concept_id

FROM staging.patient_death v
WHERE v.death_dt IS NOT NULL
;
