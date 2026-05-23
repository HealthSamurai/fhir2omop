-- cdm.procedure_occurrence — from procedures.csv via SNOMED + Maps-to
-- + domain='Procedure'.

CREATE TABLE IF NOT EXISTS cdm.procedure_occurrence (
    procedure_occurrence_id      bigint NOT NULL,
    person_id                    bigint NOT NULL,
    procedure_concept_id         integer NOT NULL,
    procedure_date               date NOT NULL,
    procedure_datetime           timestamp,
    procedure_end_date           date,
    procedure_end_datetime       timestamp,
    procedure_type_concept_id    integer NOT NULL,
    modifier_concept_id          integer,
    quantity                     integer,
    provider_id                  bigint,
    visit_occurrence_id          bigint,
    visit_detail_id              bigint,
    procedure_source_value       varchar(50),
    procedure_source_concept_id  integer,
    modifier_source_value        varchar(50)
);
ALTER TABLE cdm.procedure_occurrence ALTER COLUMN procedure_occurrence_id TYPE bigint USING procedure_occurrence_id::bigint;
ALTER TABLE cdm.procedure_occurrence ALTER COLUMN person_id           TYPE bigint USING person_id::bigint;
ALTER TABLE cdm.procedure_occurrence ALTER COLUMN provider_id         TYPE bigint USING provider_id::bigint;
ALTER TABLE cdm.procedure_occurrence ALTER COLUMN visit_occurrence_id TYPE bigint USING visit_occurrence_id::bigint;

DROP TABLE IF EXISTS _synthea_procedures;
CREATE TEMP TABLE _synthea_procedures (
    "START" timestamp, "STOP" timestamp,
    "PATIENT" text, "ENCOUNTER" text,
    "CODE" text, "DESCRIPTION" text,
    "BASE_COST" numeric, "REASONCODE" text, "REASONDESCRIPTION" text
);
COPY _synthea_procedures FROM '/synthea/csv/procedures.csv' WITH (FORMAT csv, HEADER true);

TRUNCATE cdm.procedure_occurrence;
INSERT INTO cdm.procedure_occurrence (
    procedure_occurrence_id, person_id, procedure_concept_id,
    procedure_date, procedure_datetime, procedure_end_date, procedure_end_datetime,
    procedure_type_concept_id, modifier_concept_id, quantity,
    provider_id, visit_occurrence_id, visit_detail_id,
    procedure_source_value, procedure_source_concept_id, modifier_source_value
)
SELECT
    row_number() OVER (ORDER BY p."PATIENT", p."START", p."CODE"),
    hashtextextended(p."PATIENT", 0)::bigint,
    std.concept_id,
    p."START"::date, p."START"::timestamp,
    p."STOP"::date,  p."STOP"::timestamp,
    32827, NULL, NULL,
    NULL, hashtextextended(p."ENCOUNTER", 0)::bigint, NULL,
    p."CODE", src.concept_id, NULL
FROM _synthea_procedures p
JOIN vocab.concept src
  ON src.vocabulary_id = 'SNOMED' AND src.concept_code = p."CODE"
JOIN vocab.concept_relationship rel
  ON rel.concept_id_1   = src.concept_id
 AND rel.relationship_id = 'Maps to'
 AND rel.invalid_reason IS NULL
JOIN vocab.concept std
  ON std.concept_id       = rel.concept_id_2
 AND std.standard_concept = 'S'
 AND std.domain_id        = 'Procedure';
