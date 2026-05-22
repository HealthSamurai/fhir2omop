-- Stage-2 ETL: Encounter (FHIR R4) → visit_occurrence (OMOP CDM v5.4)
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/encounter-class-to-omop

SELECT
    referenceToId(v.id)                                  AS visit_occurrence_id,
    referenceToId(v.subject_ref)                         AS person_id,

    COALESCE(cls.concept_id, 0)                          AS visit_concept_id,

    -- Synthea FHIR encodes period in the run-machine's local timezone
    -- ("…+02:00"), while the CSV side stores the same instant in UTC.
    -- We normalize to UTC so the diff against cdm.visit_occurrence matches.
    (v.period_start::timestamptz AT TIME ZONE 'UTC')::date              AS visit_start_date,
    (v.period_start::timestamptz AT TIME ZONE 'UTC')                    AS visit_start_datetime,
    (COALESCE(v.period_end, v.period_start)::timestamptz AT TIME ZONE 'UTC')::date AS visit_end_date,
    (COALESCE(v.period_end, v.period_start)::timestamptz AT TIME ZONE 'UTC')       AS visit_end_datetime,

    32827                                                AS visit_type_concept_id,   -- 'EHR encounter record'

    referenceToId(v.performer_ref)                       AS provider_id,
    referenceToId(v.service_provider_ref)                AS care_site_id,

    v.id                                                 AS visit_source_value,
    0                                                    AS visit_source_concept_id,

    -- Hospitalization details — Synthea omits them, so concept_ids are 0
    -- and source values come straight from staging (which is also NULL).
    0                                                    AS admitted_from_concept_id,
    v.admit_source_code                                  AS admitted_from_source_value,
    0                                                    AS discharged_to_concept_id,
    v.discharge_disposition_code                         AS discharged_to_source_value,

    referenceToId(v.part_of_ref)                         AS preceding_visit_occurrence_id

FROM staging.encounter_visit v
LEFT JOIN cm.encounter_class_to_omop cls
       ON cls.source_code = v.class_code
;
