// OMOP-Convertible MedicationStatement Profile
// Constraints guaranteeing successful mapping to OMOP drug_exposure table.

Profile: OmopMedicationStatement
Parent: MedicationStatement
Id: omop-medication-statement
Title: "OMOP-Convertible MedicationStatement"
Description: """
  Constrains FHIR MedicationStatement so that any conformant resource
  can be reliably converted to an OMOP CDM drug_exposure record.

  Key requirements:
  - status must indicate actual drug exposure (active | completed)
  - medication must be a CodeableConcept (not a bare Reference) with
    at least one coded entry from an OMOP-resolvable drug vocabulary
  - effective[x] is required (OMOP drug_exposure_start_date is mandatory)
  - subject must reference a Patient
"""

// --- Status: only actual drug exposures ---
* status from OmopMedicationStatementStatus (required)

// --- Medication: must be coded, not a bare Reference ---
* medication[x] only CodeableConcept
* medicationCodeableConcept 1..1 MS
* medicationCodeableConcept from OmopDrugCodes (extensible)
* medicationCodeableConcept.coding 1..* MS
* medicationCodeableConcept.coding.system 1..1 MS
* medicationCodeableConcept.coding.code 1..1 MS

// --- Effective: OMOP drug_exposure_start_date is required ---
* effective[x] 1..1 MS

// --- Subject: must reference a Patient ---
* subject MS
* subject only Reference(Patient)

// --- Recommended for richer mapping ---
* context MS                              // -> visit_occurrence_id
* informationSource MS                    // -> provider_id
* dosage MS
* dosage.route MS                         // -> route_concept_id / route_source_value
* dosage.doseAndRate.doseQuantity MS      // -> quantity
