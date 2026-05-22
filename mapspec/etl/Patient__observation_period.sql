-- Stage-2 ETL: Patient (FHIR R4) → observation_period (OMOP CDM)
--
-- Derived from cdm_ours_fhir.visit_occurrence dates. One row per patient
-- with at least one visit. period_type_concept_id 44814724 'Period covering
-- healthcare encounters'.

SELECT
    referenceToId(p.id)                                        AS observation_period_id,
    referenceToId(p.id)                                        AS person_id,
    MIN(vo.visit_start_date)                                   AS observation_period_start_date,
    MAX(vo.visit_end_date)                                     AS observation_period_end_date,
    44814724                                                   AS period_type_concept_id

FROM staging.patient_observation_period p
JOIN cdm_ours_fhir.visit_occurrence vo
  ON vo.person_id = referenceToId(p.id)
GROUP BY p.id
;
