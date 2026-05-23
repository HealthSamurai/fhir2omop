-- cdm.observation — append allergies from allergies.csv (SNOMED → Maps-to,
-- any domain). Runs AFTER 60-observations.sql so the main observations
-- are already loaded.

DROP TABLE IF EXISTS _synthea_allergies;
CREATE TEMP TABLE _synthea_allergies (
    "START" timestamp, "STOP" timestamp,
    "PATIENT" text, "ENCOUNTER" text,
    "CODE" text, "SYSTEM" text, "DESCRIPTION" text,
    "TYPE" text, "CATEGORY" text,
    "REACTION1" text, "DESCRIPTION1" text, "SEVERITY1" text,
    "REACTION2" text, "DESCRIPTION2" text, "SEVERITY2" text
);
COPY _synthea_allergies FROM '/synthea/csv/allergies.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO cdm.observation (
    observation_id, person_id, observation_concept_id,
    observation_date, observation_datetime, observation_type_concept_id,
    value_as_concept_id, provider_id, visit_occurrence_id,
    observation_source_value, observation_source_concept_id, value_source_value
)
SELECT
    (SELECT COALESCE(max(observation_id), 0) FROM cdm.observation)
        + row_number() OVER (ORDER BY a."PATIENT", a."START", a."CODE"),
    hashtextextended(a."PATIENT", 0)::bigint,
    std.concept_id,
    a."START"::date, a."START", 32817,
    std.concept_id,
    NULL, hashtextextended(a."ENCOUNTER", 0)::bigint,
    a."CODE", src.concept_id, left(a."DESCRIPTION", 50)
FROM _synthea_allergies a
JOIN vocab.concept src ON src.vocabulary_id = 'SNOMED' AND src.concept_code = a."CODE"
JOIN vocab.concept_relationship rel
  ON rel.concept_id_1   = src.concept_id
 AND rel.relationship_id = 'Maps to'
 AND rel.invalid_reason IS NULL
JOIN vocab.concept std
  ON std.concept_id       = rel.concept_id_2
 AND std.standard_concept = 'S';
