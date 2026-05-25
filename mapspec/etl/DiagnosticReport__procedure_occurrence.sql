-- Stage-2 ETL: DiagnosticReport (FHIR R4) → procedure_occurrence (OMOP CDM)
--
-- Appends to cdm_ours_fhir.procedure_occurrence. LOINC documents whose
-- Maps-to lands in Procedure domain (typically imaging study codes).

WITH codes AS (
    SELECT id AS staging_id, 1 AS prio, 'LOINC'  AS vocab, code_loinc  AS code FROM staging.diagnosticreport_procedure_occurrence WHERE code_loinc  IS NOT NULL
    UNION ALL
    SELECT id,                2,         'SNOMED',         code_snomed        FROM staging.diagnosticreport_procedure_occurrence WHERE code_snomed IS NOT NULL
    UNION ALL
    SELECT id,                3,         'CPT4',           code_cpt4          FROM staging.diagnosticreport_procedure_occurrence WHERE code_cpt4   IS NOT NULL
),
resolved AS (
    SELECT DISTINCT ON (c.staging_id)
        c.staging_id, c.code AS src_code,
        src.concept_id AS src_concept_id,
        std.concept_id AS std_concept_id
    FROM codes c
    JOIN vocab.concept src ON src.vocabulary_id = c.vocab AND src.concept_code = c.code
    JOIN vocab.concept_relationship rel ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
    JOIN vocab.concept std ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S' AND std.domain_id = 'Procedure'
    ORDER BY c.staging_id, c.prio
)

SELECT
    referenceToId(v.id)                                                     AS procedure_occurrence_id,
    referenceToId(v.subject_ref)                                            AS person_id,
    r.std_concept_id                                                        AS procedure_concept_id,
    v.effective_dt::date                                                    AS procedure_date,
    v.effective_dt::timestamp                                               AS procedure_datetime,
    NULL::date                                                              AS procedure_end_date,
    NULL::timestamp                                                         AS procedure_end_datetime,
    32827                                                                   AS procedure_type_concept_id,
    NULL::integer                                                           AS modifier_concept_id,
    NULL::integer                                                           AS quantity,
    -- Practitioner-typed performer only. Organization performers preserved
    -- in staging.performer_organization_ref. See DiagnosticReport__measurement.
    referenceToId(v.performer_practitioner_ref)                             AS provider_id,
    referenceToId(v.encounter_ref)                                          AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,
    left(r.src_code, 50)                                                    AS procedure_source_value,
    r.src_concept_id                                                        AS procedure_source_concept_id,
    NULL::varchar                                                           AS modifier_source_value

FROM staging.diagnosticreport_procedure_occurrence v
JOIN resolved r ON r.staging_id = v.id
;
