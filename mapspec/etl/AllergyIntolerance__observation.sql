-- Stage-2 ETL: AllergyIntolerance (FHIR R4) → observation (OMOP CDM)
--
-- OMOP has no dedicated allergy table. We INSERT into observation with
-- the allergy substance as both the source code and value_as_concept_id.
-- This stage-2 APPENDS to cdm_ours_fhir.observation (no TRUNCATE) — it
-- must run after Observation__observation.sql to avoid wiping it.

WITH codes AS (
    SELECT id AS staging_id, 1 AS prio, 'SNOMED' AS vocab, code_snomed AS code FROM staging.allergyintolerance_observation WHERE code_snomed IS NOT NULL
    UNION ALL
    SELECT id,                2,         'RxNorm',         code_rxnorm        FROM staging.allergyintolerance_observation WHERE code_rxnorm IS NOT NULL
),
resolved AS (
    SELECT DISTINCT ON (c.staging_id)
        c.staging_id, c.code AS src_code,
        src.concept_id AS src_concept_id,
        std.concept_id AS std_concept_id
    FROM codes c
    JOIN vocab.concept src
      ON src.vocabulary_id = c.vocab AND src.concept_code = c.code
    JOIN vocab.concept_relationship rel
      ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
    JOIN vocab.concept std
      ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S'
    ORDER BY c.staging_id, c.prio
)

SELECT
    referenceToId(v.id)                                                     AS observation_id,
    referenceToId(v.subject_ref)                                            AS person_id,
    r.std_concept_id                                                        AS observation_concept_id,
    COALESCE(v.recorded_date, v.onset_dt)::date                             AS observation_date,
    COALESCE(v.recorded_date, v.onset_dt)::timestamp                        AS observation_datetime,
    32817                                                                   AS observation_type_concept_id,
    NULL::numeric                                                           AS value_as_number,
    NULL::varchar                                                           AS value_as_string,
    r.std_concept_id                                                        AS value_as_concept_id,  -- substance IS the value
    NULL::integer                                                           AS qualifier_concept_id,
    NULL::integer                                                           AS unit_concept_id,
    NULL::bigint                                                            AS provider_id,
    referenceToId(v.encounter_ref)                                          AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,
    left(r.src_code, 50)                                                    AS observation_source_value,
    r.src_concept_id                                                        AS observation_source_concept_id,
    NULL::varchar                                                           AS unit_source_value,
    left(v.status_code, 50)                                                 AS qualifier_source_value,
    left(v.code_text, 50)                                                   AS value_source_value,
    NULL::bigint                                                            AS observation_event_id,
    NULL::integer                                                           AS obs_event_field_concept_id

FROM staging.allergyintolerance_observation v
JOIN resolved r ON r.staging_id = v.id
WHERE COALESCE(v.verify_status, 'confirmed') NOT IN ('entered-in-error', 'refuted')
;
