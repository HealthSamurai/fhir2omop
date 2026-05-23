-- Stage-2 ETL: Observation (FHIR R4) → measurement (OMOP CDM)
--
-- Routes by vocab.concept.domain_id='Measurement' after Maps-to walk.
-- Sibling Observation__observation.sql handles domain='Observation'.
--
-- Performance note: with 39k+ FHIR observations the previous cascade
-- of 8+ LEFT JOINs against vocab.* gave the planner a bad estimate
-- and stalled. Resolve once in a CTE filtered on domain, then JOIN —
-- two index probes per row instead of an exploded plan.
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-system-to-omop-vocab

WITH resolved AS (
    -- DISTINCT ON: 1→N Maps-to occurs in SNOMED. Pick the lowest target
    -- concept_id deterministically (GAPS.md §6).
    SELECT DISTINCT ON (v.id)
        v.id AS staging_id,
        src.concept_id AS src_concept_id,
        std.concept_id AS std_concept_id
    FROM staging.obs_meas_view v
    JOIN cm.fhir_system_to_omop_vocab sa  ON sa.source_code = v.code_system
    JOIN vocab.concept src                ON src.vocabulary_id = sa.target_code AND src.concept_code = v.code_value
    JOIN vocab.concept_relationship rel   ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
    JOIN vocab.concept std                ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S' AND std.domain_id = 'Measurement'
    ORDER BY v.id, std.concept_id
),
value_resolved AS (
    SELECT DISTINCT ON (v.id) v.id AS staging_id, vstd.concept_id AS value_as_concept_id
    FROM staging.obs_meas_view v
    JOIN cm.fhir_system_to_omop_vocab vsa ON vsa.source_code = v.value_code_system
    JOIN vocab.concept vsrc               ON vsrc.vocabulary_id = vsa.target_code AND vsrc.concept_code = v.value_code
    JOIN vocab.concept_relationship vrel  ON vrel.concept_id_1 = vsrc.concept_id AND vrel.relationship_id = 'Maps to' AND vrel.invalid_reason IS NULL
    JOIN vocab.concept vstd               ON vstd.concept_id = vrel.concept_id_2 AND vstd.standard_concept = 'S'
    WHERE v.value_code_system IS NOT NULL
    ORDER BY v.id, vstd.concept_id
),
operator_map (op_code, concept_id) AS (
    VALUES ('<', 4171756), ('<=', 4171754), ('>=', 4171755), ('>', 4172703)
)

SELECT
    referenceToId(v.id)                                                     AS measurement_id,
    referenceToId(v.subject_id)                                             AS person_id,
    r.std_concept_id                                                        AS measurement_concept_id,

    COALESCE(v.effective_dt, v.effective_period_start)::date                AS measurement_date,
    COALESCE(v.effective_dt, v.effective_period_start)::timestamp           AS measurement_datetime,
    NULL::varchar                                                           AS measurement_time,

    32817                                                                   AS measurement_type_concept_id,
    om.concept_id                                                           AS operator_concept_id,
    v.value_number                                                          AS value_as_number,
    vr.value_as_concept_id,
    unit.concept_id                                                         AS unit_concept_id,
    v.range_low,
    v.range_high,

    referenceToId(v.performer_id)                                           AS provider_id,
    referenceToId(v.encounter_id)                                           AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,

    left(COALESCE(v.code_value, v.code_text), 50)                           AS measurement_source_value,
    src.concept_id                                                          AS measurement_source_concept_id,
    left(v.value_unit_text, 50)                                             AS unit_source_value,
    NULL::integer                                                           AS unit_source_concept_id,
    left(v.value_text, 50)                                                  AS value_source_value,
    NULL::bigint                                                            AS measurement_event_id,
    NULL::integer                                                           AS meas_event_field_concept_id

FROM staging.obs_meas_view v
JOIN resolved r ON r.staging_id = v.id
LEFT JOIN vocab.concept src
       ON src.vocabulary_id = (SELECT target_code FROM cm.fhir_system_to_omop_vocab WHERE source_code = v.code_system)
      AND src.concept_code = v.code_value
LEFT JOIN value_resolved vr ON vr.staging_id = v.id
LEFT JOIN vocab.concept unit
       ON unit.vocabulary_id = 'UCUM' AND unit.concept_code = v.value_unit_code AND unit.standard_concept = 'S'
LEFT JOIN operator_map om ON om.op_code = v.value_comparator
;
