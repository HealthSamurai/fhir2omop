-- Stage-2 ETL: DiagnosticReport → observation (DR's own code routing to Observation domain)
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-system-to-omop-vocab
--
-- Reads from staging.diagnosticreport_resolved (built once by
-- mapspec/etl/_resolve_diagnosticreport.sql). Sibling to
-- DiagnosticReport__measurement — see it for the full rationale. Trivial
-- WHERE std_domain='Observation' filter. Appends to cdm_ours_fhir.observation.

SELECT
    stringToId(r.id || '|' || r.std_concept_id::text)                       AS observation_id,
    referenceToId(r.subject_ref)                                            AS person_id,
    r.std_concept_id                                                        AS observation_concept_id,
    r.effective_dt::date                                                    AS observation_date,
    r.effective_dt::timestamp                                               AS observation_datetime,
    32817                                                                   AS observation_type_concept_id,
    NULL::numeric                                                           AS value_as_number,
    NULL::varchar                                                           AS value_as_string,
    NULL::integer                                                           AS value_as_concept_id,
    NULL::integer                                                           AS qualifier_concept_id,
    NULL::integer                                                           AS unit_concept_id,
    referenceToId(r.performer_practitioner_ref)                             AS provider_id,
    referenceToId(r.encounter_ref)                                          AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,
    left(COALESCE(r.src_code, r.code_text), 50)                             AS observation_source_value,
    r.src_concept_id                                                        AS observation_source_concept_id,
    NULL::varchar                                                           AS unit_source_value,
    NULL::varchar                                                           AS qualifier_source_value,
    left(r.code_text, 50)                                                   AS value_source_value,
    NULL::bigint                                                            AS observation_event_id,
    NULL::integer                                                           AS obs_event_field_concept_id

FROM staging.diagnosticreport_resolved r
WHERE r.std_domain = 'Observation'
;
