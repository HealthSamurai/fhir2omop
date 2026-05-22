-- Stage-2 ETL: DiagnosticReport (FHIR R4) → measurement (OMOP CDM)
--
-- DR's own panel code routed to Measurement domain. Appends to
-- cdm_ours_fhir.measurement (must run after Observation__measurement.sql).

WITH codes AS (
    SELECT id AS staging_id, 1 AS prio, 'LOINC' AS vocab, code_loinc AS code FROM staging.diagnosticreport_measurement WHERE code_loinc IS NOT NULL
    UNION ALL
    SELECT id,                2,         'SNOMED',         code_snomed        FROM staging.diagnosticreport_measurement WHERE code_snomed IS NOT NULL
),
resolved AS (
    SELECT DISTINCT ON (c.staging_id)
        c.staging_id, c.code AS src_code,
        src.concept_id AS src_concept_id,
        std.concept_id AS std_concept_id
    FROM codes c
    JOIN vocab.concept src ON src.vocabulary_id = c.vocab AND src.concept_code = c.code
    JOIN vocab.concept_relationship rel ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
    JOIN vocab.concept std ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S' AND std.domain_id = 'Measurement'
    ORDER BY c.staging_id, c.prio
)

SELECT
    referenceToId(v.id)                                                     AS measurement_id,
    referenceToId(v.subject_ref)                                            AS person_id,
    r.std_concept_id                                                        AS measurement_concept_id,
    v.effective_dt::date                                                    AS measurement_date,
    v.effective_dt::timestamp                                               AS measurement_datetime,
    NULL::varchar                                                           AS measurement_time,
    32856                                                                   AS measurement_type_concept_id,   -- 'Lab'
    NULL::integer                                                           AS operator_concept_id,
    NULL::numeric                                                           AS value_as_number,
    NULL::integer                                                           AS value_as_concept_id,
    NULL::integer                                                           AS unit_concept_id,
    NULL::numeric                                                           AS range_low,
    NULL::numeric                                                           AS range_high,
    referenceToId(v.performer_ref)                                          AS provider_id,
    referenceToId(v.encounter_ref)                                          AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,
    left(r.src_code, 50)                                                    AS measurement_source_value,
    r.src_concept_id                                                        AS measurement_source_concept_id,
    NULL::varchar                                                           AS unit_source_value,
    NULL::integer                                                           AS unit_source_concept_id,
    NULL::varchar                                                           AS value_source_value,
    NULL::bigint                                                            AS measurement_event_id,
    NULL::integer                                                           AS meas_event_field_concept_id

FROM staging.diagnosticreport_measurement v
JOIN resolved r ON r.staging_id = v.id
;
