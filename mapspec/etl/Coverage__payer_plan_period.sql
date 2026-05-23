-- Stage-2 ETL: Coverage (FHIR R4) → payer_plan_period (OMOP CDM)
--
-- Synthea doesn't emit Coverage by default. Wired for real-world data.
-- payer_concept_id / plan_concept_id resolution would need a custom
-- ConceptMap per source — left as 0 placeholders.

SELECT
    referenceToId(v.id)                                                     AS payer_plan_period_id,
    referenceToId(v.subject_ref)                                            AS person_id,
    COALESCE(v.period_start, v.period_end)::date                            AS payer_plan_period_start_date,
    COALESCE(v.period_end,   v.period_start)::date                          AS payer_plan_period_end_date,
    0                                                                       AS payer_concept_id,
    left(v.payer_name, 50)                                                  AS payer_source_value,
    NULL::integer                                                           AS payer_source_concept_id,
    0                                                                       AS plan_concept_id,
    left(v.type_text, 50)                                                   AS plan_source_value,
    NULL::integer                                                           AS plan_source_concept_id,
    0                                                                       AS sponsor_concept_id,
    NULL::varchar                                                           AS sponsor_source_value,
    NULL::integer                                                           AS sponsor_source_concept_id,
    NULL::varchar                                                           AS family_source_value,
    0                                                                       AS stop_reason_concept_id,
    NULL::varchar                                                           AS stop_reason_source_value,
    NULL::integer                                                           AS stop_reason_source_concept_id

FROM staging.coverage_payer_plan_period v
WHERE v.period_start IS NOT NULL OR v.period_end IS NOT NULL
;
