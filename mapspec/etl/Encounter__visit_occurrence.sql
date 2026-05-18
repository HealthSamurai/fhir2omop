-- ─────────────────────────────────────────────────────────────────────────────
-- Stage-2 ETL: Encounter (FHIR R4) → visit_occurrence (OMOP CDM v5.3)
-- ─────────────────────────────────────────────────────────────────────────────
-- Consumes:
--   • staging.encounter_visit  (output of mapspec/views/Encounter__visit_occurrence.view.json)
--   • fhir.patient             (orphan check only — its existence proves the Patient is loaded)
--
-- Surrogate visit_occurrence_id = hashtextextended(Encounter.id, 0)::bigint.
-- FKs are inlined as the same hash applied to the extracted identifier — no
-- JOIN to cdm_ours_fhir.person/provider/care_site. The JOIN to fhir.patient
-- exists only to drop encounters whose Patient isn't in our loaded universe.
--
-- Hash inputs by FK:
--   • person_id     ← hash(patient UUID extracted from subject.reference)
--   • provider_id   ← hash(NPI extracted from performer.individual.reference)
--                     (matches Practitioner__provider's hash(npi) mint)
--   • care_site_id  ← hash(Org UUID extracted from serviceProvider.reference)
--
-- Differences vs ETL-Synthea's insert_visit_occurrence.sql:
--   • Reference does encounter-rollup (collapse multiple inpatient claim lines
--     into one IP visit via AllVisitTable + AAVITable + final_visit_ids).
--     For Synthea data the rollup typically collapses 0-22 encounters, so the
--     one-row-per-Encounter approach gives essentially the same count.
--   • Class → visit_concept_id covered here for AMB/IMP/EMER/HH/SS/OBSENC/
--     ACUTE/VR. The 4 ETL-Synthea hardcodes (AMB=9202, IMP=9201, EMER=9203,
--     HH=581476) are preserved; we add a few more for completeness.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    hashtextextended(v.id, 0)::bigint                    AS visit_occurrence_id,

    -- person_id FK — inline hash, mirrors Patient__person's mint.
    hashtextextended(regexp_replace(v.subject_ref, '^.*[:/|]', ''), 0)::bigint
                                                         AS person_id,

    -- ActEncounterCode → standard visit_concept_id.
    CASE upper(v.class_code)
        WHEN 'AMB'    THEN 9202     -- Outpatient Visit
        WHEN 'IMP'    THEN 9201     -- Inpatient Visit
        WHEN 'EMER'   THEN 9203     -- Emergency Room Visit
        WHEN 'HH'     THEN 581476   -- Home Visit
        WHEN 'OBSENC' THEN 581478   -- Observation Visit
        WHEN 'ACUTE'  THEN 9201     -- maps to Inpatient
        WHEN 'SS'     THEN 8870     -- Emergency Room - Hospital
        WHEN 'VR'     THEN 581399   -- Telehealth
        WHEN 'FLD'    THEN 581476   -- Home Visit fallback
        ELSE 0
    END                                                  AS visit_concept_id,

    v.period_start::date                                 AS visit_start_date,
    v.period_start::timestamp                            AS visit_start_datetime,
    coalesce(v.period_end, v.period_start)::date         AS visit_end_date,
    coalesce(v.period_end, v.period_start)::timestamp    AS visit_end_datetime,

    32827                                                AS visit_type_concept_id,  -- 'EHR encounter record'

    -- provider_id FK — hash extracted NPI. NULL when no performer.
    CASE WHEN v.performer_ref IS NULL OR v.performer_ref = '' THEN NULL::bigint
         ELSE hashtextextended(regexp_replace(v.performer_ref, '^.*[:/|]', ''), 0)::bigint
    END                                                  AS provider_id,

    -- care_site_id FK — hash extracted Org UUID. NULL when no serviceProvider.
    CASE WHEN v.service_provider_ref IS NULL OR v.service_provider_ref = '' THEN NULL::bigint
         ELSE hashtextextended(regexp_replace(v.service_provider_ref, '^.*[:/|]', ''), 0)::bigint
    END                                                  AS care_site_id,

    v.id                                                 AS visit_source_value,
    0                                                    AS visit_source_concept_id,

    -- Hospitalization details — Synthea omits them, so these are NULL/0.
    0                                                    AS admitting_source_concept_id,
    v.admit_source_code                                  AS admitting_source_value,
    0                                                    AS discharge_to_concept_id,
    v.discharge_disposition_code                         AS discharge_to_source_value,

    NULL::bigint                                         AS preceding_visit_occurrence_id

FROM staging.encounter_visit v

-- Orphan filter: only keep encounters whose Patient is loaded in fhir.patient.
-- This replaces the old `JOIN cdm_ours_fhir.person ... WHERE person_id IS NOT NULL`
-- check; the existence test is the same, but we no longer borrow the surrogate ID.
JOIN fhir.patient fp
  ON fp.id = regexp_replace(v.subject_ref, '^.*[:/|]', '')
;
