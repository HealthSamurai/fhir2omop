-- Stage-2 ETL: Practitioner (FHIR R4) → provider (OMOP CDM v5.3)
-- Consumes staging.practitioner_provider.
--
-- Key choice: provider_source_value = NPI (not Practitioner.id UUID).
-- This is because Synthea writes Encounter.participant.individual.reference
-- as 'Practitioner?identifier=…|NPI', so the FK lookup from Encounter needs
-- NPI to find the provider. cdm.provider (reference, CSV-side) uses the
-- Synthea UUID — both are valid; ours preserves the FHIR linkage instead.

-- Surrogate provider_id = hashtextextended(NPI, 0)::bigint.
-- We hash NPI (not the Practitioner UUID) because Synthea writes
-- Encounter.participant.individual.reference as 'Practitioner?identifier=…|NPI',
-- so the FK side extracts NPI from the URL and hashes it too — no JOIN.
-- Falls back to hash(Practitioner.id) when NPI is NULL.

SELECT
    hashtextextended(coalesce(v.npi, v.id), 0)::bigint  AS provider_id,
    (coalesce(v.family, '') || ', ' || coalesce(v.given, '')) AS provider_name,
    v.npi                                    AS npi,
    NULL::text                               AS dea,
    38004446                                 AS specialty_concept_id,   -- 'Family Practice' (ETL-Synthea hardcodes this)
    NULL::bigint                             AS care_site_id,
    NULL::integer                            AS year_of_birth,
    CASE lower(coalesce(v.gender, ''))
        WHEN 'male'    THEN 8507
        WHEN 'female'  THEN 8532
        WHEN 'other'   THEN 8521
        WHEN 'unknown' THEN 8551
        ELSE 0
    END                                      AS gender_concept_id,
    v.id                                     AS provider_source_value,  -- Practitioner UUID (matches ref); NPI lookup uses npi column
    NULL::text                               AS specialty_source_value,
    38004446                                 AS specialty_source_concept_id,
    v.gender                                 AS gender_source_value,
    CASE lower(coalesce(v.gender, ''))
        WHEN 'male'    THEN 8507
        WHEN 'female'  THEN 8532
        ELSE 0
    END                                      AS gender_source_concept_id
FROM staging.practitioner_provider v
;
