-- Stage-2 ETL: Observation (FHIR R4) → observation (OMOP CDM)
--
-- Sibling to Observation__measurement.sql, routed by domain='Observation'.
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-system-to-omop-vocab

WITH resolved AS (
    SELECT DISTINCT ON (v.id)
        v.id AS staging_id,
        src.concept_id AS src_concept_id,
        std.concept_id AS std_concept_id
    FROM staging.obs_obs_view v
    JOIN cm.fhir_system_to_omop_vocab sa  ON sa.source_code = v.code_system
    JOIN vocab.concept src                ON src.vocabulary_id = sa.target_code AND src.concept_code = v.code_value
    JOIN vocab.concept_relationship rel   ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
    JOIN vocab.concept std                ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S' AND std.domain_id = 'Observation'
    ORDER BY v.id, std.concept_id
),
value_resolved AS (
    -- Some SNOMED codes have N Maps-to relationships (1→N). DISTINCT ON
    -- picks the lowest concept_id deterministically — see GAPS.md §6.
    SELECT DISTINCT ON (v.id) v.id AS staging_id, vstd.concept_id AS value_as_concept_id
    FROM staging.obs_obs_view v
    JOIN cm.fhir_system_to_omop_vocab vsa ON vsa.source_code = v.value_code_system
    JOIN vocab.concept vsrc               ON vsrc.vocabulary_id = vsa.target_code AND vsrc.concept_code = v.value_code
    JOIN vocab.concept_relationship vrel  ON vrel.concept_id_1 = vsrc.concept_id AND vrel.relationship_id = 'Maps to' AND vrel.invalid_reason IS NULL
    JOIN vocab.concept vstd               ON vstd.concept_id = vrel.concept_id_2 AND vstd.standard_concept = 'S'
    WHERE v.value_code_system IS NOT NULL
    ORDER BY v.id, vstd.concept_id
)

SELECT
    referenceToId(v.id)                                                     AS observation_id,
    referenceToId(v.subject_id)                                             AS person_id,
    r.std_concept_id                                                        AS observation_concept_id,

    COALESCE(v.effective_dt, v.effective_period_start)::date                AS observation_date,
    COALESCE(v.effective_dt, v.effective_period_start)::timestamp           AS observation_datetime,

    32817                                                                   AS observation_type_concept_id,
    v.value_number                                                          AS value_as_number,
    left(v.value_string, 60)                                                AS value_as_string,
    vr.value_as_concept_id,
    NULL::integer                                                           AS qualifier_concept_id,
    unit.concept_id                                                         AS unit_concept_id,

    referenceToId(v.performer_id)                                           AS provider_id,
    referenceToId(v.encounter_id)                                           AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,

    left(COALESCE(v.code_value, v.code_text), 50)                           AS observation_source_value,
    src.concept_id                                                          AS observation_source_concept_id,
    left(v.value_unit_text, 50)                                             AS unit_source_value,
    left(v.qualifier_code, 50)                                              AS qualifier_source_value,
    left(v.value_text, 50)                                                  AS value_source_value,
    NULL::bigint                                                            AS observation_event_id,
    NULL::integer                                                           AS obs_event_field_concept_id

FROM staging.obs_obs_view v
JOIN resolved r ON r.staging_id = v.id
LEFT JOIN vocab.concept src
       ON src.vocabulary_id = (SELECT target_code FROM cm.fhir_system_to_omop_vocab WHERE source_code = v.code_system)
      AND src.concept_code = v.code_value
LEFT JOIN value_resolved vr ON vr.staging_id = v.id
LEFT JOIN vocab.concept unit
       ON unit.vocabulary_id = 'UCUM' AND unit.concept_code = v.value_unit_code AND unit.standard_concept = 'S'
-- Filter out parent panel rows (Observation with only components and no own
-- value). Children are written by Observation_component__observation.
WHERE v.value_number IS NOT NULL
   OR v.value_string IS NOT NULL
   OR v.value_code   IS NOT NULL
   OR v.value_text   IS NOT NULL
;
