-- Stage-2 ETL: PractitionerRole (FHIR R4) → provider (OMOP CDM)
--
-- This is an UPDATE, not an INSERT — PractitionerRole augments existing
-- cdm_ours_fhir.provider rows (created by Practitioner__provider.sql)
-- with specialty + care_site links. The orchestrator routes "update"
-- mode entries to run this SQL verbatim (no INSERT wrapper).

UPDATE cdm_ours_fhir.provider p
SET
    specialty_concept_id = COALESCE(std.concept_id, p.specialty_concept_id),
    care_site_id         = COALESCE(referenceToId(v.org_ref), p.care_site_id)
FROM staging.practitionerrole_provider v
LEFT JOIN vocab.concept src
       ON src.vocabulary_id = 'SNOMED' AND src.concept_code = v.specialty_code
LEFT JOIN vocab.concept_relationship rel
       ON rel.concept_id_1 = src.concept_id
      AND rel.relationship_id = 'Maps to'
      AND rel.invalid_reason IS NULL
LEFT JOIN vocab.concept std
       ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S'
WHERE p.provider_id = referenceToId(v.practitioner_ref)
;
