-- Stage-2 ETL: Patient (FHIR R4) → person (OMOP CDM)
--
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/gender-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/race-omb-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/race-text-synthea-to-omop
-- @relatedArtefact https://fhir2omop.health-samurai.io/ConceptMap/ethnicity-omb-to-omop
--
-- Race fallback: ombCategory=UNK alone is 'Unknown' (8552). Synthea's
-- exporter also emits text='Other' alongside UNK for patients outside
-- the 5 OMB categories — `cm.race_text_synthea_to_omop` rescues those
-- to 8522 ('Other Race'). See mapspec/GAPS.md §7.

SELECT
    hashtextextended(v.id, 0)::bigint              AS person_id,

    COALESCE(g.concept_id, 0)                      AS gender_concept_id,

    EXTRACT(YEAR  FROM v.birth_date::date)::int    AS year_of_birth,
    EXTRACT(MONTH FROM v.birth_date::date)::int    AS month_of_birth,
    EXTRACT(DAY   FROM v.birth_date::date)::int    AS day_of_birth,
    v.birth_date::timestamp                        AS birth_datetime,

    COALESCE(
        CASE WHEN v.race_omb_code = 'UNK' THEN rt.concept_id END,  -- Synthea Other recovery
        r.concept_id,
        0
    )                                              AS race_concept_id,
    COALESCE(e.concept_id, 0)                      AS ethnicity_concept_id,

    referenceToId(v.id)                            AS location_id,
    referenceToId(v.general_practitioner_ref)      AS provider_id,
    referenceToId(v.managing_organization_ref)     AS care_site_id,

    v.id                                           AS person_source_value,
    COALESCE(v.us_core_birthsex, v.gender)         AS gender_source_value,
    COALESCE(g.source_concept_id, 0)               AS gender_source_concept_id,
    v.race_text                                    AS race_source_value,
    COALESCE(r.source_concept_id, 0)               AS race_source_concept_id,
    v.ethnicity_text                               AS ethnicity_source_value,
    COALESCE(e.source_concept_id, 0)               AS ethnicity_source_concept_id

FROM staging.patient_person v
LEFT JOIN cm.gender_to_omop        g ON g.source_code = COALESCE(v.us_core_birthsex, v.gender)
LEFT JOIN cm.race_omb_to_omop          r  ON r.source_code  = v.race_omb_code
LEFT JOIN cm.race_text_synthea_to_omop rt ON rt.source_code = v.race_text
LEFT JOIN cm.ethnicity_omb_to_omop     e  ON e.source_code  = v.ethnicity_omb_code
;
