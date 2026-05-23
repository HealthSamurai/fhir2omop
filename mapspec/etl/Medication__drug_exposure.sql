-- Stage-2 ETL: Medication (FHIR R4) → drug_exposure (OMOP CDM)
--
-- The standalone Medication resource (contained drug definition).
-- Rarely used in practice — MedicationRequest typically inlines a
-- CodeableConcept. Synthea doesn't emit Medication as a standalone
-- resource. Wired for real-world data where it does appear.
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/fhir-system-to-omop-vocab

WITH codes AS (
    SELECT id AS staging_id, 1 AS prio, 'RxNorm' AS vocab, drug_rxnorm AS code FROM staging.medication_drug_exposure WHERE drug_rxnorm IS NOT NULL
    UNION ALL
    SELECT id,                2,         'NDC',             drug_ndc            FROM staging.medication_drug_exposure WHERE drug_ndc    IS NOT NULL
),
resolved AS (
    SELECT DISTINCT ON (c.staging_id)
        c.staging_id, c.code AS src_code,
        src.concept_id AS src_concept_id, std.concept_id AS std_concept_id
    FROM codes c
    JOIN vocab.concept src ON src.vocabulary_id = c.vocab AND src.concept_code = c.code
    JOIN vocab.concept_relationship rel ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
    JOIN vocab.concept std ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S' AND std.domain_id = 'Drug'
    ORDER BY c.staging_id, c.prio, std.concept_id
)

SELECT
    referenceToId(v.id)                                                     AS drug_exposure_id,
    NULL::bigint                                                            AS person_id,   -- Medication resource has no subject
    r.std_concept_id                                                        AS drug_concept_id,
    CURRENT_DATE                                                            AS drug_exposure_start_date,
    NULL::timestamp                                                         AS drug_exposure_start_datetime,
    CURRENT_DATE                                                            AS drug_exposure_end_date,
    NULL::timestamp                                                         AS drug_exposure_end_datetime,
    NULL::date                                                              AS verbatim_end_date,
    38000175                                                                AS drug_type_concept_id,   -- 'Medication list entry'
    NULL::varchar                                                           AS stop_reason,
    NULL::integer                                                           AS refills,
    NULL::numeric                                                           AS quantity,
    NULL::integer                                                           AS days_supply,
    NULL::text                                                              AS sig,
    NULL::integer                                                           AS route_concept_id,
    NULL::varchar                                                           AS lot_number,
    NULL::bigint                                                            AS provider_id,
    NULL::bigint                                                            AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,
    left(r.src_code, 50)                                                    AS drug_source_value,
    r.src_concept_id                                                        AS drug_source_concept_id,
    NULL::varchar                                                           AS route_source_value,
    NULL::varchar                                                           AS dose_unit_source_value

FROM staging.medication_drug_exposure v
JOIN resolved r ON r.staging_id = v.id
WHERE FALSE  -- standalone Medication has no patient; produce 0 rows by default.
             -- Set TRUE if your source pairs Medication with a Patient ref.
;
