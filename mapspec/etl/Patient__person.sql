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

SELECT
    ROW_NUMBER() OVER (ORDER BY v.id)              AS person_id,

    -- Gender: prefer birthsex (M/F → 8507/8532), fall back to Patient.gender.
    CASE upper(coalesce(v.us_core_birthsex, ''))
        WHEN 'M' THEN 8507
        WHEN 'F' THEN 8532
        ELSE CASE lower(coalesce(v.gender, ''))
            WHEN 'male'    THEN 8507
            WHEN 'female'  THEN 8532
            WHEN 'other'   THEN 8521
            WHEN 'unknown' THEN 8551
            ELSE 0
        END
    END                                            AS gender_concept_id,

    EXTRACT(YEAR  FROM v.birth_date::date)::int    AS year_of_birth,
    EXTRACT(MONTH FROM v.birth_date::date)::int    AS month_of_birth,
    EXTRACT(DAY   FROM v.birth_date::date)::int    AS day_of_birth,
    v.birth_date::timestamp                        AS birth_datetime,

    -- Race: full OMB → concept map (all 5 categories + UNK).
    -- Compare to ETL-Synthea insert_person.sql which only maps 3 of 5.
    CASE v.race_omb_code
        WHEN '2106-3' THEN 8527    -- White
        WHEN '2054-5' THEN 8516    -- Black or African American
        WHEN '2028-9' THEN 8515    -- Asian
        WHEN '1002-5' THEN 8657    -- American Indian or Alaska Native
        WHEN '2076-8' THEN 8557    -- Native Hawaiian or Other Pacific Islander
        WHEN 'UNK'    THEN 0       -- Unknown — stays 0 (preserves cardinality)
        ELSE 0
    END                                            AS race_concept_id,

    -- Ethnicity: OMB → concept map.
    CASE v.ethnicity_omb_code
        WHEN '2135-2' THEN 38003563   -- Hispanic or Latino
        WHEN '2186-5' THEN 38003564   -- Not Hispanic or Latino
        ELSE 0
    END                                            AS ethnicity_concept_id,

    l.location_id,
    NULL::bigint                                   AS provider_id,    -- Synthea: not in Patient
    NULL::bigint                                   AS care_site_id,   -- Synthea: not in Patient

    v.id                                           AS person_source_value,
    coalesce(v.us_core_birthsex, v.gender)         AS gender_source_value,
    0                                              AS gender_source_concept_id,
    v.race_text                                    AS race_source_value,
    0                                              AS race_source_concept_id,
    v.ethnicity_text                               AS ethnicity_source_value,
    0                                              AS ethnicity_source_concept_id

FROM staging.patient_person v
LEFT JOIN cdm_ours_fhir.location l
       ON l.city = v.address_city
      AND l.state = v.address_state
      AND l.zip   = v.address_zip
;
