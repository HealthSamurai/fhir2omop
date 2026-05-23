-- cdm.device_exposure — from devices.csv (SNOMED → Device).

CREATE TABLE IF NOT EXISTS cdm.device_exposure (
    device_exposure_id              bigint NOT NULL,
    person_id                       bigint NOT NULL,
    device_concept_id               integer NOT NULL,
    device_exposure_start_date      date NOT NULL,
    device_exposure_start_datetime  timestamp,
    device_exposure_end_date        date,
    device_exposure_end_datetime    timestamp,
    device_type_concept_id          integer NOT NULL,
    unique_device_id                varchar(255),
    production_id                   varchar(255),
    quantity                        integer,
    provider_id                     bigint,
    visit_occurrence_id             bigint,
    visit_detail_id                 bigint,
    device_source_value             varchar(50),
    device_source_concept_id        integer
);
ALTER TABLE cdm.device_exposure ALTER COLUMN device_exposure_id  TYPE bigint USING device_exposure_id::bigint;
ALTER TABLE cdm.device_exposure ALTER COLUMN person_id           TYPE bigint USING person_id::bigint;
ALTER TABLE cdm.device_exposure ALTER COLUMN provider_id         TYPE bigint USING provider_id::bigint;
ALTER TABLE cdm.device_exposure ALTER COLUMN visit_occurrence_id TYPE bigint USING visit_occurrence_id::bigint;

DROP TABLE IF EXISTS _synthea_devices;
CREATE TEMP TABLE _synthea_devices (
    "START" timestamp, "STOP" timestamp,
    "PATIENT" text, "ENCOUNTER" text,
    "CODE" text, "DESCRIPTION" text, "UDI" text
);
COPY _synthea_devices FROM '/synthea/csv/devices.csv' WITH (FORMAT csv, HEADER true);

TRUNCATE cdm.device_exposure;
INSERT INTO cdm.device_exposure (
    device_exposure_id, person_id, device_concept_id,
    device_exposure_start_date, device_exposure_start_datetime,
    device_exposure_end_date, device_exposure_end_datetime,
    device_type_concept_id, unique_device_id, production_id, quantity,
    provider_id, visit_occurrence_id, visit_detail_id,
    device_source_value, device_source_concept_id
)
SELECT
    row_number() OVER (ORDER BY d."PATIENT", d."START", d."CODE"),
    hashtextextended(d."PATIENT", 0)::bigint,
    std.concept_id,
    d."START"::date, d."START",
    d."STOP"::date,  d."STOP",
    32817, left(d."UDI", 255), NULL, NULL,
    NULL, hashtextextended(d."ENCOUNTER", 0)::bigint, NULL,
    d."CODE", src.concept_id
FROM _synthea_devices d
JOIN vocab.concept src
  ON src.vocabulary_id = 'SNOMED' AND src.concept_code = d."CODE"
JOIN vocab.concept_relationship rel
  ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
JOIN vocab.concept std
  ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S' AND std.domain_id = 'Device';
