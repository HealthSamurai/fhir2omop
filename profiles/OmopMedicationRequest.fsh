// OMOP-Convertible MedicationRequest Profile
// Constraints guaranteeing successful mapping to OMOP drug_exposure table.

Profile: OmopMedicationRequest
Parent: MedicationRequest
Id: omop-medication-request
Title: "OMOP-Convertible MedicationRequest"
Description: """
  Constrains FHIR MedicationRequest so that any conformant resource
  can be reliably converted to an OMOP CDM drug_exposure record.

  Key requirements:
  - status must be active or completed (not draft, cancelled, entered-in-error)
  - medication must be a CodeableConcept (not a bare Reference) with
    at least one coded entry from an OMOP-resolvable drug vocabulary
  - authoredOn is required (OMOP drug_exposure_start_date is mandatory)
  - subject should reference a Patient for person_id linkage
"""

// --- Status: only actual prescriptions ---
* status from OmopMedicationRequestStatus (required)

// --- Medication: must be coded, not a bare Reference ---
* medication[x] only CodeableConcept
* medicationCodeableConcept 1..1 MS
* medicationCodeableConcept from OmopDrugCodes (extensible)
* medicationCodeableConcept.coding 1..* MS
* medicationCodeableConcept.coding.system 1..1 MS
* medicationCodeableConcept.coding.code 1..1 MS

// --- AuthoredOn: OMOP drug_exposure_start_date is required ---
* authoredOn 1..1 MS

// --- Subject: maps to person_id ---
* subject MS
* subject only Reference(Patient)

// --- Encounter: maps to visit_occurrence_id ---
* encounter MS

// --- Requester: maps to provider_id ---
* requester MS

// --- Dosage: maps to quantity, route ---
* dosageInstruction MS
* dosageInstruction.route MS              // -> route_concept_id / route_source_value
* dosageInstruction.doseAndRate MS

// --- Dispense: maps to drug_exposure_end_date, refills, quantity ---
* dispenseRequest MS
* dispenseRequest.validityPeriod MS       // -> drug_exposure_end_date
* dispenseRequest.validityPeriod.end MS
* dispenseRequest.numberOfRepeatsAllowed MS  // -> refills
* dispenseRequest.quantity MS             // -> quantity
