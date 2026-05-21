-- ─────────────────────────────────────────────────────────────────────────────
-- Stage-2 ETL preview: Observation → measurement
-- ─────────────────────────────────────────────────────────────────────────────
-- This is a SELECT (no INSERT) so you can run it in psql and inspect rows
-- before any data is written. Replace the leading `SELECT` block with
-- `INSERT INTO cdm.measurement (...) SELECT ...` to actually load.
--
-- Inputs:
--   • staging.obs_meas_view      ← output of Observation__measurement.view.json
--   • vocab.concept              ← Athena vocabulary (loaded by init-athena.ts)
--   • vocab.concept_relationship ← "Maps to" edges, ~39M rows
--   • cdm.person / visit_occurrence / provider ← already populated (FK targets)
--
-- Routing key:
--   final WHERE: std_code.domain_id = 'Measurement'
--   sibling SQL: Observation__observation.sql filters domain = 'Observation';
--   together they partition every FHIR Observation into the correct OMOP table.
--
-- Why this is simpler than v0.2:
--   • One pair (code_system, code_value) per concept-position instead of one
--     column per known vocabulary. Adding ICD/RxNorm/CVX support = adding one
--     row to system_aliases — no schema change.
--   • A single chain of joins per concept resolution (source concept →
--     Maps-to → standard concept) instead of 2 LATERAL subqueries each.
-- ─────────────────────────────────────────────────────────────────────────────

WITH
-- ─── system-aliases — mirror of mapspec/profiles/system-aliases.json ─────────
-- FHIR system URL → OMOP vocabulary_id. Keep this inline so the SQL is
-- self-contained; the JSON file is the source of truth maintained at edit
-- time and replicated into this VALUES list at codegen time.
system_aliases (system, vocabulary_id) AS (
    VALUES ('http://snomed.info/sct',                       'SNOMED'),
           ('http://loinc.org',                             'LOINC'),
           ('http://www.nlm.nih.gov/research/umls/rxnorm',  'RxNorm'),
           ('http://hl7.org/fhir/sid/icd-10-cm',            'ICD10CM'),
           ('http://hl7.org/fhir/sid/icd-9-cm',             'ICD9CM'),
           ('http://hl7.org/fhir/sid/cvx',                  'CVX'),
           ('http://unitsofmeasure.org',                    'UCUM')
),

-- ─── operator_map — comparator → concept_id (tiny inline lookup) ─────────────
operator_map (op_code, concept_id) AS (
    VALUES ('<',  4171756),
           ('<=', 4171754),
           ('>=', 4171755),
           ('>',  4172703)
),

-- ─── resolve Observation.code → standard concept ─────────────────────────────
-- 1) lookup source concept via (vocabulary_id, code)
-- 2) walk "Maps to" relationship to its standard equivalent
-- 3) standard concept's domain_id drives routing (see final WHERE)
code_resolved AS (
    SELECT
        v.id AS staging_id,

        src.concept_id   AS src_concept_id,
        std.concept_id   AS std_concept_id,
        std.domain_id    AS std_domain

    FROM staging.obs_meas_view v
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
    FROM staging.obs_meas_view v
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

-- ─── resolve UCUM unit → unit_concept_id ─────────────────────────────────────
-- UCUM is already standard in OMOP — no Maps-to walk needed.
unit_resolved AS (
    SELECT v.id AS staging_id, c.concept_id AS unit_concept_id
      FROM staging.obs_meas_view v
      LEFT JOIN vocab.concept c
        ON c.vocabulary_id  = 'UCUM'
       AND c.concept_code   = v.value_unit_code
       AND c.standard_concept = 'S'
)

-- ─── Final SELECT — shape rows exactly as cdm_ours_fhir.measurement expects ──
-- Surrogate IDs are deterministic 64-bit hashes; no JOIN to surrogate tables.
SELECT
    hashtextextended(v.id, 0)::bigint              AS measurement_id,
    hashtextextended(split_part(v.subject_id, '/', -1), 0)::bigint
                                                   AS person_id,

    -- Routing target. If domain != 'Measurement' the row is filtered out.
    COALESCE(cr.std_concept_id, 0)                 AS measurement_concept_id,

    -- effective[x] coalesce: dateTime → Period.start.
    COALESCE(v.effective_dt, v.effective_period_start)::date      AS measurement_date,
    COALESCE(v.effective_dt, v.effective_period_start)::timestamp AS measurement_datetime,
    NULL::varchar                                  AS measurement_time,

    32817                                          AS measurement_type_concept_id,  -- "EHR"
    om.concept_id                                  AS operator_concept_id,
    v.value_number                                 AS value_as_number,
    vr.value_as_concept_id,
    ur.unit_concept_id,
    v.range_low,
    v.range_high,

    CASE WHEN v.performer_id IS NULL OR v.performer_id = '' THEN NULL::bigint
         ELSE hashtextextended(split_part(v.performer_id, '/', -1), 0)::bigint
    END                                            AS provider_id,
    CASE WHEN v.encounter_id IS NULL OR v.encounter_id = '' THEN NULL::bigint
         ELSE hashtextextended(split_part(v.encounter_id, '/', -1), 0)::bigint
    END                                            AS visit_occurrence_id,
    NULL::bigint                                   AS visit_detail_id,

    -- Preserve raw FHIR code for traceability.
    COALESCE(v.code_value, v.code_text)            AS measurement_source_value,
    COALESCE(cr.src_concept_id, 0)                 AS measurement_source_concept_id,
    v.value_unit_text                              AS unit_source_value,
    NULL::integer                                  AS unit_source_concept_id,
    v.value_text                                   AS value_source_value,
    NULL::bigint                                   AS measurement_event_id,
    NULL::integer                                  AS meas_event_field_concept_id

FROM staging.obs_meas_view v
JOIN code_resolved   cr ON cr.staging_id = v.id
LEFT JOIN value_resolved vr ON vr.staging_id = v.id
LEFT JOIN unit_resolved  ur ON ur.staging_id = v.id
LEFT JOIN operator_map   om ON om.op_code   = v.value_comparator

-- Orphan filter: keep only obs whose Patient is loaded.
JOIN fhir.patient fp
  ON fp.id = split_part(v.subject_id, '/', -1)

WHERE cr.std_domain = 'Measurement'                                  -- domain routing
;
