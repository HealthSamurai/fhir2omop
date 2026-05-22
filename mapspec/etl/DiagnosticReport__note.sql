-- Stage-2 ETL: DiagnosticReport (FHIR R4) → note (OMOP CDM)
--
-- One DR → one cdm.note row, when there's any text (presentedForm.data
-- base64-decoded or conclusion). LOINC code → note_class_concept_id.
-- note_type_concept_id 32817 'EHR'. encoding_concept_id 32678 'UTF-8'.
-- language_concept_id 4180186 'English' (Synthea is en-US).

SELECT
    referenceToId(v.id)                                                     AS note_id,
    referenceToId(v.subject_ref)                                            AS person_id,
    v.effective_dt::date                                                    AS note_date,
    v.effective_dt::timestamp                                               AS note_datetime,
    32817                                                                   AS note_type_concept_id,
    COALESCE(std.concept_id, 0)                                             AS note_class_concept_id,
    left(v.code_text, 250)                                                  AS note_title,
    COALESCE(convert_from(decode(v.presented_data, 'base64'), 'UTF-8'), v.conclusion, v.code_text, '')
                                                                            AS note_text,
    32678                                                                   AS encoding_concept_id,    -- 'UTF-8'
    4180186                                                                 AS language_concept_id,    -- 'English'
    referenceToId(v.performer_ref)                                          AS provider_id,
    referenceToId(v.encounter_ref)                                          AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,
    left(v.code_loinc, 50)                                                  AS note_source_value,
    NULL::bigint                                                            AS note_event_id,
    NULL::integer                                                           AS note_event_field_concept_id

FROM staging.diagnosticreport_note v
LEFT JOIN vocab.concept src
       ON src.vocabulary_id = 'LOINC' AND src.concept_code = v.code_loinc
LEFT JOIN vocab.concept_relationship rel
       ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
LEFT JOIN vocab.concept std
       ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S'

WHERE v.effective_dt IS NOT NULL
  AND (v.presented_data IS NOT NULL OR v.conclusion IS NOT NULL OR v.code_text IS NOT NULL)
;
