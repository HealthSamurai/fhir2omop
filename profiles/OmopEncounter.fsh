// OMOP-Convertible Encounter Profile
// Constraints guaranteeing successful mapping to OMOP visit_occurrence table.

Profile: OmopEncounter
Parent: Encounter
Id: omop-encounter
Title: "OMOP-Convertible Encounter"
Description: """
  Constrains FHIR Encounter so that any conformant resource can be reliably
  converted to an OMOP CDM visit_occurrence record.

  Key requirements:
  - status must be finished or in-progress (not planned, cancelled, entered-in-error)
  - class is required to determine visit_concept_id (inpatient, outpatient, ER, etc.)
  - period.start is mandatory (OMOP visit_start_date is required)
  - subject should reference a Patient for person_id linkage
"""

// --- Status: only actual visits ---
* status from OmopEncounterStatus (required)

// --- Class: determines visit_concept_id ---
* class 1..1 MS
* class from OmopEncounterClass (extensible)

// --- Period: OMOP visit_start_date is required ---
* period 1..1 MS
* period.start 1..1 MS
* period.end MS

// --- Subject: maps to person_id ---
* subject MS
* subject only Reference(Patient)

// --- Type: maps to visit_source_value ---
* type MS

// --- Participant: maps to provider_id ---
* participant MS
* participant.individual MS

// --- Hospitalization details ---
* hospitalization MS
* hospitalization.admitSource MS        // -> admitted_from_concept_id
* hospitalization.dischargeDisposition MS  // -> discharged_to_concept_id

// --- Service provider: maps to care_site_id ---
* serviceProvider MS
