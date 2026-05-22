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

const out = await sql`
    SELECT (SELECT count(*)::int FROM cdm.person)   AS person,
           (SELECT count(*)::int FROM cdm.location) AS location
`;
log(`cdm.person=${out[0].person}  cdm.location=${out[0].location}`);

await sql.end();
process.exit(0);
