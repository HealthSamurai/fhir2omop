-- Stage-2 ETL: Condition → observation (rows whose code routes to Observation domain)
--
-- Same staging table as Condition__condition_occurrence. For example,
-- SNOMED "Prediabetes" (15777000) maps to a standard concept in the
-- Observation domain, not Condition; it belongs in cdm_ours_fhir.observation,
-- not condition_occurrence. Without this edge those rows were silently dropped.
--
-- Dedup + PK + ORDER-BY priority mirror the sibling edge — see the header
-- of Condition__condition_occurrence.sql for the rationale.

WITH resolved AS (
    SELECT DISTINCT ON (v.id, std.concept_id)
        v.id, v.subject_ref, v.encounter_ref, v.recorder_ref, v.asserter_ref,
        v.verification_status_code, v.category_code,
        v.onset_dt, v.onset_period_start, v.recorded_date,
        v.code_text, v.code_system,
        v.code_value           AS src_code,
        v.code_display,
        src.concept_id         AS src_concept_id,
        std.concept_id         AS std_concept_id,
        std.domain_id          AS std_domain
    FROM staging.condition_occurrence v
    JOIN cm.fhir_system_to_omop_vocab sa  ON sa.source_code = v.code_system
    JOIN vocab.concept src                ON src.vocabulary_id = sa.target_code AND src.concept_code = v.code_value
    JOIN vocab.concept_relationship rel   ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
    JOIN vocab.concept std                ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S'
    ORDER BY v.id, std.concept_id,
             CASE v.code_system
                 WHEN 'http://snomed.info/sct' THEN 1
                 WHEN 'http://hl7.org/fhir/sid/icd-10-cm' THEN 2
                 ELSE 9
             END
)
-- Outer alias r — see Condition__condition_occurrence.sql header.
SELECT
    stringToId(r.id || '|' || r.std_concept_id::text)                       AS observation_id,
    referenceToId(r.subject_ref)                                            AS person_id,
    r.std_concept_id                                                        AS observation_concept_id,

    COALESCE(r.onset_dt, r.onset_period_start, r.recorded_date)::date       AS observation_date,
    COALESCE(r.onset_dt, r.onset_period_start, r.recorded_date)::timestamp  AS observation_datetime,

    32827                                                                   AS observation_type_concept_id,
    NULL::numeric                                                           AS value_as_number,
    NULL::varchar                                                           AS value_as_string,
    NULL::integer                                                           AS value_as_concept_id,
    NULL::integer                                                           AS qualifier_concept_id,
    NULL::integer                                                           AS unit_concept_id,

    COALESCE(referenceToId(r.asserter_ref), referenceToId(r.recorder_ref))  AS provider_id,
    referenceToId(r.encounter_ref)                                          AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,

    left(COALESCE(r.code_display, r.src_code, r.code_text), 50)             AS observation_source_value,
    r.src_concept_id                                                        AS observation_source_concept_id,
    NULL::varchar                                                           AS unit_source_value,
    NULL::varchar                                                           AS qualifier_source_value,
    NULL::varchar                                                           AS value_source_value,
    NULL::bigint                                                            AS observation_event_id,
    NULL::integer                                                           AS obs_event_field_concept_id

FROM resolved r
WHERE r.std_domain = 'Observation'
  AND COALESCE(r.verification_status_code, 'confirmed') NOT IN ('refuted', 'entered-in-error')
;
