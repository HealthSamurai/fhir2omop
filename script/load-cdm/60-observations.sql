-- cdm.measurement + cdm.observation — from observations.csv via LOINC
-- + Maps-to + domain routing. Same logic as our FHIR pipeline so the
-- diff reflects only Synthea-side categorization gaps.

CREATE TABLE IF NOT EXISTS cdm.measurement (
    measurement_id              bigint NOT NULL,
    person_id                   bigint NOT NULL,
    measurement_concept_id      integer NOT NULL,
    measurement_date            date NOT NULL,
    measurement_datetime        timestamp,
    measurement_time            varchar(10),
    measurement_type_concept_id integer NOT NULL,
    operator_concept_id         integer,
    value_as_number             numeric,
    value_as_concept_id         integer,
    unit_concept_id             integer,
    range_low                   numeric,
    range_high                  numeric,
    provider_id                 bigint,
    visit_occurrence_id         bigint,
    visit_detail_id             bigint,
    measurement_source_value    varchar(50),
    measurement_source_concept_id integer,
    unit_source_value           varchar(50),
    unit_source_concept_id      integer,
    value_source_value          varchar(50),
    measurement_event_id        bigint,
    meas_event_field_concept_id integer
);
ALTER TABLE cdm.measurement ALTER COLUMN measurement_id      TYPE bigint USING measurement_id::bigint;
ALTER TABLE cdm.measurement ALTER COLUMN person_id           TYPE bigint USING person_id::bigint;
ALTER TABLE cdm.measurement ALTER COLUMN provider_id         TYPE bigint USING provider_id::bigint;
ALTER TABLE cdm.measurement ALTER COLUMN visit_occurrence_id TYPE bigint USING visit_occurrence_id::bigint;

CREATE TABLE IF NOT EXISTS cdm.observation (
    observation_id              bigint NOT NULL,
    person_id                   bigint NOT NULL,
    observation_concept_id      integer NOT NULL,
    observation_date            date NOT NULL,
    observation_datetime        timestamp,
    observation_type_concept_id integer NOT NULL,
    value_as_number             numeric,
    value_as_string             varchar(60),
    value_as_concept_id         integer,
    qualifier_concept_id        integer,
    unit_concept_id             integer,
    provider_id                 bigint,
    visit_occurrence_id         bigint,
    visit_detail_id             bigint,
    observation_source_value    varchar(50),
    observation_source_concept_id integer,
    unit_source_value           varchar(50),
    qualifier_source_value      varchar(50),
    value_source_value          varchar(50),
    observation_event_id        bigint,
    obs_event_field_concept_id  integer
);
ALTER TABLE cdm.observation ALTER COLUMN observation_id      TYPE bigint USING observation_id::bigint;
ALTER TABLE cdm.observation ALTER COLUMN person_id           TYPE bigint USING person_id::bigint;
ALTER TABLE cdm.observation ALTER COLUMN provider_id         TYPE bigint USING provider_id::bigint;
ALTER TABLE cdm.observation ALTER COLUMN visit_occurrence_id TYPE bigint USING visit_occurrence_id::bigint;

DROP TABLE IF EXISTS _synthea_observations;
CREATE TEMP TABLE _synthea_observations (
    "DATE" timestamp,
    "PATIENT" text, "ENCOUNTER" text, "CATEGORY" text,
    "CODE" text, "DESCRIPTION" text,
    "VALUE" text, "UNITS" text, "TYPE" text
);
COPY _synthea_observations FROM '/synthea/csv/observations.csv' WITH (FORMAT csv, HEADER true);

DROP TABLE IF EXISTS _obs_resolved;
CREATE TEMP TABLE _obs_resolved AS
SELECT
    o.*,
    std.concept_id AS std_concept_id,
    std.domain_id  AS std_domain,
    src.concept_id AS src_concept_id,
    u.concept_id   AS unit_concept_id
FROM _synthea_observations o
LEFT JOIN vocab.concept src ON src.vocabulary_id = 'LOINC' AND src.concept_code = o."CODE"
LEFT JOIN vocab.concept_relationship rel
       ON rel.concept_id_1   = src.concept_id
      AND rel.relationship_id = 'Maps to'
      AND rel.invalid_reason IS NULL
LEFT JOIN vocab.concept std
       ON std.concept_id      = rel.concept_id_2
      AND std.standard_concept = 'S'
      AND std.domain_id IN ('Measurement', 'Observation')
LEFT JOIN vocab.concept u
       ON u.vocabulary_id = 'UCUM' AND u.concept_code = o."UNITS" AND u.standard_concept = 'S';

TRUNCATE cdm.measurement;
INSERT INTO cdm.measurement (
    measurement_id, person_id, measurement_concept_id,
    measurement_date, measurement_datetime, measurement_time,
    measurement_type_concept_id, operator_concept_id, value_as_number,
    value_as_concept_id, unit_concept_id, range_low, range_high,
    provider_id, visit_occurrence_id, visit_detail_id,
    measurement_source_value, measurement_source_concept_id,
    unit_source_value, unit_source_concept_id, value_source_value,
    measurement_event_id, meas_event_field_concept_id
)
SELECT
    row_number() OVER (ORDER BY r."PATIENT", r."DATE", r."CODE"),
    hashtextextended(r."PATIENT", 0)::bigint,
    r.std_concept_id, r."DATE"::date, r."DATE", NULL, 32817, NULL,
    CASE WHEN r."TYPE" = 'numeric' THEN r."VALUE"::numeric END,
    NULL, r.unit_concept_id, NULL, NULL,
    NULL, hashtextextended(r."ENCOUNTER", 0)::bigint, NULL,
    r."CODE", r.src_concept_id,
    left(r."UNITS", 50), NULL, left(r."VALUE", 50),
    NULL, NULL
FROM _obs_resolved r
WHERE r.std_domain = 'Measurement';

TRUNCATE cdm.observation;
INSERT INTO cdm.observation (
    observation_id, person_id, observation_concept_id,
    observation_date, observation_datetime, observation_type_concept_id,
    value_as_number, value_as_string, value_as_concept_id,
    qualifier_concept_id, unit_concept_id,
    provider_id, visit_occurrence_id, visit_detail_id,
    observation_source_value, observation_source_concept_id,
    unit_source_value, qualifier_source_value, value_source_value,
    observation_event_id, obs_event_field_concept_id
)
SELECT
    row_number() OVER (ORDER BY r."PATIENT", r."DATE", r."CODE"),
    hashtextextended(r."PATIENT", 0)::bigint,
    r.std_concept_id, r."DATE"::date, r."DATE", 32817,
    CASE WHEN r."TYPE" = 'numeric'   THEN r."VALUE"::numeric END,
    CASE WHEN r."TYPE" <> 'numeric' THEN left(r."VALUE", 60) END,
    NULL, NULL, r.unit_concept_id,
    NULL, hashtextextended(r."ENCOUNTER", 0)::bigint, NULL,
    r."CODE", r.src_concept_id,
    left(r."UNITS", 50), NULL, left(r."VALUE", 50),
    NULL, NULL
FROM _obs_resolved r
WHERE r.std_domain = 'Observation';
