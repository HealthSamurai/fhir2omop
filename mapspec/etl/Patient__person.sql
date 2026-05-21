-- ─────────────────────────────────────────────────────────────────────────────
-- Stage-2 ETL: Patient (FHIR R4) → person (OMOP CDM v5.3)
-- ─────────────────────────────────────────────────────────────────────────────
-- Demo / runnable. Consumes:
--   • staging.patient_person   ← output of mapspec/views/Patient__person.view.json
--   • cdm_ours_fhir.location   ← created earlier from same staging (see step 1)
--
-- Routing key: no domain routing for Patient. One Patient = one person row.
--
-- The matching ETL-Synthea source is insert_person.sql (60 lines, SQL Server
-- flavor). Our version is ~70 lines plain Postgres SQL. Key differences:
--   • Race mapping covers all 6 OMB codes (ETL-Synthea covers only 3 — bug #2).
--   • ZIP preserved as text including leading zeros (bug #1 doesn't apply).
--   • Gender source: us_core_birthsex preferred over Patient.gender.
-- ─────────────────────────────────────────────────────────────────────────────

-- Surrogate person_id = hashtextextended(Patient.id, 0)::bigint.
-- The SAME expression is used inline by downstream ETLs (Encounter, Condition,
-- Observation, …) to resolve the person_id FK from a subject.reference without
-- a JOIN to cdm_ours_fhir.person.

-- All FHIR→OMOP concept resolution goes through ConceptMap tables in cm.*
-- (materialized from mapspec/profiles/*.cm.json by ctx.fns.conceptmap.materialize).
-- Gender prefers us-core-birthsex over Patient.gender; both codes live in the
-- same cm.gender_to_omop table, so a single COALESCE picks the right key.
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/gender-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/race-omb-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/ethnicity-omb-to-omop
SELECT
    hashtextextended(v.id, 0)::bigint              AS person_id,

    COALESCE(g.concept_id, 0)                      AS gender_concept_id,

    EXTRACT(YEAR  FROM v.birth_date::date)::int    AS year_of_birth,
    EXTRACT(MONTH FROM v.birth_date::date)::int    AS month_of_birth,
    EXTRACT(DAY   FROM v.birth_date::date)::int    AS day_of_birth,
    v.birth_date::timestamp                        AS birth_datetime,

    COALESCE(r.concept_id, 0)                      AS race_concept_id,
    COALESCE(e.concept_id, 0)                      AS ethnicity_concept_id,

    referenceToId(v.location_zip)                  AS location_id,
    -- generalPractitioner / managingOrganization absent in Synthea, present
    -- in real-world data. View columns hold bare UUIDs (getReferenceKey()).
    referenceToId(v.general_practitioner_ref)      AS provider_id,
    referenceToId(v.managing_organization_ref)     AS care_site_id,

    v.id                                           AS person_source_value,
    COALESCE(v.us_core_birthsex, v.gender)         AS gender_source_value,
    -- source_concept_id == concept_id (no separate OMOP concept for FHIR-side
    -- source codes — the same Athena Gender/Race/Ethnicity concept covers both).
    COALESCE(g.concept_id, 0)                      AS gender_source_concept_id,
    v.race_text                                    AS race_source_value,
    COALESCE(r.concept_id, 0)                      AS race_source_concept_id,
    v.ethnicity_text                               AS ethnicity_source_value,
    COALESCE(e.concept_id, 0)                      AS ethnicity_source_concept_id

FROM staging.patient_person v
LEFT JOIN cm.gender_to_omop        g ON g.source_code = COALESCE(v.us_core_birthsex, v.gender)
LEFT JOIN cm.race_omb_to_omop      r ON r.source_code = v.race_omb_code
LEFT JOIN cm.ethnicity_omb_to_omop e ON e.source_code = v.ethnicity_omb_code
;
