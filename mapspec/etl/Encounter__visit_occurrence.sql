-- ─────────────────────────────────────────────────────────────────────────────
-- Stage-2 ETL: Encounter (FHIR R4) → visit_occurrence (OMOP CDM v5.3)
-- ─────────────────────────────────────────────────────────────────────────────
-- Consumes:
--   • staging.encounter_visit       (output of mapspec/views/Encounter__visit_occurrence.view.json)
--   • cdm_ours_fhir.person          (must be populated first — FK target)
--   • cdm_ours_fhir.provider        (optional FK; null when absent)
--   • cdm_ours_fhir.care_site       (optional FK; null when absent)
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
    ROW_NUMBER() OVER (ORDER BY v.period_start, v.id)   AS visit_occurrence_id,
    p.person_id,

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

    pr.provider_id,
    cs.care_site_id,

    v.id                                                 AS visit_source_value,
    0                                                    AS visit_source_concept_id,

    -- Hospitalization details — Synthea omits them, so these are NULL/0.
    0                                                    AS admitting_source_concept_id,
    v.admit_source_code                                  AS admitting_source_value,
    0                                                    AS discharge_to_concept_id,
    v.discharge_disposition_code                         AS discharge_to_source_value,

    NULL::bigint                                         AS preceding_visit_occurrence_id

FROM staging.encounter_visit v

-- Resolve subject reference → person_id.
-- subject_ref can be 'Patient/UUID', 'urn:uuid:UUID', or
-- 'Patient?identifier=…|UUID'. The trailing identifier is whatever comes
-- after the LAST of '/', ':', or '|'. regexp_replace strips the prefix.
LEFT JOIN cdm_ours_fhir.person p
       ON p.person_source_value = regexp_replace(v.subject_ref, '^.*[:/|]', '')

-- performer_ref is 'Practitioner?identifier=…|NPI'. Look up by NPI column.
LEFT JOIN cdm_ours_fhir.provider pr
       ON pr.npi = regexp_replace(v.performer_ref, '^.*[:/|]', '')

LEFT JOIN cdm_ours_fhir.care_site cs
       ON cs.care_site_source_value = regexp_replace(v.service_provider_ref, '^.*[:/|]', '')

WHERE p.person_id IS NOT NULL    -- drop encounters whose patient isn't loaded
;
