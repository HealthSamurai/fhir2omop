-- ─────────────────────────────────────────────────────────────────────────────
-- Stage-2 ETL: DiagnosticReport (FHIR R4) → measurement (OMOP CDM v5.4)
-- ─────────────────────────────────────────────────────────────────────────────
-- Composes:
--   • Stage-1: mapspec/views/DiagnosticReport__measurement.view.json
--   • Athena vocabulary: vocab.concept, vocab.concept_relationship
--   • Target: cdm_ours_fhir.measurement (one row per DiagnosticReport whose
--     code resolves to OMOP domain_id = 'Measurement', typically lab panels).
--
-- Surrogate IDs are deterministic 64-bit hashes.
-- DiagnosticReport.id and Observation.id have separate UUID spaces, so
-- their measurement_id hashes don't collide — no offset needed.
--
-- Individual results referenced by DiagnosticReport.result[] are mapped
-- separately by Observation__measurement.sql.
--
-- conclusionCode entries are NOT fan-out'd here — only the first
-- conclusionCode populates value_as_concept_id; multiple codes are an
-- open TODO.
-- ─────────────────────────────────────────────────────────────────────────────

WITH
-- ─── 1. Resolve DiagnosticReport.code → standard concept (LOINC priority) ────
code_resolved AS (
    SELECT
        v.id                     AS staging_id,
        loinc_std.concept_id     AS loinc_std_concept_id,
        loinc_std.domain_id      AS loinc_std_domain,
        loinc_src.concept_id     AS loinc_src_concept_id,
        snomed_std.concept_id    AS snomed_std_concept_id,
        snomed_std.domain_id     AS snomed_std_domain,
        snomed_src.concept_id    AS snomed_src_concept_id
    FROM staging.dr_meas_view v
    LEFT JOIN LATERAL (
        SELECT c2.concept_id, c2.domain_id
          FROM vocab.concept c1
          JOIN vocab.concept_relationship cr
            ON cr.concept_id_1 = c1.concept_id
           AND cr.relationship_id = 'Maps to'
           AND cr.invalid_reason IS NULL
          JOIN vocab.concept c2
            ON c2.concept_id = cr.concept_id_2
           AND c2.standard_concept = 'S'
         WHERE c1.vocabulary_id = 'LOINC'
           AND c1.concept_code  = v.code_loinc
         LIMIT 1
    ) loinc_std ON true
    LEFT JOIN LATERAL (
        SELECT concept_id FROM vocab.concept
         WHERE vocabulary_id = 'LOINC' AND concept_code = v.code_loinc
         LIMIT 1
    ) loinc_src ON true
    LEFT JOIN LATERAL (
        SELECT c2.concept_id, c2.domain_id
          FROM vocab.concept c1
          JOIN vocab.concept_relationship cr
            ON cr.concept_id_1 = c1.concept_id
           AND cr.relationship_id = 'Maps to'
           AND cr.invalid_reason IS NULL
          JOIN vocab.concept c2
            ON c2.concept_id = cr.concept_id_2
           AND c2.standard_concept = 'S'
         WHERE c1.vocabulary_id = 'SNOMED'
           AND c1.concept_code  = v.code_snomed
         LIMIT 1
    ) snomed_std ON true
    LEFT JOIN LATERAL (
        SELECT concept_id FROM vocab.concept
         WHERE vocabulary_id = 'SNOMED' AND concept_code = v.code_snomed
         LIMIT 1
    ) snomed_src ON true
),

-- ─── 2. Resolve DiagnosticReport.conclusionCode → value_as_concept_id ────────
-- Only the first conclusionCode is taken (view flattens [0]). conclusionCode
-- is typically SNOMED. Falls back to LOINC if SNOMED resolution fails.
value_resolved AS (
    SELECT
        v.id AS staging_id,
        COALESCE(snomed_v.concept_id, loinc_v.concept_id) AS value_as_concept_id
    FROM staging.dr_meas_view v
    LEFT JOIN LATERAL (
        SELECT c2.concept_id
          FROM vocab.concept c1
          JOIN vocab.concept_relationship cr
            ON cr.concept_id_1 = c1.concept_id
           AND cr.relationship_id = 'Maps to'
           AND cr.invalid_reason IS NULL
          JOIN vocab.concept c2
            ON c2.concept_id = cr.concept_id_2
           AND c2.standard_concept = 'S'
         WHERE c1.vocabulary_id = 'SNOMED'
           AND c1.concept_code  = v.value_as
         LIMIT 1
    ) snomed_v ON true
    LEFT JOIN LATERAL (
        SELECT c2.concept_id
          FROM vocab.concept c1
          JOIN vocab.concept_relationship cr
            ON cr.concept_id_1 = c1.concept_id
           AND cr.relationship_id = 'Maps to'
           AND cr.invalid_reason IS NULL
          JOIN vocab.concept c2
            ON c2.concept_id = cr.concept_id_2
           AND c2.standard_concept = 'S'
         WHERE c1.vocabulary_id = 'LOINC'
           AND c1.concept_code  = v.value_as
         LIMIT 1
    ) loinc_v ON true
),

-- ─── Assemble final OMOP measurement row ─────────────────────────────────────
SELECT
    hashtextextended(v.id, 0)::bigint              AS measurement_id,
    hashtextextended(split_part(v.subject_id, '/', -1), 0)::bigint
                                                   AS person_id,

    COALESCE(cr.loinc_std_concept_id, cr.snomed_std_concept_id, 0)
        AS measurement_concept_id,

    v.measurement_date::date,
    v.measurement_datetime::timestamp,

    -- DiagnosticReport is a report-level summary; OMOP type concept for
    -- "Lab result" / "Lab report" — 32856 ("Lab") is closest.
    32856                                          AS measurement_type_concept_id,

    NULL::integer                                  AS operator_concept_id,
    NULL::float                                    AS value_as_number,
    vr.value_as_concept_id,
    NULL::integer                                  AS unit_concept_id,
    NULL::float                                    AS range_low,
    NULL::float                                    AS range_high,

    CASE WHEN v.performer_id IS NULL OR v.performer_id = '' THEN NULL::bigint
         ELSE hashtextextended(split_part(v.performer_id, '/', -1), 0)::bigint
    END                                            AS provider_id,
    CASE WHEN v.encounter_id IS NULL OR v.encounter_id = '' THEN NULL::bigint
         ELSE hashtextextended(split_part(v.encounter_id, '/', -1), 0)::bigint
    END                                            AS visit_occurrence_id,
    NULL::bigint                                   AS visit_detail_id,

    COALESCE(v.code_loinc, v.code_snomed, v.code_text)
        AS measurement_source_value,
    COALESCE(cr.loinc_src_concept_id, cr.snomed_src_concept_id, 0)
        AS measurement_source_concept_id,

    NULL::varchar                                  AS unit_source_value,
    v.value_text                                   AS value_source_value

FROM staging.dr_meas_view v
JOIN      code_resolved  cr ON cr.staging_id = v.id
LEFT JOIN value_resolved vr ON vr.staging_id = v.id

JOIN fhir.patient fp
  ON fp.id = split_part(v.subject_id, '/', -1)

WHERE COALESCE(cr.loinc_std_domain, cr.snomed_std_domain) = 'Measurement'  -- domain routing
;
