-- ─────────────────────────────────────────────────────────────────────────────
-- Stage-2 ETL: Condition (FHIR R4) → condition_occurrence (OMOP CDM v5.3)
-- ─────────────────────────────────────────────────────────────────────────────
-- Consumes:
--   • staging.condition_occurrence    ← output of Condition__condition_occurrence.view.json
--   • cdm_ours_fhir.person            (FK target)
--   • cdm_ours_fhir.visit_occurrence  (FK target)
--   • vocab.concept / concept_relationship  (Maps-to → standard concept)
--
-- Routing key: vocab.concept.domain_id = 'Condition' after Maps-to.
-- Synthea uses SNOMED; real data may use ICD10CM/ICD9CM — system_aliases
-- below handles all three (and is extensible).
-- ─────────────────────────────────────────────────────────────────────────────

WITH
system_aliases (system, vocabulary_id) AS (
    VALUES ('http://snomed.info/sct',                'SNOMED'),
           ('http://hl7.org/fhir/sid/icd-10-cm',     'ICD10CM'),
           ('http://hl7.org/fhir/sid/icd-9-cm',      'ICD9CM'),
           ('http://hl7.org/fhir/sid/icd-10',        'ICD10')
),

code_resolved AS (
    SELECT
        v.id                AS staging_id,
        src.concept_id      AS src_concept_id,
        std.concept_id      AS std_concept_id,
        std.domain_id       AS std_domain
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

-- Surrogate IDs are deterministic 64-bit hashes:
--   condition_occurrence_id = hash(Condition.id)
--   person_id               = hash(patient UUID from subject.reference)
--   visit_occurrence_id     = hash(Encounter UUID from encounter.reference)
-- No JOIN to cdm_ours_fhir surrogate tables — the FK is computed from the
-- same string the upstream ETL hashed. fhir.patient JOIN is purely an
-- orphan filter.

SELECT
    hashtextextended(v.id, 0)::bigint                          AS condition_occurrence_id,
    hashtextextended(regexp_replace(v.subject_ref, '^.*[:/|]', ''), 0)::bigint
                                                               AS person_id,

    COALESCE(cr.std_concept_id, 0)                             AS condition_concept_id,

    COALESCE(v.onset_dt, v.onset_period_start, v.recorded_date)::date         AS condition_start_date,
    COALESCE(v.onset_dt, v.onset_period_start, v.recorded_date)::timestamp    AS condition_start_datetime,
    COALESCE(v.abatement_dt, v.abatement_period_end)::date                    AS condition_end_date,
    COALESCE(v.abatement_dt, v.abatement_period_end)::timestamp               AS condition_end_datetime,

    32827                                                      AS condition_type_concept_id,   -- 'EHR encounter record'
    0                                                          AS condition_status_concept_id,
    v.abatement_string                                         AS stop_reason,
    NULL::bigint                                               AS provider_id,

    CASE WHEN v.encounter_ref IS NULL OR v.encounter_ref = '' THEN NULL::bigint
         ELSE hashtextextended(regexp_replace(v.encounter_ref, '^.*[:/|]', ''), 0)::bigint
    END                                                        AS visit_occurrence_id,
    NULL::bigint                                               AS visit_detail_id,

    v.code_value                                               AS condition_source_value,
    COALESCE(cr.src_concept_id, 0)                             AS condition_source_concept_id,
    v.clinical_status_code                                     AS condition_status_source_value

FROM staging.condition_occurrence v
JOIN code_resolved cr ON cr.staging_id = v.id

JOIN fhir.patient fp
  ON fp.id = regexp_replace(v.subject_ref, '^.*[:/|]', '')

WHERE cr.std_domain = 'Condition'                              -- domain routing
;
