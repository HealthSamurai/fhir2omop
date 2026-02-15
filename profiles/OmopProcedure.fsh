// OMOP-Convertible Procedure Profile
// Constraints guaranteeing successful mapping to OMOP procedure_occurrence table.

Profile: OmopProcedure
Parent: Procedure
Id: omop-procedure
Title: "OMOP-Convertible Procedure"
Description: """
  Constrains FHIR Procedure so that any conformant resource can be reliably
  converted to an OMOP CDM procedure_occurrence record.

  Key requirements:
  - status must be completed (OMOP only records completed procedures)
  - code is mandatory with at least one coding from an OMOP-resolvable vocabulary
  - performed[x] is mandatory (OMOP procedure_date is required)
  - subject should reference a Patient for person_id linkage
"""

// --- Status: only completed procedures ---
* status from OmopProcedureStatus (required)

// --- Code: must be coded for procedure_concept_id ---
* code 1..1 MS
* code from OmopProcedureCodes (extensible)
* code.coding 1..* MS
* code.coding.system 1..1 MS
* code.coding.code 1..1 MS

// --- Performed: OMOP procedure_date is required ---
* performed[x] 1..1 MS

// --- Subject: maps to person_id ---
* subject MS
* subject only Reference(Patient)

// --- Encounter: maps to visit_occurrence_id ---
* encounter MS

// --- Performer: maps to provider_id ---
* performer MS

// --- Body site: maps to modifier_concept_id ---
* bodySite MS
