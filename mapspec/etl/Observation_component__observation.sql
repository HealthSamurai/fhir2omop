-- Stage-2 ETL: Observation.component[] → observation (OMOP CDM)
--
-- Sibling to Observation_component__measurement.sql. Reuses the SAME
-- staging table (staging.observation_component_measurement — mis-named
-- but contains all component rows; we filter by std.domain_id here).
--
-- Each component whose LOINC code Maps to a standard concept with
-- domain_id='Observation' becomes its own observation row. Without
-- this edge, ~17.7k component-derived observation rows were silently
-- dropped.
--
-- value_as_concept_id is resolved from component.valueCodeableConcept
-- via cm.fhir_system_to_omop_vocab + Maps-to (no domain filter — the
-- answer concept can live in any domain). value_as_string holds the
-- CodeableConcept .text / valueString. value_as_number from
-- valueQuantity. value_source_value carries the raw answer code/text.
--
-- APPENDS to cdm_ours_fhir.observation (run after Observation__observation
-- and AllergyIntolerance__observation; in front of nothing that depends).

WITH value_resolved AS (
    -- DISTINCT ON: SNOMED 1→N Maps-to picks lowest concept_id deterministically.
    SELECT DISTINCT ON (v.id, v.component_code_loinc)
           v.id                  AS parent_id,
           v.component_code_loinc AS comp_code,
           vstd.concept_id        AS value_as_concept_id
    FROM staging.observation_component_measurement v
    JOIN cm.fhir_system_to_omop_vocab vsa ON vsa.source_code = v.component_value_code_system
    JOIN vocab.concept vsrc               ON vsrc.vocabulary_id = vsa.target_code AND vsrc.concept_code = v.component_value_code
    JOIN vocab.concept_relationship vrel  ON vrel.concept_id_1   = vsrc.concept_id AND vrel.relationship_id = 'Maps to' AND vrel.invalid_reason IS NULL
    JOIN vocab.concept vstd               ON vstd.concept_id = vrel.concept_id_2 AND vstd.standard_concept = 'S'
    WHERE v.component_value_code_system IS NOT NULL
      AND v.component_value_code IS NOT NULL
    ORDER BY v.id, v.component_code_loinc, vstd.concept_id
)

SELECT
    -- '/o/' separator keeps observation-component IDs distinct from
    -- measurement-component IDs (sibling uses '/').
    hashtextextended(v.id || '/o/' || COALESCE(v.component_code_loinc, ''), 0)::bigint AS observation_id,
    referenceToId(v.subject_id)                                              AS person_id,
    std.concept_id                                                           AS observation_concept_id,

    COALESCE(v.effective_dt, v.effective_period_start)::date                 AS observation_date,
    COALESCE(v.effective_dt, v.effective_period_start)::timestamp            AS observation_datetime,

    32817                                                                    AS observation_type_concept_id,
    v.component_value_num                                                    AS value_as_number,
    left(COALESCE(v.component_value_text, v.component_value_string), 60)     AS value_as_string,
    vr.value_as_concept_id                                                   AS value_as_concept_id,
    NULL::integer                                                            AS qualifier_concept_id,
    unit.concept_id                                                          AS unit_concept_id,

    referenceToId(v.performer_id)                                            AS provider_id,
    referenceToId(v.encounter_id)                                            AS visit_occurrence_id,
    NULL::bigint                                                             AS visit_detail_id,

    left(COALESCE(v.component_code_loinc, v.component_code_text), 50)        AS observation_source_value,
    src.concept_id                                                           AS observation_source_concept_id,
    left(v.component_unit_text, 50)                                          AS unit_source_value,
    NULL::varchar                                                            AS qualifier_source_value,
    left(COALESCE(v.component_value_text, v.component_value_string, v.component_value_code), 50) AS value_source_value,
    NULL::bigint                                                             AS observation_event_id,
    NULL::integer                                                            AS obs_event_field_concept_id

FROM staging.observation_component_measurement v
JOIN vocab.concept src
  ON src.vocabulary_id = 'LOINC' AND src.concept_code = v.component_code_loinc
JOIN vocab.concept_relationship rel
  ON rel.concept_id_1   = src.concept_id
 AND rel.relationship_id = 'Maps to'
 AND rel.invalid_reason IS NULL
JOIN vocab.concept std
  ON std.concept_id      = rel.concept_id_2
 AND std.standard_concept = 'S'
 AND std.domain_id       = 'Observation'
LEFT JOIN vocab.concept unit
  ON unit.vocabulary_id = 'UCUM'
 AND unit.concept_code  = v.component_unit_code
 AND unit.standard_concept = 'S'
LEFT JOIN value_resolved vr
  ON vr.parent_id = v.id AND vr.comp_code = v.component_code_loinc
WHERE v.component_code_loinc IS NOT NULL
;
