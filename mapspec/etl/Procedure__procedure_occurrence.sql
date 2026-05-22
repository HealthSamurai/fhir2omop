-- Stage-2 ETL: Procedure (FHIR R4) → procedure_occurrence (OMOP CDM)
--
-- Code priority SNOMED → CPT4 → HCPCS → ICD10PCS via UNION ALL +
-- DISTINCT ON.  Domain routing: keep only standard concepts with
-- domain_id='Procedure'.

WITH codes AS (
    SELECT id AS staging_id, 1 AS prio, 'SNOMED'   AS vocab, code_snomed   AS code FROM staging.procedure_occurrence WHERE code_snomed   IS NOT NULL
    UNION ALL
    SELECT id,                2,         'CPT4',             code_cpt4            FROM staging.procedure_occurrence WHERE code_cpt4     IS NOT NULL
    UNION ALL
    SELECT id,                3,         'HCPCS',            code_hcpcs           FROM staging.procedure_occurrence WHERE code_hcpcs    IS NOT NULL
    UNION ALL
    SELECT id,                4,         'ICD10PCS',         code_icd10pcs        FROM staging.procedure_occurrence WHERE code_icd10pcs IS NOT NULL
),
resolved AS (
    SELECT DISTINCT ON (c.staging_id)
        c.staging_id,
        c.code            AS src_code,
        src.concept_id    AS src_concept_id,
        std.concept_id    AS std_concept_id
    FROM codes c
    JOIN vocab.concept src
      ON src.vocabulary_id = c.vocab
     AND src.concept_code  = c.code
    JOIN vocab.concept_relationship rel
      ON rel.concept_id_1   = src.concept_id
     AND rel.relationship_id = 'Maps to'
     AND rel.invalid_reason IS NULL
    JOIN vocab.concept std
      ON std.concept_id      = rel.concept_id_2
     AND std.standard_concept = 'S'
     AND std.domain_id       = 'Procedure'
    ORDER BY c.staging_id, c.prio
)

SELECT
    referenceToId(v.id)                                                       AS procedure_occurrence_id,
    referenceToId(v.subject_ref)                                              AS person_id,

    r.std_concept_id                                                          AS procedure_concept_id,

    -- procedures.csv stores UTC ("…Z"); FHIR carries local TZ ("…+01:00") —
    -- same alignment as Encounter. Normalize to UTC instant.
    (COALESCE(v.performed_dt, v.performed_period_start)::timestamptz AT TIME ZONE 'UTC')::date AS procedure_date,
    (COALESCE(v.performed_dt, v.performed_period_start)::timestamptz AT TIME ZONE 'UTC')       AS procedure_datetime,
    (v.performed_period_end::timestamptz AT TIME ZONE 'UTC')::date                             AS procedure_end_date,
    (v.performed_period_end::timestamptz AT TIME ZONE 'UTC')                                   AS procedure_end_datetime,

    32827                                                                     AS procedure_type_concept_id,   -- 'EHR encounter record'
    NULL::integer                                                             AS modifier_concept_id,
    NULL::integer                                                             AS quantity,
    referenceToId(v.performer_ref)                                            AS provider_id,
    referenceToId(v.encounter_ref)                                            AS visit_occurrence_id,
    NULL::bigint                                                              AS visit_detail_id,

    r.src_code                                                                AS procedure_source_value,
    r.src_concept_id                                                          AS procedure_source_concept_id,
    NULL::varchar                                                             AS modifier_source_value

FROM staging.procedure_occurrence v
JOIN resolved r ON r.staging_id = v.id
;
