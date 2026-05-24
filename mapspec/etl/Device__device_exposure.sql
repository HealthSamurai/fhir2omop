-- Stage-2 ETL: Device (FHIR R4) → device_exposure (OMOP CDM)
--
-- device_exposure_start_date is NOT NULL but FHIR Device has no native
-- implantation/use date. Synthea's FHIR export omits the START/STOP it
-- writes to devices.csv (those would come from an associated Procedure,
-- but Synthea's Device resources don't carry a reference to it).
--
-- We use Device.manufactureDate as a DETERMINISTIC placeholder — not
-- the implantation date, but at least:
--   1) stable across re-runs (CURRENT_DATE was non-deterministic),
--   2) tied to the device (CURRENT_DATE was tied to ETL run time),
--   3) chronologically plausible (manufacture predates implantation).
-- expirationDate fills end_date with the same caveat. Both fields are
-- populated on every Synthea Device, so no fallback needed in practice.
--
-- Real-world data should pair Device with DeviceUseStatement (R4) or
-- DeviceUsage (R5) which carry timing[x].

SELECT
    referenceToId(v.id)                                                     AS device_exposure_id,
    referenceToId(v.subject_ref)                                            AS person_id,
    std.concept_id                                                          AS device_concept_id,
    v.manufacture_date::date                                                AS device_exposure_start_date,
    v.manufacture_date::timestamp                                           AS device_exposure_start_datetime,
    v.expiration_date::date                                                 AS device_exposure_end_date,
    v.expiration_date::timestamp                                            AS device_exposure_end_datetime,
    32817                                                                   AS device_type_concept_id,
    left(v.udi, 255)                                                        AS unique_device_id,
    left(v.lot_number, 255)                                                 AS production_id,
    NULL::integer                                                           AS quantity,
    NULL::bigint                                                            AS provider_id,
    NULL::bigint                                                            AS visit_occurrence_id,
    NULL::bigint                                                            AS visit_detail_id,
    left(v.code_snomed, 50)                                                 AS device_source_value,
    src.concept_id                                                          AS device_source_concept_id

FROM staging.device_device_exposure v
JOIN vocab.concept src
  ON src.vocabulary_id = 'SNOMED' AND src.concept_code = v.code_snomed
JOIN vocab.concept_relationship rel
  ON rel.concept_id_1 = src.concept_id AND rel.relationship_id = 'Maps to' AND rel.invalid_reason IS NULL
JOIN vocab.concept std
  ON std.concept_id = rel.concept_id_2 AND std.standard_concept = 'S' AND std.domain_id = 'Device'
WHERE v.status_code IN ('active', 'inactive')
;
