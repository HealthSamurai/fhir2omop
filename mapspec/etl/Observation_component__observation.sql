-- Stage-2 ETL: Observation.component[] → observation (components routing to Observation domain)
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-system-to-omop-vocab
--
-- Reads from staging.observation_component_resolved (built once by
-- mapspec/etl/_resolve_observation_component.sql). Sibling to
-- Observation_component__measurement.sql, routed by std_domain='Observation'.
-- Without this edge ~17.7k component-derived observation rows (survey /
-- PRAPARE answers) would be silently dropped. APPENDS to
-- cdm_ours_fhir.observation.
--
-- Surrogate PK uses a '/o/' infix so component-observation ids never collide
-- with component-measurement ids (which use '/').

SELECT
    stringToId(r.id || '/o/' || COALESCE(r.src_code, '') || '|' || r.std_concept_id::text) AS observation_id,
    referenceToId(r.subject_id)                                             AS person_id,
    r.std_concept_id                                                        AS observation_concept_id,

    COALESCE(r.effective_dt, r.effective_period_start)::date                AS observation_date,
    COALESCE(r.effective_dt, r.effective_period_start)::timestamp           AS observation_datetime,

    32817                                                                   AS observation_type_concept_id,
    r.component_value_num                                                   AS value_as_number,
    left(COALESCE(r.component_value_text, r.component_value_string), 60)    AS value_as_string,
    r.value_as_concept_id                                                   AS value_as_concept_id,
    NULL::integer                                                           AS qualifier_concept_id,
    r.unit_concept_id                                                       AS unit_concept_id,

    referenceToId(r.performer_id)                                           AS provider_id,
    referenceToId(r.encounter_id)                                           AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,

    left(COALESCE(r.src_code, r.component_code_text), 50)                   AS observation_source_value,
    r.src_concept_id                                                        AS observation_source_concept_id,
    left(r.component_unit_text, 50)                                         AS unit_source_value,
    NULL::varchar                                                           AS qualifier_source_value,
    left(COALESCE(r.component_value_text, r.component_value_string, r.component_value_code), 50) AS value_source_value,
    NULL::bigint                                                            AS observation_event_id,
    NULL::integer                                                           AS obs_event_field_concept_id

FROM staging.observation_component_resolved r
WHERE r.std_domain = 'Observation'
;
