-- Stage-2 ETL: Condition (FHIR R4) → condition_occurrence (OMOP CDM)
--
-- Source-code priority for diagnosis (single index-friendly UNION ALL):
--   1. SNOMED       (Condition.code.coding[snomed])
--   2. ICD10CM, ICD9CM, ICD10
--   5. SNOMED       (Condition.evidence.concept.coding[snomed])  — fallback
--   6. ICD10CM      (Condition.evidence.concept.coding[icd10cm])
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-verification-status-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-clinical-status-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-condition-category-to-omop

WITH codes AS (
    SELECT id AS staging_id, 1 AS prio, 'SNOMED'  AS vocab, code_snomed     AS code FROM staging.condition_occurrence WHERE code_snomed     IS NOT NULL
    UNION ALL
    SELECT id,                2,         'ICD10CM',         code_icd10cm           FROM staging.condition_occurrence WHERE code_icd10cm    IS NOT NULL
    UNION ALL
    SELECT id,                3,         'ICD9CM',          code_icd9cm            FROM staging.condition_occurrence WHERE code_icd9cm     IS NOT NULL
    UNION ALL
    SELECT id,                4,         'ICD10',           code_icd10             FROM staging.condition_occurrence WHERE code_icd10      IS NOT NULL
    UNION ALL
    SELECT id,                5,         'SNOMED',          evidence_snomed        FROM staging.condition_occurrence WHERE evidence_snomed IS NOT NULL
    UNION ALL
    SELECT id,                6,         'ICD10CM',         evidence_icd10cm       FROM staging.condition_occurrence WHERE evidence_icd10cm IS NOT NULL
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

    -- Map Condition.category → OMOP Type Concept; default 32817 'EHR'
    -- when Condition has no category (per HL7 IG narrative recommendation
    -- to encode provenance in condition_type_concept_id).
    COALESCE(cat.concept_id, 32817)                                           AS condition_type_concept_id,
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
LEFT JOIN cm.fhir_condition_category_to_omop  cat   ON cat.source_code   = v.category_code
-- Skip refuted / entered-in-error; treat NULL verificationStatus as
-- 'confirmed' (FHIR R4 default per the Condition profile).
WHERE COALESCE(v.verification_status_code, 'confirmed') NOT IN ('refuted', 'entered-in-error')
;
