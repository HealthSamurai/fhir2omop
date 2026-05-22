-- Stage-2 ETL: Condition (FHIR R4) → condition_occurrence (OMOP CDM)
--
-- Routes by vocab.concept.domain_id='Condition' after Maps-to walk.
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-system-to-omop-vocab
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-verification-status-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-clinical-status-to-omop

SELECT
    referenceToId(v.id)                                                       AS condition_occurrence_id,
    referenceToId(v.subject_ref)                                              AS person_id,

    std.concept_id                                                            AS condition_concept_id,

    -- CSV reference writes date components in local time (Synthea
    -- exports START/STOP as local dates without offset). FHIR carries
    -- the local zone explicitly ("…+01:00"). The naive `::date` /
    -- `::timestamp` casts strip the offset, which is correct: both
    -- pipelines end up with the LOCAL date, which is what Synthea
    -- intended. Do NOT apply `AT TIME ZONE 'UTC'` here — it would shift
    -- events near midnight onto a different day from the CSV reference.
    COALESCE(v.onset_dt, v.onset_period_start, v.recorded_date)::date          AS condition_start_date,
    COALESCE(v.onset_dt, v.onset_period_start, v.recorded_date)::timestamp     AS condition_start_datetime,
    COALESCE(v.abatement_dt, v.abatement_period_end)::date                     AS condition_end_date,
    COALESCE(v.abatement_dt, v.abatement_period_end)::timestamp                AS condition_end_datetime,

    32827                                                                     AS condition_type_concept_id,   -- 'EHR encounter record'
    -- Prefer verificationStatus (semantically closer to OMOP Condition
    -- Status diagnostic-confidence axis) over clinicalStatus (FHIR's
    -- disease-state machine; only 'resolved' has a clean target).
    COALESCE(NULLIF(vstat.concept_id, 0), NULLIF(cstat.concept_id, 0), 0)      AS condition_status_concept_id,
    v.abatement_string                                                        AS stop_reason,
    NULL::bigint                                                              AS provider_id,

    referenceToId(v.encounter_ref)                                            AS visit_occurrence_id,
    NULL::bigint                                                              AS visit_detail_id,

    v.code_value                                                              AS condition_source_value,
    COALESCE(src.concept_id, 0)                                               AS condition_source_concept_id,
    v.clinical_status_code                                                    AS condition_status_source_value

FROM staging.condition_occurrence v
LEFT JOIN cm.fhir_system_to_omop_vocab sa
       ON sa.source_code = v.code_system
LEFT JOIN vocab.concept src
       ON src.vocabulary_id = sa.target_code
      AND src.concept_code  = v.code_value
LEFT JOIN vocab.concept_relationship rel
       ON rel.concept_id_1    = src.concept_id
      AND rel.relationship_id = 'Maps to'
      AND rel.invalid_reason IS NULL
LEFT JOIN vocab.concept std
       ON std.concept_id        = rel.concept_id_2
      AND std.standard_concept  = 'S'
      AND std.domain_id         = 'Condition'

LEFT JOIN cm.fhir_clinical_status_to_omop     cstat ON cstat.source_code = v.clinical_status_code
LEFT JOIN cm.fhir_verification_status_to_omop vstat ON vstat.source_code = v.verification_status_code

WHERE std.concept_id IS NOT NULL
;
