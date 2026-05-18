-- ─────────────────────────────────────────────────────────────────────────────
-- Stage-2 ETL preview: Observation → observation
-- ─────────────────────────────────────────────────────────────────────────────
-- This is a SELECT (no INSERT) — run it in psql to inspect rows before any
-- data is written. Replace the leading `SELECT` block with
-- `INSERT INTO cdm.observation (...) SELECT ...` to actually load.
--
-- Inputs:
--   • staging.obs_obs_view       ← output of Observation__observation.view.json
--   • vocab.concept              ← Athena vocabulary
--   • vocab.concept_relationship ← "Maps to" edges
--   • cdm.person / visit_occurrence / provider ← FK targets
--
-- Sibling to Observation__measurement.sql. Same FHIR resource, same join
-- pattern, but routed to cdm.observation by:
--   final WHERE: std_code.domain_id = 'Observation'
-- ─────────────────────────────────────────────────────────────────────────────

WITH
-- ─── system-aliases — FHIR system URL → OMOP vocabulary_id ───────────────────
-- Mirror of mapspec/profiles/system-aliases.json (codegen target).
system_aliases (system, vocabulary_id) AS (
    VALUES ('http://snomed.info/sct',                       'SNOMED'),
           ('http://loinc.org',                             'LOINC'),
           ('http://www.nlm.nih.gov/research/umls/rxnorm',  'RxNorm'),
           ('http://hl7.org/fhir/sid/icd-10-cm',            'ICD10CM'),
           ('http://hl7.org/fhir/sid/icd-9-cm',             'ICD9CM'),
           ('http://hl7.org/fhir/sid/cvx',                  'CVX'),
           ('http://hl7.org/fhir/v3/ObservationInterpretation', 'HL7'),
           ('http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', 'HL7'),
           ('http://unitsofmeasure.org',                    'UCUM')
),

-- ─── resolve Observation.code → standard concept ─────────────────────────────
code_resolved AS (
    SELECT
        v.id AS staging_id,
        src.concept_id AS src_concept_id,
        std.concept_id AS std_concept_id,
        std.domain_id  AS std_domain
    FROM staging.obs_obs_view v
    LEFT JOIN system_aliases sa
           ON sa.system = v.code_system
    LEFT JOIN vocab.concept src
           ON src.vocabulary_id = sa.vocabulary_id
          AND src.concept_code  = v.code_value
    LEFT JOIN vocab.concept_relationship cr
           ON cr.concept_id_1   = src.concept_id
          AND cr.relationship_id = 'Maps to'
          AND cr.invalid_reason IS NULL
    LEFT JOIN vocab.concept std
           ON std.concept_id      = cr.concept_id_2
          AND std.standard_concept = 'S'
),

-- ─── resolve valueCodeableConcept → value_as_concept_id ──────────────────────
value_resolved AS (
    SELECT
        v.id AS staging_id,
        std.concept_id AS value_as_concept_id
    FROM staging.obs_obs_view v
    LEFT JOIN system_aliases sa
           ON sa.system = v.value_code_system
    LEFT JOIN vocab.concept src
           ON src.vocabulary_id = sa.vocabulary_id
          AND src.concept_code  = v.value_code
    LEFT JOIN vocab.concept_relationship cr
           ON cr.concept_id_1   = src.concept_id
          AND cr.relationship_id = 'Maps to'
          AND cr.invalid_reason IS NULL
    LEFT JOIN vocab.concept std
           ON std.concept_id      = cr.concept_id_2
          AND std.standard_concept = 'S'
),

-- ─── resolve interpretation → qualifier_concept_id ───────────────────────────
qualifier_resolved AS (
    SELECT
        v.id AS staging_id,
        std.concept_id AS qualifier_concept_id
    FROM staging.obs_obs_view v
    LEFT JOIN system_aliases sa
           ON sa.system = v.qualifier_system
    LEFT JOIN vocab.concept src
           ON src.vocabulary_id = sa.vocabulary_id
          AND src.concept_code  = v.qualifier_code
    LEFT JOIN vocab.concept_relationship cr
           ON cr.concept_id_1   = src.concept_id
          AND cr.relationship_id = 'Maps to'
          AND cr.invalid_reason IS NULL
    LEFT JOIN vocab.concept std
           ON std.concept_id      = cr.concept_id_2
          AND std.standard_concept = 'S'
),

-- ─── resolve UCUM unit → unit_concept_id ─────────────────────────────────────
unit_resolved AS (
    SELECT v.id AS staging_id, c.concept_id AS unit_concept_id
      FROM staging.obs_obs_view v
      LEFT JOIN vocab.concept c
        ON c.vocabulary_id  = 'UCUM'
       AND c.concept_code   = v.value_unit_code
       AND c.standard_concept = 'S'
)

-- ─── Final SELECT — shape rows exactly as cdm_ours_fhir.observation expects ──
-- Surrogate IDs are deterministic 64-bit hashes; no JOIN to surrogate tables.
SELECT
    hashtextextended(v.id, 0)::bigint              AS observation_id,
    hashtextextended(split_part(v.subject_id, '/', -1), 0)::bigint
                                                   AS person_id,

    COALESCE(cr.std_concept_id, 0)                 AS observation_concept_id,

    COALESCE(v.effective_dt, v.effective_period_start)::date      AS observation_date,
    COALESCE(v.effective_dt, v.effective_period_start)::timestamp AS observation_datetime,

    32817                                          AS observation_type_concept_id,  -- "EHR"
    v.value_number                                 AS value_as_number,
    v.value_string                                 AS value_as_string,
    vr.value_as_concept_id,
    qr.qualifier_concept_id,
    ur.unit_concept_id,

    CASE WHEN v.performer_id IS NULL OR v.performer_id = '' THEN NULL::bigint
         ELSE hashtextextended(split_part(v.performer_id, '/', -1), 0)::bigint
    END                                            AS provider_id,
    CASE WHEN v.encounter_id IS NULL OR v.encounter_id = '' THEN NULL::bigint
         ELSE hashtextextended(split_part(v.encounter_id, '/', -1), 0)::bigint
    END                                            AS visit_occurrence_id,
    NULL::bigint                                   AS visit_detail_id,

    COALESCE(v.code_value, v.code_text)            AS observation_source_value,
    COALESCE(cr.src_concept_id, 0)                 AS observation_source_concept_id,
    v.value_unit_text                              AS unit_source_value,
    v.qualifier_code                               AS qualifier_source_value,
    v.value_text                                   AS value_source_value

FROM staging.obs_obs_view v
JOIN      code_resolved      cr ON cr.staging_id = v.id
LEFT JOIN value_resolved     vr ON vr.staging_id = v.id
LEFT JOIN qualifier_resolved qr ON qr.staging_id = v.id
LEFT JOIN unit_resolved      ur ON ur.staging_id = v.id

JOIN fhir.patient fp
  ON fp.id = split_part(v.subject_id, '/', -1)

WHERE cr.std_domain = 'Observation'                                   -- domain routing
;
