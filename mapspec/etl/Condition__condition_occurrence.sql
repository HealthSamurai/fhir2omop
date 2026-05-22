-- Stage-2 ETL: Condition (FHIR R4) → condition_occurrence (OMOP CDM)
--
-- Source-code priority: SNOMED → ICD10CM → ICD9CM → ICD10.
-- The "smart" CASE-in-JOIN-ON pattern killed the planner (CASE expressions
-- aren't sargable against vocab.concept's (vocabulary_id, concept_code)
-- index — Postgres falls back to a seq scan on 6M rows). Instead, unpivot
-- the 4 source-code columns via UNION ALL, then DISTINCT ON (staging_id)
-- ORDER BY priority picks the winner. Each UNION ALL branch is a clean
-- (vocab_id, code) equality predicate that uses the index.
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-verification-status-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-clinical-status-to-omop

WITH codes AS (
    SELECT id AS staging_id, 1 AS prio, 'SNOMED'  AS vocab, code_snomed  AS code FROM staging.condition_occurrence WHERE code_snomed  IS NOT NULL
    UNION ALL
    SELECT id,                2,         'ICD10CM',         code_icd10cm        FROM staging.condition_occurrence WHERE code_icd10cm IS NOT NULL
    UNION ALL
    SELECT id,                3,         'ICD9CM',          code_icd9cm         FROM staging.condition_occurrence WHERE code_icd9cm  IS NOT NULL
    UNION ALL
    SELECT id,                4,         'ICD10',           code_icd10          FROM staging.condition_occurrence WHERE code_icd10   IS NOT NULL
),
resolved AS (
    SELECT DISTINCT ON (c.staging_id)
        c.staging_id,
        c.code            AS src_code,
        src.concept_id    AS src_concept_id,
        std.concept_id    AS std_concept_id
    FROM codes c
    JOIN vocab.concept src
      ON src.vocabulary_id = c.vocab
     AND src.concept_code  = c.code
    JOIN vocab.concept_relationship rel
      ON rel.concept_id_1   = src.concept_id
     AND rel.relationship_id = 'Maps to'
     AND rel.invalid_reason IS NULL
    JOIN vocab.concept std
      ON std.concept_id      = rel.concept_id_2
     AND std.standard_concept = 'S'
     AND std.domain_id       = 'Condition'
    ORDER BY c.staging_id, c.prio
)

SELECT
    referenceToId(v.id)                                                       AS condition_occurrence_id,
    referenceToId(v.subject_ref)                                              AS person_id,

    r.std_concept_id                                                          AS condition_concept_id,

    COALESCE(v.onset_dt, v.onset_period_start, v.recorded_date)::date          AS condition_start_date,
    COALESCE(v.onset_dt, v.onset_period_start, v.recorded_date)::timestamp     AS condition_start_datetime,
    COALESCE(v.abatement_dt, v.abatement_period_end)::date                     AS condition_end_date,
    COALESCE(v.abatement_dt, v.abatement_period_end)::timestamp                AS condition_end_datetime,

    32827                                                                     AS condition_type_concept_id,
    COALESCE(NULLIF(vstat.concept_id, 0), NULLIF(cstat.concept_id, 0), 0)      AS condition_status_concept_id,
    v.abatement_string                                                        AS stop_reason,
    NULL::bigint                                                              AS provider_id,

    referenceToId(v.encounter_ref)                                            AS visit_occurrence_id,
    NULL::bigint                                                              AS visit_detail_id,

    r.src_code                                                                AS condition_source_value,
    r.src_concept_id                                                          AS condition_source_concept_id,
    v.clinical_status_code                                                    AS condition_status_source_value

FROM staging.condition_occurrence v
JOIN resolved r ON r.staging_id = v.id
LEFT JOIN cm.fhir_clinical_status_to_omop     cstat ON cstat.source_code = v.clinical_status_code
LEFT JOIN cm.fhir_verification_status_to_omop vstat ON vstat.source_code = v.verification_status_code
;
