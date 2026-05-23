-- cdm.condition_occurrence — from conditions.csv via SNOMED + Maps-to
-- + domain='Condition' filter (matches our FHIR pipeline).

CREATE TABLE IF NOT EXISTS cdm.condition_occurrence (
    condition_occurrence_id     bigint NOT NULL,
    person_id                   bigint NOT NULL,
    condition_concept_id        integer NOT NULL,
    condition_start_date        date NOT NULL,
    condition_start_datetime    timestamp,
    condition_end_date          date,
    condition_end_datetime      timestamp,
    condition_type_concept_id   integer NOT NULL,
    condition_status_concept_id integer,
    stop_reason                 varchar(20),
    provider_id                 bigint,
    visit_occurrence_id         bigint,
    visit_detail_id             bigint,
    condition_source_value      varchar(50),
    condition_source_concept_id integer,
    condition_status_source_value varchar(50)
);
ALTER TABLE cdm.condition_occurrence ALTER COLUMN condition_occurrence_id TYPE bigint USING condition_occurrence_id::bigint;
ALTER TABLE cdm.condition_occurrence ALTER COLUMN person_id               TYPE bigint USING person_id::bigint;
ALTER TABLE cdm.condition_occurrence ALTER COLUMN visit_occurrence_id     TYPE bigint USING visit_occurrence_id::bigint;
ALTER TABLE cdm.condition_occurrence ALTER COLUMN provider_id             TYPE bigint USING provider_id::bigint;

DROP TABLE IF EXISTS _synthea_conditions;
CREATE TEMP TABLE _synthea_conditions (
    "START" date, "STOP" date,
    "PATIENT" text, "ENCOUNTER" text,
    "CODE" text, "DESCRIPTION" text
);
COPY _synthea_conditions FROM '/synthea/csv/conditions.csv' WITH (FORMAT csv, HEADER true);

TRUNCATE cdm.condition_occurrence;
INSERT INTO cdm.condition_occurrence (
    condition_occurrence_id, person_id, condition_concept_id,
    condition_start_date, condition_start_datetime,
    condition_end_date, condition_end_datetime,
    condition_type_concept_id, condition_status_concept_id,
    stop_reason, provider_id, visit_occurrence_id, visit_detail_id,
    condition_source_value, condition_source_concept_id,
    condition_status_source_value
)
SELECT
    row_number() OVER (ORDER BY "PATIENT", "START", "CODE"),
    hashtextextended("PATIENT", 0)::bigint,
    std.concept_id,
    "START", "START"::timestamp,
    "STOP",  "STOP"::timestamp,
    32827, 0,
    NULL, NULL, hashtextextended("ENCOUNTER", 0)::bigint, NULL,
    "CODE", COALESCE(src.concept_id, 0), NULL
FROM _synthea_conditions
LEFT JOIN vocab.concept src
       ON src.vocabulary_id = 'SNOMED' AND src.concept_code = "CODE"
LEFT JOIN vocab.concept_relationship rel
       ON rel.concept_id_1   = src.concept_id
      AND rel.relationship_id = 'Maps to'
      AND rel.invalid_reason IS NULL
LEFT JOIN vocab.concept std
       ON std.concept_id       = rel.concept_id_2
      AND std.standard_concept = 'S'
      AND std.domain_id        = 'Condition'
WHERE std.concept_id IS NOT NULL;
