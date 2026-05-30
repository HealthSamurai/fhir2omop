-- Stage-2 ETL: Observation.component[] → measurement (components routing to Measurement domain)
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-system-to-omop-vocab
--
-- Reads from staging.observation_component_resolved (built once by
-- mapspec/etl/_resolve_observation_component.sql). Trivial WHERE
-- std_domain='Measurement' filter; sibling Observation_component__observation
-- handles std_domain='Observation'. APPENDS to cdm_ours_fhir.measurement.
--
-- Surrogate PK = stringToId(id || '/' || component_code || '|' || std_concept_id)
-- — keeps each (parent, component-code, standard concept) unique and distinct
-- from top-level Observation measurement_ids (which use '|' without '/').

SELECT
    stringToId(r.id || '/' || COALESCE(r.src_code, '') || '|' || r.std_concept_id::text) AS measurement_id,
    referenceToId(r.subject_id)                                             AS person_id,
    r.std_concept_id                                                        AS measurement_concept_id,

    COALESCE(r.effective_dt, r.effective_period_start)::date                AS measurement_date,
    COALESCE(r.effective_dt, r.effective_period_start)::timestamp           AS measurement_datetime,
    NULL::varchar                                                           AS measurement_time,

    32817                                                                   AS measurement_type_concept_id,
    NULL::integer                                                           AS operator_concept_id,
    r.component_value_num                                                   AS value_as_number,
    r.value_as_concept_id                                                   AS value_as_concept_id,
    r.unit_concept_id                                                       AS unit_concept_id,
    NULL::numeric                                                           AS range_low,
    NULL::numeric                                                           AS range_high,

    referenceToId(r.performer_id)                                           AS provider_id,
    referenceToId(r.encounter_id)                                           AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,

    left(COALESCE(r.src_code, r.component_code_text), 50)                   AS measurement_source_value,
    r.src_concept_id                                                        AS measurement_source_concept_id,
    left(r.component_unit_text, 50)                                         AS unit_source_value,
    NULL::integer                                                           AS unit_source_concept_id,
    NULL::varchar                                                           AS value_source_value,
    NULL::bigint                                                            AS measurement_event_id,
    NULL::integer                                                           AS meas_event_field_concept_id

FROM staging.observation_component_resolved r
WHERE r.std_domain = 'Measurement'
  AND r.component_value_num IS NOT NULL
;
