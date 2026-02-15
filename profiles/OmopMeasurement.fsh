// OMOP-Convertible Measurement Profile
// Constrains FHIR Observation for mapping to OMOP measurement table.
// Used for laboratory results and vital signs.

Profile: OmopMeasurement
Parent: Observation
Id: omop-measurement
Title: "OMOP-Convertible Measurement"
Description: """
  Constrains FHIR Observation so that any conformant resource can be reliably
  converted to an OMOP CDM measurement record.

  This profile is for observations that route to the OMOP measurement table:
  - laboratory results (category = laboratory)
  - vital signs (category = vital-signs)

  OMOP measurement-specific fields:
  - operator_concept_id from valueQuantity.comparator (<, <=, >=, >)
  - range_low / range_high from referenceRange
  - value_as_number from valueQuantity.value
  - No value_as_string (use OmopObservation for text results)

  Key requirements:
  - status must be final, amended, or corrected
  - code is mandatory with at least one coding from an OMOP-resolvable vocabulary
  - effectiveDateTime is mandatory (OMOP measurement_date is required)
  - category should be laboratory or vital-signs

  Component observations (e.g., blood pressure with systolic + diastolic):
  - Each component is expanded into its own OMOP measurement record
  - Component codes override the parent code for measurement_source_value
  - Component values override the parent value
"""

// --- Status: only finalized observations ---
* status from OmopObservationStatus (required)

// --- Category: measurement table routing ---
* category 1..* MS
* category from OmopMeasurementCategory (required)

// --- Code: must be coded for measurement_concept_id ---
* code MS
* code from OmopObservationCodes (extensible)
* code.coding 1..* MS
* code.coding.system 1..1 MS
* code.coding.code 1..1 MS

// --- Effective: OMOP measurement_date is required ---
* effective[x] 1..1 MS
* effective[x] only dateTime

// --- Subject: maps to person_id ---
* subject 1..1 MS
* subject only Reference(Patient)

// --- Value: numeric result preferred ---
* value[x] MS

// --- Encounter: maps to visit_occurrence_id ---
* encounter MS

// --- Performer: maps to provider_id ---
* performer MS

// --- Reference range: maps to range_low / range_high ---
* referenceRange MS

// --- Component: expanded into separate OMOP measurement records ---
* component MS
* component.code MS
* component.code.coding 1..* MS
* component.code.coding.system 1..1 MS
* component.code.coding.code 1..1 MS
* component.value[x] MS
* component.referenceRange MS
