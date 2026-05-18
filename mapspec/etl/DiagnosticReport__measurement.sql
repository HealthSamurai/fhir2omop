-- ─────────────────────────────────────────────────────────────────────────────
-- Stage-2 ETL: DiagnosticReport (FHIR R4) → measurement (OMOP CDM v5.4)
-- ─────────────────────────────────────────────────────────────────────────────
-- Demonstration query. Composes:
--   • Stage-1: mapspec/views/DiagnosticReport__measurement.view.json
--   • Athena vocabulary: vocab.concept, vocab.concept_relationship
--   • Target FK tables:  cdm_ours.person, cdm_ours.visit_occurrence,
--                        cdm_ours.provider, cdm_ours.measurement
--
-- Scope: this writes one measurement row per DiagnosticReport whose code
-- resolves to OMOP domain_id = 'Measurement' (typically lab panel codes,
-- e.g. LOINC 24323-8 "Comprehensive metabolic panel"). Individual results
-- referenced by DiagnosticReport.result[] are mapped separately by
-- Observation__measurement.sql.
--
-- conclusionCode entries are NOT fan-out'd here — only the first
-- conclusionCode populates value_as_concept_id; multiple codes are an
-- open TODO.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO cdm_ours.measurement (
    measurement_id,
    person_id,
    measurement_concept_id,
    measurement_date,
    measurement_datetime,
    measurement_type_concept_id,
    operator_concept_id,
    value_as_number,
    value_as_concept_id,
    unit_concept_id,
    range_low,
    range_high,
    provider_id,
    visit_occurrence_id,
    visit_detail_id,
    measurement_source_value,
    measurement_source_concept_id,
    unit_source_value,
    value_source_value
)
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

-- ─── 3. Surrogate measurement_id ─────────────────────────────────────────────
-- Offset by a large constant so IDs from DiagnosticReport don't collide
-- with measurement_id values produced by Observation__measurement.sql.
numbered AS (
    SELECT v.*, 700000000 + ROW_NUMBER() OVER (ORDER BY v.id) AS measurement_id
      FROM staging.dr_meas_view v
)

-- ─── Assemble final OMOP measurement row ─────────────────────────────────────
SELECT
    n.measurement_id,
    p.person_id,

    COALESCE(cr.loinc_std_concept_id, cr.snomed_std_concept_id, 0)
        AS measurement_concept_id,

    n.measurement_date::date,
    n.measurement_datetime::timestamp,

    -- DiagnosticReport is a report-level summary; OMOP type concept for
    -- "Lab result" / "Lab report" — 32856 ("Lab") is closest.
    32856                                          AS measurement_type_concept_id,

    NULL::integer                                  AS operator_concept_id,
    NULL::float                                    AS value_as_number,
    vr.value_as_concept_id,
    NULL::integer                                  AS unit_concept_id,
    NULL::float                                    AS range_low,
    NULL::float                                    AS range_high,
    pr.provider_id,
    vo.visit_occurrence_id,
    NULL::bigint                                   AS visit_detail_id,

    COALESCE(n.code_loinc, n.code_snomed, n.code_text)
        AS measurement_source_value,
    COALESCE(cr.loinc_src_concept_id, cr.snomed_src_concept_id, 0)
        AS measurement_source_concept_id,

    NULL::varchar                                  AS unit_source_value,
    n.value_text                                   AS value_source_value

FROM numbered           n
JOIN code_resolved      cr ON cr.staging_id = n.id
LEFT JOIN value_resolved vr ON vr.staging_id = n.id

LEFT JOIN cdm_ours.person p
       ON p.person_source_value = split_part(n.subject_id,   '/', -1)

LEFT JOIN cdm_ours.visit_occurrence vo
       ON vo.visit_source_value = split_part(n.encounter_id, '/', -1)

LEFT JOIN cdm_ours.provider pr
       ON pr.provider_source_value = split_part(n.performer_id, '/', -1)

WHERE p.person_id IS NOT NULL
  AND COALESCE(cr.loinc_std_domain, cr.snomed_std_domain) = 'Measurement'  -- domain routing
;
