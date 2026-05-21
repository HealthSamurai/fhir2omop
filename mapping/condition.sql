---viewdef
@name: condition_condition
id: id
subject_ref: subject.reference
encounter_ref: encounter.reference
-- ??? probably icd, snomed, 
code_system: code.coding.first().system
code_value: code.coding.first().code
snomed_code: codey.coding.where(system='snomed').code
icd9_code: codey.coding.where(system='icd9').code
icd10_code: codey.coding.where(system='icd10').code
icd11_code: codey.coding.where(system='icd11').code
code_text: code.text
onset_dt: onset.ofType(dateTime)
onset_period_start: onset.ofType(Period).start
abatement_dt: abatement.ofType(dateTime)
abatement_period_end: abatement.ofType(Period).end
abatement_string: abatement.ofType(string)
clinical_status_code: clinicalStatus.coding.first().code
recorded_date: recordedDate

---sql
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
    FROM condition_occurrence v
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
    hashtextextended(v.id, 0)::bigint                          AS condition_occurrence_id,
    hashtextextended(regexp_replace(v.subject_ref, '^.*[:/|]', ''), 0)::bigint AS person_id,
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
WHERE cr.std_domain = 'Condition'                              -- domain routing
