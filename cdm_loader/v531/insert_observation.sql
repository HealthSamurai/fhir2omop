-- ─────────────────────────────────────────────────────────────────────────────
-- insert_observation — patched from upstream ETL-Synthea.
-- ─────────────────────────────────────────────────────────────────────────────
-- Three source streams collapse into cdm.observation: allergies, conditions
-- (those that route to Observation domain), and observations themselves.
--
-- Upstream wraps a 3-way UNION ALL in `row_number() OVER (ORDER BY person_id)`
-- to mint observation_id. That outer sort over the entire UNION result has
-- to materialize and order *all* rows before INSERT can start — on Synthea
-- (~1M union rows × 4.5M vocab map) this runs CPU-bound for tens of minutes
-- without writing a single row.
--
-- We're on hash-IDs now, so the outer ROW_NUMBER is dead weight. Each branch
-- emits observation_id inline as
--   hashtextextended(<branch-prefix> || patient::text || code || date, 0)
-- where the prefix differentiates the 3 branches so collisions are
-- impossible. Postgres streams each branch straight into the target.
--
-- Splitting into 3 separate INSERTs gives visible progress and lets each
-- query be planned independently against the heavy vocab joins.
-- ─────────────────────────────────────────────────────────────────────────────

-- One transaction for atomicity + so SET LOCAL applies to all 3 INSERTs.
-- work_mem bump keeps the 4.5M-row vocab map hash table in RAM (default 4MB
-- spills 130 MB to temp files); synchronous_commit=off is safe — if the
-- write fails before fsync we just re-run the (idempotent) loader.
BEGIN;
SET LOCAL work_mem = '512MB';
SET LOCAL synchronous_commit = OFF;

-- ─── 1. allergies → observation ─────────────────────────────────────────────
insert into @cdm_schema.observation (
    observation_id, person_id, observation_concept_id,
    observation_date, observation_datetime, observation_type_concept_id,
    value_as_number, value_as_string, value_as_concept_id,
    qualifier_concept_id, unit_concept_id,
    provider_id, visit_occurrence_id, visit_detail_id,
    observation_source_value, observation_source_concept_id,
    unit_source_value, qualifier_source_value
)
select
    hashtextextended(
        'a:' || a.patient::text || '|' || coalesce(a.code,'') || '|' || a.start::text,
        0)::bigint                                AS observation_id,
    p.person_id                                   AS person_id,
    srctostdvm.target_concept_id                  AS observation_concept_id,
    a.start                                       AS observation_date,
    a.start                                       AS observation_datetime,
    32827                                         AS observation_type_concept_id,
    cast(null as float)                           AS value_as_number,
    cast(null as varchar)                         AS value_as_string,
    0                                             AS value_as_concept_id,
    0                                             AS qualifier_concept_id,
    0                                             AS unit_concept_id,
    pr.provider_id                                AS provider_id,
    fv.visit_occurrence_id_new                    AS visit_occurrence_id,
    fv.visit_occurrence_id_new + 1000000          AS visit_detail_id,
    a.code                                        AS observation_source_value,
    srctosrcvm.source_concept_id                  AS observation_source_concept_id,
    cast(null as varchar)                         AS unit_source_value,
    cast(null as varchar)                         AS qualifier_source_value
from @synthea_schema.allergies a
join @cdm_schema.source_to_standard_vocab_map srctostdvm
  on srctostdvm.source_code             = a.code
 and srctostdvm.target_domain_id        = 'Observation'
 and srctostdvm.target_vocabulary_id    = 'SNOMED'
 and srctostdvm.target_standard_concept = 'S'
 and srctostdvm.target_invalid_reason is null
join @cdm_schema.source_to_source_vocab_map srctosrcvm
  on srctosrcvm.source_code             = a.code
 and srctosrcvm.source_vocabulary_id    = 'SNOMED'
 and srctosrcvm.source_domain_id        = 'Observation'
left join @cdm_schema.final_visit_ids fv on fv.encounter_id = a.encounter
left join @synthea_schema.encounters e   on a.encounter = e.id and a.patient = e.patient
left join @cdm_schema.provider pr        on e.provider = pr.provider_source_value
join @cdm_schema.person p                on p.person_source_value = a.patient
;

