-- cdm.drug_exposure — medications.csv (RxNorm → Drug) + immunizations.csv
-- (CVX → Drug; no-op until CVX is in the Athena bundle).

CREATE TABLE IF NOT EXISTS cdm.drug_exposure (
    drug_exposure_id              bigint NOT NULL,
    person_id                     bigint NOT NULL,
    drug_concept_id               integer NOT NULL,
    drug_exposure_start_date      date NOT NULL,
    drug_exposure_start_datetime  timestamp,
    drug_exposure_end_date        date NOT NULL,
    drug_exposure_end_datetime    timestamp,
    verbatim_end_date             date,
    drug_type_concept_id          integer NOT NULL,
    stop_reason                   varchar(20),
    refills                       integer,
    quantity                      numeric,
    days_supply                   integer,
    sig                           text,
    route_concept_id              integer,
    lot_number                    varchar(50),
    provider_id                   bigint,
    visit_occurrence_id           bigint,
    visit_detail_id               bigint,
    drug_source_value             varchar(50),
    drug_source_concept_id        integer,
    route_source_value            varchar(50),
    dose_unit_source_value        varchar(50)
);
ALTER TABLE cdm.drug_exposure ALTER COLUMN drug_exposure_id    TYPE bigint USING drug_exposure_id::bigint;
ALTER TABLE cdm.drug_exposure ALTER COLUMN person_id           TYPE bigint USING person_id::bigint;
ALTER TABLE cdm.drug_exposure ALTER COLUMN provider_id         TYPE bigint USING provider_id::bigint;
ALTER TABLE cdm.drug_exposure ALTER COLUMN visit_occurrence_id TYPE bigint USING visit_occurrence_id::bigint;

DROP TABLE IF EXISTS _synthea_medications;
CREATE TEMP TABLE _synthea_medications (
    "START" timestamp, "STOP" timestamp,
    "PATIENT" text, "PAYER" text, "ENCOUNTER" text,
    "CODE" text, "DESCRIPTION" text,
    "BASE_COST" numeric, "PAYER_COVERAGE" numeric, "DISPENSES" integer, "TOTALCOST" numeric,
    "REASONCODE" text, "REASONDESCRIPTION" text
);
COPY _synthea_medications FROM '/synthea/csv/medications.csv' WITH (FORMAT csv, HEADER true);

DROP TABLE IF EXISTS _synthea_immunizations;
CREATE TEMP TABLE _synthea_immunizations (
    "DATE" timestamp, "PATIENT" text, "ENCOUNTER" text,
    "CODE" text, "DESCRIPTION" text, "BASE_COST" numeric
);
COPY _synthea_immunizations FROM '/synthea/csv/immunizations.csv' WITH (FORMAT csv, HEADER true);

TRUNCATE cdm.drug_exposure;

-- medications.csv → drug_exposure (RxNorm)
INSERT INTO cdm.drug_exposure (
    drug_exposure_id, person_id, drug_concept_id,
    drug_exposure_start_date, drug_exposure_start_datetime,
    drug_exposure_end_date, drug_exposure_end_datetime, verbatim_end_date,
    drug_type_concept_id, stop_reason, refills, quantity, days_supply, sig,
    route_concept_id, lot_number, provider_id, visit_occurrence_id, visit_detail_id,
    drug_source_value, drug_source_concept_id, route_source_value, dose_unit_source_value
)
SELECT
    row_number() OVER (ORDER BY m."PATIENT", m."START", m."CODE"),
    hashtextextended(m."PATIENT", 0)::bigint,
    std.concept_id,
    m."START"::date, m."START",
    COALESCE(m."STOP", m."START")::date, COALESCE(m."STOP", m."START"), NULL,
    38000177, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, hashtextextended(m."ENCOUNTER", 0)::bigint, NULL,
    m."CODE", src.concept_id, NULL, NULL
FROM _synthea_medications m
JOIN vocab.concept src ON src.vocabulary_id = 'RxNorm' AND src.concept_code = m."CODE"
JOIN vocab.concept_relationship rel
  ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
JOIN vocab.concept std
  ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S' AND std.domain_id = 'Drug';

-- immunizations.csv → drug_exposure (CVX — when loaded in Athena)
INSERT INTO cdm.drug_exposure (
    drug_exposure_id, person_id, drug_concept_id,
    drug_exposure_start_date, drug_exposure_start_datetime,
    drug_exposure_end_date, drug_exposure_end_datetime, verbatim_end_date,
    drug_type_concept_id, stop_reason, refills, quantity, days_supply, sig,
    route_concept_id, lot_number, provider_id, visit_occurrence_id, visit_detail_id,
    drug_source_value, drug_source_concept_id, route_source_value, dose_unit_source_value
)
SELECT
    (SELECT COALESCE(max(drug_exposure_id), 0) FROM cdm.drug_exposure)
        + row_number() OVER (ORDER BY i."PATIENT", i."DATE", i."CODE"),
    hashtextextended(i."PATIENT", 0)::bigint,
    std.concept_id,
    i."DATE"::date, i."DATE",
    i."DATE"::date, i."DATE", NULL,
    32827, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, hashtextextended(i."ENCOUNTER", 0)::bigint, NULL,
    i."CODE", src.concept_id, NULL, NULL
FROM _synthea_immunizations i
JOIN vocab.concept src ON src.vocabulary_id = 'CVX' AND src.concept_code = i."CODE"
JOIN vocab.concept_relationship rel
  ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
JOIN vocab.concept std
  ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S' AND std.domain_id = 'Drug';
