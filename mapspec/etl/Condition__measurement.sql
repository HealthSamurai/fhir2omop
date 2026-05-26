-- Stage-2 ETL: Condition → measurement
-- (rows whose code Maps-to a Measurement-domain standard concept)
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
    stringToId(r.id || '|' || r.std_concept_id::text)                       AS measurement_id,
    referenceToId(r.subject_ref)                                            AS person_id,
    r.std_concept_id                                                        AS measurement_concept_id,

    COALESCE(r.onset_dt, r.onset_period_start, r.recorded_date)::date       AS measurement_date,
    COALESCE(r.onset_dt, r.onset_period_start, r.recorded_date)::timestamp  AS measurement_datetime,
    NULL::varchar                                                           AS measurement_time,

    32827                                                                   AS measurement_type_concept_id,
    NULL::integer                                                           AS operator_concept_id,
    NULL::numeric                                                           AS value_as_number,
    NULL::integer                                                           AS value_as_concept_id,
    NULL::integer                                                           AS unit_concept_id,
    NULL::numeric                                                           AS range_low,
    NULL::numeric                                                           AS range_high,

    COALESCE(referenceToId(r.asserter_ref), referenceToId(r.recorder_ref))  AS provider_id,
    referenceToId(r.encounter_ref)                                          AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,

    left(COALESCE(r.code_display, r.src_code, r.code_text), 50)             AS measurement_source_value,
    r.src_concept_id                                                        AS measurement_source_concept_id,
    NULL::varchar                                                           AS unit_source_value,
    NULL::integer                                                           AS unit_source_concept_id,
    NULL::varchar                                                           AS value_source_value,
    NULL::bigint                                                            AS measurement_event_id,
    NULL::integer                                                           AS meas_event_field_concept_id

FROM resolved r
WHERE r.std_domain = 'Measurement'
  AND COALESCE(r.verification_status_code, 'confirmed') NOT IN ('refuted', 'entered-in-error')
;
