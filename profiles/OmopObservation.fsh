// OMOP-Convertible Observation Profile
// Constraints guaranteeing successful mapping to OMOP measurement or observation tables.

Profile: OmopObservation
Parent: Observation
Id: omop-observation
Title: "OMOP-Convertible Observation"
Description: """
  Constrains FHIR Observation so that any conformant resource can be reliably
  converted to an OMOP CDM measurement or observation record.

  Category determines OMOP table routing:
  - laboratory, vital-signs -> measurement table
  - social-history, survey  -> observation table

  Key requirements:
  - status must be final, amended, or corrected (not preliminary, registered, entered-in-error)
  - code is mandatory with at least one coding from an OMOP-resolvable vocabulary
  - effectiveDateTime is mandatory (OMOP date fields are required)
  - category is recommended for proper table routing
  - value[x] is recommended for meaningful data
"""

// --- Status: only finalized observations ---
* status from OmopObservationStatus (required)

// --- Code: must be coded for concept_id ---
* code MS
* code from OmopObservationCodes (extensible)
* code.coding 1..* MS
* code.coding.system 1..1 MS
* code.coding.code 1..1 MS

// --- Effective: OMOP date fields are required ---
* effective[x] 1..1 MS
* effective[x] only dateTime

// --- Category: determines measurement vs observation routing ---
* category MS
* category from OmopObservationCategory (extensible)

// --- Subject: maps to person_id ---
* subject MS
* subject only Reference(Patient)

// --- Value: the actual measured/observed value ---
* value[x] MS

// --- Encounter: maps to visit_occurrence_id ---
* encounter MS

// --- Performer: maps to provider_id ---
* performer MS

// --- Reference range: maps to range_low / range_high ---
* referenceRange MS
