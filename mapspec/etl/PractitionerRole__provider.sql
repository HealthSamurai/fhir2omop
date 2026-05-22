-- Stage-2 ETL: PractitionerRole (FHIR R4) → provider (OMOP CDM)
--
-- Augments existing cdm_ours_fhir.provider rows with specialty + care_site
-- from PractitionerRole, then UPDATEs in-place. Returns the affected rows
-- as a synthetic SELECT so the runner's INSERT wrapper still works (we
-- TRUNCATE+INSERT a no-op slice — the real change happens in a CTE).
--
-- For clean code that just augments, use psql directly; this SELECT is
-- a placeholder that returns 0 rows so runner doesn't crash.

WITH role_update AS (
    UPDATE cdm_ours_fhir.provider p
    SET
        specialty_concept_id = COALESCE(std.concept_id, p.specialty_concept_id),
        care_site_id         = COALESCE(referenceToId(v.org_ref), p.care_site_id)
    FROM staging.practitionerrole_provider v
    LEFT JOIN vocab.concept src
           ON src.vocabulary_id = 'SNOMED' AND src.concept_code = v.specialty_code
    LEFT JOIN vocab.concept_relationship rel
           ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
    LEFT JOIN vocab.concept std
           ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S'
    WHERE p.provider_id = referenceToId(v.practitioner_ref)
    RETURNING p.provider_id
)
SELECT * FROM cdm_ours_fhir.provider WHERE FALSE
;
