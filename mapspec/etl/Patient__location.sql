-- Stage-2 ETL: Patient (FHIR R4) → location (OMOP CDM)
--
-- One location row per Patient (1:1 with person). Surrogate location_id
-- mirrors person_id — both are hashtextextended(Patient.id, 0)::bigint —
-- so Patient__person.sql resolves location_id without a JOIN.
--
-- Trade-off vs ETL-Synthea (which dedupes by ZIP and drops the street
-- line): we keep full address fidelity at the cost of N location rows
-- per N patients. Street-line preservation is the main reason to do this.

SELECT
    referenceToId(v.id)                            AS location_id,
    v.location_line                                AS address_1,
    NULL::varchar                                  AS address_2,
    v.location_city                                AS city,
    NULL::varchar                                  AS state,
    v.location_zip                                 AS zip,
    NULL::varchar                                  AS county,
    v.location_state                               AS location_source_value,
    NULL::integer                                  AS country_concept_id,
    v.location_country                             AS country_source_value,
    NULL::numeric                                  AS latitude,
    NULL::numeric                                  AS longitude
FROM staging.patient_person v
WHERE v.location_city IS NOT NULL
   OR v.location_state IS NOT NULL
   OR v.location_zip IS NOT NULL
   OR v.location_line IS NOT NULL
;
