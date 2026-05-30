-- Stage-2 ETL: DiagnosticReport → procedure_occurrence (DR's own code routing to Procedure domain)
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-system-to-omop-vocab
--
-- Reads from staging.diagnosticreport_resolved (built once by
-- mapspec/etl/_resolve_diagnosticreport.sql). Sibling to
-- DiagnosticReport__measurement — see it for the full rationale. Trivial
-- WHERE std_domain='Procedure' filter (typically imaging-study LOINCs).
-- Appends to cdm_ours_fhir.procedure_occurrence.

SELECT
    stringToId(r.id || '|' || r.std_concept_id::text)                       AS procedure_occurrence_id,
    referenceToId(r.subject_ref)                                            AS person_id,
    r.std_concept_id                                                        AS procedure_concept_id,
    r.effective_dt::date                                                    AS procedure_date,
    r.effective_dt::timestamp                                               AS procedure_datetime,
    NULL::date                                                              AS procedure_end_date,
    NULL::timestamp                                                         AS procedure_end_datetime,
    32827                                                                   AS procedure_type_concept_id,
    NULL::integer                                                           AS modifier_concept_id,
    NULL::integer                                                           AS quantity,
    referenceToId(r.performer_practitioner_ref)                             AS provider_id,
    referenceToId(r.encounter_ref)                                          AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,
    left(COALESCE(r.src_code, r.code_text), 50)                             AS procedure_source_value,
    r.src_concept_id                                                        AS procedure_source_concept_id,
    NULL::varchar                                                           AS modifier_source_value

FROM staging.diagnosticreport_resolved r
WHERE r.std_domain = 'Procedure'
;
