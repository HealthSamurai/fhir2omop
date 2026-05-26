-- Stage-2 ETL: Condition → condition_occurrence (per-coding fan-out)
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-system-to-omop-vocab
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-clinical-status-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-verification-status-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-condition-category-to-omop
--
-- ─── Per-coding fan-out + domain routing ──────────────────────────
-- staging.condition_occurrence now has one row per (Condition.id,
-- coding) — see view. Each coding is resolved through
-- cm.fhir_system_to_omop_vocab → vocab.concept → Maps-to → standard
-- concept, then routed by std.domain_id to the appropriate OMOP
-- table. THIS edge writes only rows where std.domain_id='Condition'.
-- Sibling edges Condition__observation / __procedure_occurrence /
-- __measurement write the rest.
--
-- Dedup: when two codings of the same Condition (typically SNOMED +
-- ICD-10 of the same diagnosis) resolve to the same standard
-- concept_id, DISTINCT ON collapses to one row. ORDER BY prefers
-- SNOMED (already-standard, fewer Maps-to ambiguities) so the
-- surviving source_value is the SNOMED code.
--
-- Surrogate condition_occurrence_id uses (Condition.id, std_concept_id)
-- so different codings of the same Condition that resolve to
-- DIFFERENT std concepts get distinct PKs.
-- ──────────────────────────────────────────────────────────────────

WITH resolved AS (
    SELECT DISTINCT ON (v.id, std.concept_id)
        v.id,
        v.subject_ref, v.encounter_ref, v.recorder_ref, v.asserter_ref,
        v.clinical_status_code, v.verification_status_code, v.category_code,
        v.onset_dt, v.onset_period_start, v.recorded_date,
        v.abatement_dt, v.abatement_period_end, v.abatement_string,
        v.code_text,
        v.code_system,
        v.code_value           AS src_code,
        v.code_display,
        src.concept_id         AS src_concept_id,
        std.concept_id         AS std_concept_id,
        std.domain_id          AS std_domain
    FROM staging.condition_occurrence v
    JOIN cm.fhir_system_to_omop_vocab sa
      ON sa.source_code = v.code_system
    JOIN vocab.concept src
      ON src.vocabulary_id  = sa.target_code
     AND src.concept_code   = v.code_value
    JOIN vocab.concept_relationship rel
      ON rel.concept_id_1   = src.concept_id
     AND rel.relationship_id = 'Maps to'
     AND rel.invalid_reason IS NULL
    JOIN vocab.concept std
      ON std.concept_id      = rel.concept_id_2
     AND std.standard_concept = 'S'
    ORDER BY v.id, std.concept_id,
             CASE v.code_system
                 WHEN 'http://snomed.info/sct'             THEN 1
                 WHEN 'http://hl7.org/fhir/sid/icd-10-cm'  THEN 2
                 WHEN 'http://hl7.org/fhir/sid/icd-9-cm'   THEN 3
                 WHEN 'http://hl7.org/fhir/sid/icd-10'     THEN 4
                 ELSE 9
             END
)
-- Outer alias `r` (resolved) keeps the linter's `v.<col>` regex from
-- false-positive matching CTE-internal columns against the staging view.
SELECT
    stringToId(r.id || '|' || r.std_concept_id::text)                        AS condition_occurrence_id,
    referenceToId(r.subject_ref)                                             AS person_id,
    r.std_concept_id                                                         AS condition_concept_id,

    COALESCE(r.onset_dt, r.onset_period_start, r.recorded_date)::date        AS condition_start_date,
    COALESCE(r.onset_dt, r.onset_period_start, r.recorded_date)::timestamp   AS condition_start_datetime,
    COALESCE(r.abatement_dt, r.abatement_period_end)::date                   AS condition_end_date,
    COALESCE(r.abatement_dt, r.abatement_period_end)::timestamp              AS condition_end_datetime,

    COALESCE(cat.concept_id, 32817)                                          AS condition_type_concept_id,
    COALESCE(NULLIF(vstat.concept_id, 0), NULLIF(cstat.concept_id, 0), 0)    AS condition_status_concept_id,

    left(r.abatement_string, 20)                                             AS stop_reason,
    COALESCE(referenceToId(r.asserter_ref), referenceToId(r.recorder_ref))   AS provider_id,
    referenceToId(r.encounter_ref)                                           AS visit_occurrence_id,
    NULL::bigint                                                             AS visit_detail_id,

    left(COALESCE(r.code_display, r.src_code, r.code_text), 50)              AS condition_source_value,
    r.src_concept_id                                                         AS condition_source_concept_id,
    left(r.clinical_status_code, 50)                                         AS condition_status_source_value

FROM resolved r
LEFT JOIN cm.fhir_clinical_status_to_omop     cstat ON cstat.source_code = r.clinical_status_code
LEFT JOIN cm.fhir_verification_status_to_omop vstat ON vstat.source_code = r.verification_status_code
LEFT JOIN cm.fhir_condition_category_to_omop  cat   ON cat.source_code   = r.category_code
WHERE r.std_domain = 'Condition'
  AND COALESCE(r.verification_status_code, 'confirmed') NOT IN ('refuted', 'entered-in-error')
;
