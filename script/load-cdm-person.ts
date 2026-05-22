#!/usr/bin/env bun
// Build cdm.person + cdm.location from synthea/output/csv/patients.csv via
// server-side COPY (Postgres reads the bind-mounted /synthea/csv/* directly).
// Reference oracle mirroring ETL-Synthea behavior.
import { SQL } from "bun";

const DSN = process.env.ATHENA_DSN ?? "postgresql://athena:athena@localhost:54392/athena";
const CSV_IN_DB = process.argv[2] ?? "/synthea/csv/patients.csv";

const sql = new SQL(DSN, { idleTimeout: 0, maxLifetime: 0 });
const t0 = Date.now();
const log = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(2)}s] ${m}`);

await sql`CREATE SCHEMA IF NOT EXISTS cdm`;

await sql.unsafe(`
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
    CREATE TABLE IF NOT EXISTS cdm.location (
        location_id bigint, address_1 varchar(50), address_2 varchar(50),
        city varchar(50), state varchar(2), zip varchar(9), county varchar(20),
        location_source_value varchar(50), country_concept_id integer,
        country_source_value varchar(80), latitude numeric, longitude numeric
    );
    CREATE TABLE IF NOT EXISTS cdm.person (
        person_id bigint NOT NULL, gender_concept_id integer NOT NULL,
        year_of_birth integer NOT NULL, month_of_birth integer, day_of_birth integer,
        birth_datetime timestamp, race_concept_id integer NOT NULL,
        ethnicity_concept_id integer NOT NULL, location_id bigint,
        provider_id bigint, care_site_id bigint,
        person_source_value varchar(50), gender_source_value varchar(50),
        gender_source_concept_id integer, race_source_value varchar(50),
        race_source_concept_id integer, ethnicity_source_value varchar(50),
        ethnicity_source_concept_id integer
    );
    ALTER TABLE cdm.location ALTER COLUMN location_id TYPE bigint USING location_id::bigint;
    ALTER TABLE cdm.person   ALTER COLUMN person_id   TYPE bigint USING person_id::bigint;
    ALTER TABLE cdm.person   ALTER COLUMN location_id TYPE bigint USING location_id::bigint;
