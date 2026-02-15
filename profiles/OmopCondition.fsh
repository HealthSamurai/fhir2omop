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
  - verificationStatus must not be entered-in-error or refuted
  - clinicalStatus must indicate an active condition (active, recurrence, relapse)
  - code is mandatory with at least one coding from an OMOP-resolvable vocabulary
  - onset[x] or recordedDate must provide a start date
  - subject should reference a Patient for person_id linkage

  Unmapped elements (no OMOP condition_occurrence column):
  - severity: no direct field; could produce separate observation record
  - bodySite: no direct field; could produce separate observation record
  - stage: no direct field; could produce separate observation/measurement
  - evidence: no direct field; could link to observation records
  - note: no direct field; could map to note_nlp table
"""

// --- Clinical status: only active conditions ---
* clinicalStatus from OmopConditionClinicalStatus (required)

// --- Verification status: not entered-in-error or refuted ---
* verificationStatus from OmopConditionVerificationStatus (required)

// --- Code: must be coded for condition_concept_id ---
* code 1..1 MS
* code from OmopConditionCodes (extensible)
* code.coding 1..* MS
* code.coding.system 1..1 MS
* code.coding.code 1..1 MS

// --- Onset: OMOP condition_start_date is required ---
// Accepts dateTime or Period; Age/Range/string are not mappable
* onset[x] MS
* onset[x] only dateTime or Period

// --- RecordedDate: fallback for condition_start_date when onset is absent ---
* recordedDate MS

// --- Subject: maps to person_id ---
* subject MS
* subject only Reference(Patient)

// --- Encounter: maps to visit_occurrence_id ---
* encounter MS

// --- Abatement: maps to condition_end_date ---
// Accepts dateTime, Period, or string (string maps to stop_reason)
* abatement[x] MS

// --- Asserter: maps to provider_id (preferred) ---
* asserter MS

// --- Recorder: fallback for provider_id when asserter is absent ---
* recorder MS

// --- Category: recommended for condition_type_concept_id ---
* category MS

// --- Elements with no OMOP mapping (documented for transparency) ---
// severity: no condition_occurrence column
// bodySite: no condition_occurrence column
// stage: no condition_occurrence column
// evidence: no condition_occurrence column
// note: no condition_occurrence column
