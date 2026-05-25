-- Stage-2 ETL: Observation.component[] → measurement (OMOP CDM)
--
-- Each component becomes its own measurement row. measurement_id derived
-- from hash(Observation.id || component_code_loinc) so each component
-- gets a deterministic, unique surrogate.
-- Appends to cdm_ours_fhir.measurement (run after Observation_measurement).

SELECT
    hashtextextended(v.id || '/' || COALESCE(v.component_code_loinc, ''), 0)::bigint  AS measurement_id,
    referenceToId(v.subject_id)                                              AS person_id,
    std.concept_id                                                           AS measurement_concept_id,
    COALESCE(v.effective_dt, v.effective_period_start)::date                 AS measurement_date,
    COALESCE(v.effective_dt, v.effective_period_start)::timestamp            AS measurement_datetime,
    NULL::varchar                                                            AS measurement_time,
    32817                                                                    AS measurement_type_concept_id,
    NULL::integer                                                            AS operator_concept_id,
    v.component_value_num                                                    AS value_as_number,
    NULL::integer                                                            AS value_as_concept_id,
    unit.concept_id                                                          AS unit_concept_id,
    NULL::numeric                                                            AS range_low,
    NULL::numeric                                                            AS range_high,
    referenceToId(v.performer_id)                                            AS provider_id,
    referenceToId(v.encounter_id)                                            AS visit_occurrence_id,
    NULL::bigint                                                             AS visit_detail_id,
    left(COALESCE(v.component_code_loinc, v.component_code_text), 50)        AS measurement_source_value,
    src.concept_id                                                           AS measurement_source_concept_id,
    left(v.component_unit_text, 50)                                          AS unit_source_value,
    NULL::integer                                                            AS unit_source_concept_id,
    NULL::varchar                                                            AS value_source_value,
    NULL::bigint                                                             AS measurement_event_id,
    NULL::integer                                                            AS meas_event_field_concept_id

FROM staging.observation_component_measurement v
JOIN vocab.concept src
  ON src.vocabulary_id = 'LOINC' AND src.concept_code = v.component_code_loinc
JOIN vocab.concept_relationship rel
  ON rel.concept_id_1   = src.concept_id
 AND rel.relationship_id = 'Maps to'
 AND rel.invalid_reason IS NULL
JOIN vocab.concept std
  ON std.concept_id      = rel.concept_id_2
 AND std.standard_concept = 'S'
 AND std.domain_id       = 'Measurement'
LEFT JOIN vocab.concept unit
  ON unit.vocabulary_id = 'UCUM'
 AND unit.concept_code  = v.component_unit_code
 AND unit.standard_concept = 'S'
WHERE v.component_code_loinc IS NOT NULL
  AND v.component_value_num IS NOT NULL
  AND COALESCE(v.status, 'final') NOT IN ('entered-in-error', 'cancelled', 'unknown')
;
