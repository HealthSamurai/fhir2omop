// OMOP-Convertible Condition Profile
// Constraints guaranteeing successful mapping to OMOP condition_occurrence table.

Profile: OmopCondition
Parent: Condition
Id: omop-condition
Title: "OMOP-Convertible Condition"
Description: """
  Constrains FHIR Condition so that any conformant resource can be reliably
  converted to an OMOP CDM condition_occurrence record.

  Key requirements:
  - verificationStatus must not be entered-in-error
  - clinicalStatus must indicate an active condition (active, recurrence, relapse)
  - code is mandatory with at least one coding from an OMOP-resolvable vocabulary
  - onsetDateTime is mandatory (OMOP condition_start_date is required)
  - subject should reference a Patient for person_id linkage
"""

// --- Clinical status: only active conditions ---
* clinicalStatus from OmopConditionClinicalStatus (required)

// --- Verification status: not entered-in-error ---
* verificationStatus from OmopConditionVerificationStatus (required)

// --- Code: must be coded for condition_concept_id ---
* code 1..1 MS
* code from OmopConditionCodes (extensible)
* code.coding 1..* MS
* code.coding.system 1..1 MS
* code.coding.code 1..1 MS

// --- Onset: OMOP condition_start_date is required ---
* onset[x] 1..1 MS
* onset[x] only dateTime

// --- Subject: maps to person_id ---
* subject MS
* subject only Reference(Patient)

// --- Encounter: maps to visit_occurrence_id ---
* encounter MS

// --- Abatement: maps to condition_end_date ---
* abatement[x] MS

// --- Asserter: maps to provider_id ---
* asserter MS

// --- Category: recommended for condition_type_concept_id ---
* category MS
