-- Stage-2 ETL: Condition → procedure_occurrence
-- (rows whose code Maps-to a Procedure-domain standard concept)
--
-- Same staging table as Condition__condition_occurrence.

WITH resolved AS (
    SELECT DISTINCT ON (v.id, std.concept_id)
        v.id, v.subject_ref, v.encounter_ref, v.recorder_ref, v.asserter_ref,
        v.verification_status_code,
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
                 ELSE 9
             END
)
-- Outer alias r — see Condition__condition_occurrence.sql header.
SELECT
    stringToId(r.id || '|' || r.std_concept_id::text)                       AS procedure_occurrence_id,
    referenceToId(r.subject_ref)                                            AS person_id,
    r.std_concept_id                                                        AS procedure_concept_id,

    COALESCE(r.onset_dt, r.onset_period_start, r.recorded_date)::date       AS procedure_date,
    COALESCE(r.onset_dt, r.onset_period_start, r.recorded_date)::timestamp  AS procedure_datetime,
    NULL::date                                                              AS procedure_end_date,
    NULL::timestamp                                                         AS procedure_end_datetime,

    32827                                                                   AS procedure_type_concept_id,
    NULL::integer                                                           AS modifier_concept_id,
    NULL::integer                                                           AS quantity,

    COALESCE(referenceToId(r.asserter_ref), referenceToId(r.recorder_ref))  AS provider_id,
    referenceToId(r.encounter_ref)                                          AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,

    left(COALESCE(r.code_display, r.src_code, r.code_text), 50)             AS procedure_source_value,
    r.src_concept_id                                                        AS procedure_source_concept_id,
    NULL::varchar                                                           AS modifier_source_value

FROM resolved r
WHERE r.std_domain = 'Procedure'
  AND COALESCE(r.verification_status_code, 'confirmed') NOT IN ('refuted', 'entered-in-error')
;
