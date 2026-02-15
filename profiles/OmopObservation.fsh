// OMOP-Convertible Observation Profile
// Constrains FHIR Observation for mapping to OMOP observation table.
// Used for social history, surveys, and activity observations.

Profile: OmopObservation
Parent: Observation
Id: omop-observation
Title: "OMOP-Convertible Observation"
Description: """
  Constrains FHIR Observation so that any conformant resource can be reliably
  converted to an OMOP CDM observation record.

  This profile is for observations that route to the OMOP observation table:
  - social history (category = social-history)
  - surveys (category = survey)
  - activity data (category = activity)

  OMOP observation-specific fields:
  - value_as_string from valueString or valueCodeableConcept
  - qualifier_concept_id / qualifier_source_value from interpretation
  - value_as_number from valueQuantity.value
  - No operator_concept_id or reference range (use OmopMeasurement for those)

  Key requirements:
  - status must be final, amended, or corrected
  - code is mandatory with at least one coding from an OMOP-resolvable vocabulary
  - effectiveDateTime is mandatory (OMOP observation_date is required)
  - category should be social-history, survey, or activity
"""

// --- Status: only finalized observations ---
* status from OmopObservationStatus (required)

// --- Category: observation table routing ---
* category 1..* MS
* category from OmopObservationTableCategory (required)

// --- Code: must be coded for observation_concept_id ---
* code MS
* code from OmopObservationCodes (extensible)
* code.coding 1..* MS
* code.coding.system 1..1 MS
* code.coding.code 1..1 MS

// --- Effective: OMOP observation_date is required ---
* effective[x] 1..1 MS
* effective[x] only dateTime

// --- Subject: maps to person_id ---
* subject 1..1 MS
* subject only Reference(Patient)

// --- Value: supports string, coded, and numeric results ---
* value[x] MS

// --- Encounter: maps to visit_occurrence_id ---
* encounter MS

// --- Performer: maps to provider_id ---
* performer MS

// --- Interpretation: maps to qualifier_source_value / qualifier_concept_id ---
* interpretation MS

// --- Component: expanded into separate OMOP observation records ---
* component MS
* component.code MS
* component.code.coding 1..* MS
* component.code.coding.system 1..1 MS
* component.code.coding.code 1..1 MS
* component.value[x] MS
* component.interpretation MS
