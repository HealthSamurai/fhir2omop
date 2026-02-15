// OMOP-Convertible AllergyIntolerance Profile
// Constraints guaranteeing successful mapping to OMOP observation table.

Profile: OmopAllergyIntolerance
Parent: AllergyIntolerance
Id: omop-allergy-intolerance
Title: "OMOP-Convertible AllergyIntolerance"
Description: """
  Constrains FHIR AllergyIntolerance so that any conformant resource can be
  reliably converted to an OMOP CDM observation record.

  Key requirements:
  - clinicalStatus must be active
  - verificationStatus must not be entered-in-error or refuted
  - code is mandatory with at least one coding from an OMOP-resolvable vocabulary
  - onsetDateTime is mandatory (OMOP observation_date is required)
  - patient should reference a Patient for person_id linkage
"""

// --- Clinical status: only active allergies ---
* clinicalStatus 1..1 MS
* clinicalStatus from OmopAllergyIntoleranceClinicalStatus (required)

// --- Verification status: not entered-in-error or refuted ---
* verificationStatus from OmopAllergyIntoleranceVerificationStatus (required)

// --- Code: must be coded for observation_concept_id ---
* code 1..1 MS
* code from OmopAllergyIntoleranceCodes (extensible)
* code.coding 1..* MS
* code.coding.system 1..1 MS
* code.coding.code 1..1 MS

// --- Onset: OMOP observation_date is required ---
* onset[x] 1..1 MS
* onset[x] only dateTime

// --- Patient: maps to person_id ---
* patient MS
* patient only Reference(Patient)

// --- Encounter: maps to visit_occurrence_id ---
* encounter MS

// --- Recorder: maps to provider_id ---
* recorder MS

// --- Type: maps to qualifier_source_value ---
* type MS

// --- Reaction: manifestation maps to value_as_string ---
* reaction MS
* reaction.manifestation MS
