-- cdm.visit_occurrence — from encounters.csv via cm.encounter_class_to_omop.

CREATE TABLE IF NOT EXISTS cdm.visit_occurrence (
    visit_occurrence_id           bigint NOT NULL,
    person_id                     bigint NOT NULL,
    visit_concept_id              integer NOT NULL,
    visit_start_date              date NOT NULL,
    visit_start_datetime          timestamp,
    visit_end_date                date NOT NULL,
    visit_end_datetime            timestamp,
    visit_type_concept_id         integer NOT NULL,
    provider_id                   bigint,
    care_site_id                  bigint,
    visit_source_value            varchar(50),
    visit_source_concept_id       integer,
    admitted_from_concept_id      integer,
    admitted_from_source_value    varchar(50),
    discharged_to_concept_id      integer,
    discharged_to_source_value    varchar(50),
    preceding_visit_occurrence_id bigint
);
ALTER TABLE cdm.visit_occurrence ALTER COLUMN visit_occurrence_id           TYPE bigint USING visit_occurrence_id::bigint;
ALTER TABLE cdm.visit_occurrence ALTER COLUMN person_id                     TYPE bigint USING person_id::bigint;
ALTER TABLE cdm.visit_occurrence ALTER COLUMN provider_id                   TYPE bigint USING provider_id::bigint;
ALTER TABLE cdm.visit_occurrence ALTER COLUMN care_site_id                  TYPE bigint USING care_site_id::bigint;
ALTER TABLE cdm.visit_occurrence ALTER COLUMN preceding_visit_occurrence_id TYPE bigint USING preceding_visit_occurrence_id::bigint;

DROP TABLE IF EXISTS _synthea_encounters;
CREATE TEMP TABLE _synthea_encounters (
    "Id" text, "START" timestamp, "STOP" timestamp,
    "PATIENT" text, "ORGANIZATION" text, "PROVIDER" text, "PAYER" text,
    "ENCOUNTERCLASS" text, "CODE" text, "DESCRIPTION" text,
    "BASE_ENCOUNTER_COST" numeric, "TOTAL_CLAIM_COST" numeric, "PAYER_COVERAGE" numeric,
    "REASONCODE" text, "REASONDESCRIPTION" text
);
COPY _synthea_encounters FROM '/synthea/csv/encounters.csv' WITH (FORMAT csv, HEADER true);

TRUNCATE cdm.visit_occurrence;
INSERT INTO cdm.visit_occurrence (
    visit_occurrence_id, person_id, visit_concept_id,
    visit_start_date, visit_start_datetime, visit_end_date, visit_end_datetime,
    visit_type_concept_id, provider_id, care_site_id,
    visit_source_value, visit_source_concept_id,
    admitted_from_concept_id, admitted_from_source_value,
    discharged_to_concept_id, discharged_to_source_value,
    preceding_visit_occurrence_id
)
SELECT
    hashtextextended("Id", 0)::bigint,
    hashtextextended("PATIENT", 0)::bigint,
    COALESCE(cls.concept_id, 0),
    "START"::date, "START",
    COALESCE("STOP", "START")::date, COALESCE("STOP", "START"),
    32827,
    CASE WHEN "PROVIDER"     = '' THEN NULL ELSE hashtextextended("PROVIDER",     0)::bigint END,
    CASE WHEN "ORGANIZATION" = '' THEN NULL ELSE hashtextextended("ORGANIZATION", 0)::bigint END,
    "Id", 0, 0, NULL, 0, NULL, NULL
FROM _synthea_encounters
LEFT JOIN cm.encounter_class_to_omop cls
       ON cls.source_code = "ENCOUNTERCLASS";
