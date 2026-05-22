-- Stage-2 ETL: Condition (FHIR R4) → condition_occurrence (OMOP CDM)
--
-- Routes by vocab.concept.domain_id='Condition' after Maps-to walk.
-- system_aliases mirrors mapspec/profiles/system-aliases.json (inline so
-- the SQL is self-contained; codegen could replace this with a JOIN to
-- a materialized cm.system_aliases if duplication becomes painful).

WITH
system_aliases (system, vocabulary_id) AS (
    VALUES ('http://snomed.info/sct',            'SNOMED'),
           ('http://hl7.org/fhir/sid/icd-10-cm', 'ICD10CM'),
           ('http://hl7.org/fhir/sid/icd-9-cm',  'ICD9CM'),
           ('http://hl7.org/fhir/sid/icd-10',    'ICD10')
),

code_resolved AS (
    SELECT
        v.id              AS staging_id,
        src.concept_id    AS src_concept_id,
        std.concept_id    AS std_concept_id,
        std.domain_id     AS std_domain
    FROM staging.condition_occurrence v
    LEFT JOIN system_aliases sa
           ON sa.system = v.code_system
    LEFT JOIN vocab.concept src
           ON src.vocabulary_id = sa.vocabulary_id
          AND src.concept_code  = v.code_value
    LEFT JOIN vocab.concept_relationship cr
           ON cr.concept_id_1   = src.concept_id
          AND cr.relationship_id = 'Maps to'
          AND cr.invalid_reason IS NULL
    LEFT JOIN vocab.concept std
           ON std.concept_id      = cr.concept_id_2
          AND std.standard_concept = 'S'
)

SELECT
    referenceToId(v.id)                                                       AS condition_occurrence_id,
    referenceToId(v.subject_ref)                                              AS person_id,

    COALESCE(cr.std_concept_id, 0)                                            AS condition_concept_id,

    COALESCE(v.onset_dt, v.onset_period_start, v.recorded_date)::date         AS condition_start_date,
    COALESCE(v.onset_dt, v.onset_period_start, v.recorded_date)::timestamp    AS condition_start_datetime,
    COALESCE(v.abatement_dt, v.abatement_period_end)::date                    AS condition_end_date,
    COALESCE(v.abatement_dt, v.abatement_period_end)::timestamp               AS condition_end_datetime,

    32827                                                                     AS condition_type_concept_id,   -- 'EHR encounter record'
    0                                                                         AS condition_status_concept_id,
    v.abatement_string                                                        AS stop_reason,
    NULL::bigint                                                              AS provider_id,

    referenceToId(v.encounter_ref)                                            AS visit_occurrence_id,
    NULL::bigint                                                              AS visit_detail_id,

    v.code_value                                                              AS condition_source_value,
    COALESCE(cr.src_concept_id, 0)                                            AS condition_source_concept_id,
    v.clinical_status_code                                                    AS condition_status_source_value

FROM staging.condition_occurrence v
JOIN code_resolved cr ON cr.staging_id = v.id

WHERE cr.std_domain = 'Condition'
;
