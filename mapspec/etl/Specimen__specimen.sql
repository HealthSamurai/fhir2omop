-- Stage-2 ETL: Specimen (FHIR R4) → specimen (OMOP CDM)
--
-- Synthea doesn't emit Specimen. Wired for real-world data.

SELECT
    referenceToId(v.id)                                                     AS specimen_id,
    referenceToId(v.subject_ref)                                            AS person_id,
    COALESCE(std.concept_id, 0)                                             AS specimen_concept_id,
    32856                                                                   AS specimen_type_concept_id,   -- 'Lab'
    v.collected_dt::date                                                    AS specimen_date,
    v.collected_dt::timestamp                                               AS specimen_datetime,
    v.quantity_value                                                        AS quantity,
    NULL::integer                                                           AS unit_concept_id,
    COALESCE(site_std.concept_id, 0)                                        AS anatomic_site_concept_id,
    NULL::integer                                                           AS disease_status_concept_id,
    NULL::varchar                                                           AS specimen_source_id,
    left(v.type_snomed, 50)                                                 AS specimen_source_value,
    NULL::varchar                                                           AS unit_source_value,
    left(v.body_site_snomed, 50)                                            AS anatomic_site_source_value,
    NULL::varchar                                                           AS disease_status_source_value

FROM staging.specimen_specimen v
LEFT JOIN vocab.concept src       ON src.vocabulary_id = 'SNOMED'      AND src.concept_code      = v.type_snomed
LEFT JOIN vocab.concept_relationship rel ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
LEFT JOIN vocab.concept std       ON std.concept_id     = rel.concept_id_2  AND std.standard_concept = 'S' AND std.domain_id = 'Specimen'
LEFT JOIN vocab.concept site_src  ON site_src.vocabulary_id = 'SNOMED'      AND site_src.concept_code     = v.body_site_snomed
LEFT JOIN vocab.concept_relationship site_rel ON site_rel.concept_id_1 = site_src.concept_id AND site_rel.relationship_id = 'Maps to' AND site_rel.invalid_reason IS NULL
LEFT JOIN vocab.concept site_std  ON site_std.concept_id    = site_rel.concept_id_2  AND site_std.standard_concept = 'S'

WHERE v.collected_dt IS NOT NULL
;