-- ─── 2. conditions routed to Observation domain ──────────────────────────────
insert into @cdm_schema.observation (
    observation_id, person_id, observation_concept_id,
    observation_date, observation_datetime, observation_type_concept_id,
    value_as_number, value_as_string, value_as_concept_id,
    qualifier_concept_id, unit_concept_id,
    provider_id, visit_occurrence_id, visit_detail_id,
    observation_source_value, observation_source_concept_id,
    unit_source_value, qualifier_source_value
)
select
    hashtextextended(
        'c:' || c.patient::text || '|' || coalesce(c.code,'') || '|' || c.start::text,
        0)::bigint                                AS observation_id,
    p.person_id                                   AS person_id,
    srctostdvm.target_concept_id                  AS observation_concept_id,
    c.start                                       AS observation_date,
    c.start                                       AS observation_datetime,
    38000280                                      AS observation_type_concept_id,
    cast(null as float)                           AS value_as_number,
    cast(null as varchar)                         AS value_as_string,
    0                                             AS value_as_concept_id,
    0                                             AS qualifier_concept_id,
    0                                             AS unit_concept_id,
    pr.provider_id                                AS provider_id,
    fv.visit_occurrence_id_new                    AS visit_occurrence_id,
    fv.visit_occurrence_id_new + 1000000          AS visit_detail_id,
    c.code                                        AS observation_source_value,
    srctosrcvm.source_concept_id                  AS observation_source_concept_id,
    cast(null as varchar)                         AS unit_source_value,
    cast(null as varchar)                         AS qualifier_source_value
from @synthea_schema.conditions c
join @cdm_schema.source_to_standard_vocab_map srctostdvm
  on srctostdvm.source_code             = c.code
 and srctostdvm.target_domain_id        = 'Observation'
 and srctostdvm.target_vocabulary_id    = 'SNOMED'
 and srctostdvm.target_standard_concept = 'S'
 and srctostdvm.target_invalid_reason is null
join @cdm_schema.source_to_source_vocab_map srctosrcvm
  on srctosrcvm.source_code             = c.code
 and srctosrcvm.source_vocabulary_id    = 'SNOMED'
 and srctosrcvm.source_domain_id        = 'Observation'
left join @cdm_schema.final_visit_ids fv on fv.encounter_id = c.encounter
left join @synthea_schema.encounters e   on c.encounter = e.id and c.patient = e.patient
left join @cdm_schema.provider pr        on e.provider = pr.provider_source_value
join @cdm_schema.person p                on p.person_source_value = c.patient
;

-- ─── 3. observations (LOINC) → observation ───────────────────────────────────
insert into @cdm_schema.observation (
    observation_id, person_id, observation_concept_id,
    observation_date, observation_datetime, observation_type_concept_id,
    value_as_number, value_as_string, value_as_concept_id,
    qualifier_concept_id, unit_concept_id,
    provider_id, visit_occurrence_id, visit_detail_id,
    observation_source_value, observation_source_concept_id,
    unit_source_value, qualifier_source_value
)
select
    hashtextextended(
        'o:' || o.patient::text || '|' || coalesce(o.code,'') || '|' || o.date::text
            || '|' || coalesce(left(o.value, 50), ''),
        0)::bigint                                AS observation_id,
    p.person_id                                   AS person_id,
    srctostdvm.target_concept_id                  AS observation_concept_id,
    o.date                                        AS observation_date,
    o.date                                        AS observation_datetime,
    38000280                                      AS observation_type_concept_id,
    cast(null as float)                           AS value_as_number,
    cast(null as varchar)                         AS value_as_string,
    0                                             AS value_as_concept_id,
    0                                             AS qualifier_concept_id,
    0                                             AS unit_concept_id,
    pr.provider_id                                AS provider_id,
    fv.visit_occurrence_id_new                    AS visit_occurrence_id,
    fv.visit_occurrence_id_new + 1000000          AS visit_detail_id,
    left(o.value, 50)                             AS observation_source_value,
    srctosrcvm.source_concept_id                  AS observation_source_concept_id,
    cast(null as varchar)                         AS unit_source_value,
    cast(null as varchar)                         AS qualifier_source_value
from @synthea_schema.observations o
join @cdm_schema.source_to_standard_vocab_map srctostdvm
  on srctostdvm.source_code             = o.code
 and srctostdvm.target_domain_id        = 'Observation'
 and srctostdvm.target_vocabulary_id    = 'LOINC'
 and srctostdvm.target_standard_concept = 'S'
 and srctostdvm.target_invalid_reason is null
join @cdm_schema.source_to_source_vocab_map srctosrcvm
  on srctosrcvm.source_code             = o.code
 and srctosrcvm.source_vocabulary_id    = 'LOINC'
 and srctosrcvm.source_domain_id        = 'Observation'
left join @cdm_schema.final_visit_ids fv on fv.encounter_id = o.encounter
left join @synthea_schema.encounters e   on o.encounter = e.id and o.patient = e.patient
left join @cdm_schema.provider pr        on e.provider = pr.provider_source_value
join @cdm_schema.person p                on p.person_source_value = o.patient
;

COMMIT;

