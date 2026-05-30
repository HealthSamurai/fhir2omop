-- Stage-2 ETL: DiagnosticReport → measurement (DR's own code routing to Measurement domain)
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-system-to-omop-vocab
--
-- Reads from staging.diagnosticreport_resolved (built once by
-- mapspec/etl/_resolve_diagnosticreport.sql — per-coding fan-out + Maps-to
-- walked once, shared with the __observation / __procedure_occurrence
-- siblings). Trivial WHERE std_domain='Measurement' filter. Appends to
-- cdm_ours_fhir.measurement (runs after Observation__measurement).
--
-- Surrogate PK = stringToId(DR.id || '|' || std_concept_id) so per-coding
-- fan-out stays unique. The DR's panel code (e.g. 24323-8 Comp Metabolic
-- Panel); individual result lines come through Observation→measurement.

SELECT
    stringToId(r.id || '|' || r.std_concept_id::text)                       AS measurement_id,
    referenceToId(r.subject_ref)                                            AS person_id,
    r.std_concept_id                                                        AS measurement_concept_id,
    r.effective_dt::date                                                    AS measurement_date,
    r.effective_dt::timestamp                                               AS measurement_datetime,
    NULL::varchar                                                           AS measurement_time,
    32856                                                                   AS measurement_type_concept_id,   -- 'Lab'
    NULL::integer                                                           AS operator_concept_id,
    NULL::numeric                                                           AS value_as_number,
    NULL::integer                                                           AS value_as_concept_id,
    NULL::integer                                                           AS unit_concept_id,
    NULL::numeric                                                           AS range_low,
    NULL::numeric                                                           AS range_high,
    referenceToId(r.performer_practitioner_ref)                             AS provider_id,
    referenceToId(r.encounter_ref)                                          AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,
    left(COALESCE(r.src_code, r.code_text), 50)                             AS measurement_source_value,
    r.src_concept_id                                                        AS measurement_source_concept_id,
    NULL::varchar                                                           AS unit_source_value,
    NULL::integer                                                           AS unit_source_concept_id,
    NULL::varchar                                                           AS value_source_value,
    NULL::bigint                                                            AS measurement_event_id,
    NULL::integer                                                           AS meas_event_field_concept_id

FROM staging.diagnosticreport_resolved r
WHERE r.std_domain = 'Measurement'
;
