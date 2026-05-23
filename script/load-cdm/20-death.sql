-- cdm.death — only Synthea Patients with DEATHDATE.

CREATE TABLE IF NOT EXISTS cdm.death (
    person_id              bigint NOT NULL,
    death_date             date NOT NULL,
    death_datetime         timestamp,
    death_type_concept_id  integer,
    cause_concept_id       integer,
    cause_source_value     varchar(50),
    cause_source_concept_id integer
);
ALTER TABLE cdm.death ALTER COLUMN person_id TYPE bigint USING person_id::bigint;

TRUNCATE cdm.death;
INSERT INTO cdm.death (person_id, death_date, death_datetime, death_type_concept_id)
SELECT
    hashtextextended("Id", 0)::bigint,
    "DEATHDATE"::date,
    "DEATHDATE"::timestamp,
    32817
FROM _synthea_patients
WHERE "DEATHDATE" IS NOT NULL;
