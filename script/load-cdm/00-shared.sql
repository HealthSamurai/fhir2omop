-- Shared temp tables — populated by server-side COPY from the
-- bind-mounted /synthea/csv/. Subsequent per-table loaders read from
-- these (avoids re-COPYing the same file multiple times).
--
-- Only the temp tables actually used by the loaders below are created.

DROP TABLE IF EXISTS _synthea_patients;
CREATE TEMP TABLE _synthea_patients (
    "Id" text, "BIRTHDATE" date, "DEATHDATE" date,
    "SSN" text, "DRIVERS" text, "PASSPORT" text,
    "PREFIX" text, "FIRST" text, "LAST" text, "SUFFIX" text, "MAIDEN" text,
    "MARITAL" text, "RACE" text, "ETHNICITY" text, "GENDER" text,
    "BIRTHPLACE" text, "ADDRESS" text, "CITY" text, "STATE" text, "COUNTY" text, "FIPS" text, "ZIP" text,
    "LAT" numeric, "LON" numeric,
    "HEALTHCARE_EXPENSES" numeric, "HEALTHCARE_COVERAGE" numeric, "INCOME" numeric
);
COPY _synthea_patients FROM '/synthea/csv/patients.csv' WITH (FORMAT csv, HEADER true);