`);

await sql.unsafe(`
    DROP TABLE IF EXISTS _synthea_patients;
    CREATE TEMP TABLE _synthea_patients (
        "Id" text, "BIRTHDATE" date, "DEATHDATE" date,
        "SSN" text, "DRIVERS" text, "PASSPORT" text,
        "PREFIX" text, "FIRST" text, "LAST" text, "SUFFIX" text, "MAIDEN" text,
        "MARITAL" text, "RACE" text, "ETHNICITY" text, "GENDER" text,
        "BIRTHPLACE" text, "ADDRESS" text, "CITY" text, "STATE" text, "COUNTY" text, "FIPS" text, "ZIP" text,
        "LAT" numeric, "LON" numeric,
        "HEALTHCARE_EXPENSES" numeric, "HEALTHCARE_COVERAGE" numeric, "INCOME" numeric
    )`);

// Server-side COPY — Postgres reads the bind-mounted file directly. The whole
// load is one round-trip; no row-by-row JS encoding.
await sql.unsafe(`COPY _synthea_patients FROM '${CSV_IN_DB}' WITH (FORMAT csv, HEADER true)`);
log(`COPY _synthea_patients FROM '${CSV_IN_DB}'`);

// Mappings mirror refs/refs/ETL-Synthea-installed/.../insert_person.sql:
//   gender M→8507, F→8532
//   race WHITE→8527, BLACK→8516, ASIAN→8515, else 0  (NATIVE/HAWAIIAN/OTHER intentionally → 0)
//   ethnicity HISPANIC→38003563, NONHISPANIC→38003564, else 0
await sql.unsafe(`
    TRUNCATE cdm.person;
    TRUNCATE cdm.location;

    INSERT INTO cdm.location (location_id, address_1, city, state, zip, location_source_value)
    SELECT
        hashtextextended("Id", 0)::bigint,
        "ADDRESS",
        "CITY",
        NULL,
        "ZIP",
        "STATE"
    FROM _synthea_patients
    WHERE "ZIP" IS NOT NULL OR "ADDRESS" IS NOT NULL;

    INSERT INTO cdm.person (
        person_id, gender_concept_id,
        year_of_birth, month_of_birth, day_of_birth, birth_datetime,
        race_concept_id, ethnicity_concept_id,
        location_id, provider_id, care_site_id,
        person_source_value, gender_source_value, gender_source_concept_id,
        race_source_value, race_source_concept_id,
        ethnicity_source_value, ethnicity_source_concept_id
    )
    SELECT
        hashtextextended("Id", 0)::bigint,
        CASE upper("GENDER") WHEN 'M' THEN 8507 WHEN 'F' THEN 8532 ELSE 0 END,
        EXTRACT(YEAR  FROM "BIRTHDATE")::int,
        EXTRACT(MONTH FROM "BIRTHDATE")::int,
        EXTRACT(DAY   FROM "BIRTHDATE")::int,
        "BIRTHDATE"::timestamp,
        CASE upper("RACE")
            WHEN 'WHITE' THEN 8527
            WHEN 'BLACK' THEN 8516
            WHEN 'ASIAN' THEN 8515
            ELSE 0
        END,
        CASE upper("ETHNICITY")
            WHEN 'HISPANIC'    THEN 38003563
            WHEN 'NONHISPANIC' THEN 38003564
            ELSE 0
        END,
        hashtextextended("Id", 0)::bigint,
        NULL, NULL,
        -- source_concept_id columns: ETL-Synthea hardcodes 0 (see
        -- refs/refs/ETL-Synthea-installed/.../insert_person.sql:58,60,62).
        -- We reproduce that here so the diff with our FHIR-driven pipeline
        -- shows the real divergence (we resolve M/F to Athena Gender
        -- 8507/8532 because they're a valid Gender vocab match).
        "Id", "GENDER",    0,
        "RACE",            0,
        "ETHNICITY",       0
    FROM _synthea_patients;
`);

// ── cdm.visit_occurrence ────────────────────────────────────────────────────
// Source: synthea/output/csv/encounters.csv — one row per encounter; the
// ENCOUNTERCLASS column is the same v3 ActCode (AMB/IMP/EMER/...) we use
// in our FHIR pipeline, joined against the same cm.encounter_class_to_omop.
await sql.unsafe(`
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
        visit_start_date, visit_start_datetime,
        visit_end_date, visit_end_datetime,
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
        "START"::date,
        "START",
        COALESCE("STOP", "START")::date,
        COALESCE("STOP", "START"),
        32827,                                              -- EHR encounter record
        CASE WHEN "PROVIDER"     IS NULL OR "PROVIDER"     = '' THEN NULL ELSE hashtextextended("PROVIDER",     0)::bigint END,
        CASE WHEN "ORGANIZATION" IS NULL OR "ORGANIZATION" = '' THEN NULL ELSE hashtextextended("ORGANIZATION", 0)::bigint END,
        "Id", 0,
        0, NULL, 0, NULL,
        NULL
    FROM _synthea_encounters
    LEFT JOIN cm.encounter_class_to_omop cls
           ON cls.source_code = "ENCOUNTERCLASS";
`);

// ── cdm.measurement + cdm.observation ───────────────────────────────────────
await sql.unsafe(`
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

    -- Resolve LOINC code → standard concept once (CTE materialized).
    DROP TABLE IF EXISTS _obs_resolved;
    CREATE TEMP TABLE _obs_resolved ON COMMIT DROP AS
    SELECT
        o.ctid AS row_ctid,
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
        r.std_concept_id,
        r."DATE"::date,
        r."DATE",
        NULL,
        32817, NULL,
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
        r.std_concept_id,
        r."DATE"::date,
        r."DATE",
        32817,
        CASE WHEN r."TYPE" = 'numeric' THEN r."VALUE"::numeric END,
        CASE WHEN r."TYPE" <> 'numeric' THEN left(r."VALUE", 60) END,
        NULL, NULL, r.unit_concept_id,
        NULL, hashtextextended(r."ENCOUNTER", 0)::bigint, NULL,
        r."CODE", r.src_concept_id,
        left(r."UNITS", 50), NULL, left(r."VALUE", 50),
        NULL, NULL
    FROM _obs_resolved r
    WHERE r.std_domain = 'Observation';
`);

// ── cdm.procedure_occurrence ────────────────────────────────────────────────
await sql.unsafe(`
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
        p."START"::date,
        p."START"::timestamp,
        p."STOP"::date,
        p."STOP"::timestamp,
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
`);

// ── cdm.drug_exposure (immunizations.csv only; medication CSVs added separately) ──
await sql.unsafe(`
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

    DROP TABLE IF EXISTS _synthea_immunizations;
    CREATE TEMP TABLE _synthea_immunizations (
        "DATE" timestamp, "PATIENT" text, "ENCOUNTER" text,
        "CODE" text, "DESCRIPTION" text, "BASE_COST" numeric
    );
    COPY _synthea_immunizations FROM '/synthea/csv/immunizations.csv' WITH (FORMAT csv, HEADER true);

    TRUNCATE cdm.drug_exposure;
    INSERT INTO cdm.drug_exposure (
        drug_exposure_id, person_id, drug_concept_id,
        drug_exposure_start_date, drug_exposure_start_datetime,
        drug_exposure_end_date, drug_exposure_end_datetime, verbatim_end_date,
        drug_type_concept_id, stop_reason, refills, quantity, days_supply, sig,
        route_concept_id, lot_number, provider_id, visit_occurrence_id, visit_detail_id,
        drug_source_value, drug_source_concept_id, route_source_value, dose_unit_source_value
    )
    SELECT
        row_number() OVER (ORDER BY i."PATIENT", i."DATE", i."CODE"),
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
`);

// ── cdm.condition_occurrence ────────────────────────────────────────────────
// Source: synthea/output/csv/conditions.csv (START, STOP, PATIENT,
// ENCOUNTER, CODE, DESCRIPTION). All codes SNOMED. Routing via vocab
// Maps-to + domain='Condition' mirrors our FHIR pipeline so the diff
// shows real semantic divergence rather than mapping-strategy noise.
await sql.unsafe(`
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
        "START",
        "START"::timestamp,
        "STOP",
        "STOP"::timestamp,
        32827,             -- 'EHR encounter record'
        0,
        NULL, NULL,
        hashtextextended("ENCOUNTER", 0)::bigint,
        NULL,
        "CODE",
        COALESCE(src.concept_id, 0),
        NULL
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
`);

const out = await sql`
    SELECT (SELECT count(*)::int FROM cdm.person)               AS person,
           (SELECT count(*)::int FROM cdm.location)             AS location,
           (SELECT count(*)::int FROM cdm.condition_occurrence) AS condition
`;
log(`cdm.person=${out[0].person}  cdm.location=${out[0].location}  cdm.condition_occurrence=${out[0].condition}`);

await sql.end();
process.exit(0);
