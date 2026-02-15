# Task: MedicationDispense -> drug_exposure

**Priority**: P3 | **References**: 2/4 (HL7 IG, omoponfhir)

## Existing Spec

Listed in `spec/overview.md` and `spec/medication.md` but no dedicated spec file.

## Context

MedicationDispense captures actual pharmacy dispensing events — when a patient picks up their prescription. Different from MedicationRequest (order) and MedicationAdministration (given in hospital). Uses a distinct type_concept_id.

## Deliverables

### 1. FHIR Type (`src/types/fhir.ts`)

Add `MedicationDispense` interface:

```
MedicationDispense.id
MedicationDispense.status: preparation | in-progress | cancelled | on-hold | completed | entered-in-error | stopped | declined | unknown
MedicationDispense.medicationCodeableConcept: CodeableConcept
MedicationDispense.medicationReference: Reference
MedicationDispense.subject: Reference
MedicationDispense.context: Reference  (encounter)
MedicationDispense.performer[].actor: Reference
MedicationDispense.whenHandedOver: string  (date dispensed)
MedicationDispense.quantity: Quantity
MedicationDispense.daysSupply: Quantity
MedicationDispense.dosageInstruction: Dosage[]
```

### 2. OMOP Type

Reuse existing `DrugExposure` interface — no changes needed.

### 3. FSH Profile (`profiles/OmopMedicationDispense.fsh`)

- Base: MedicationDispense
- status: restrict to completed
- medication[x]: 1..1, bind to OmopDrugCodes
- subject: 1..1
- whenHandedOver: recommended

### 4. Mapper (`src/mapper/medication-dispense.ts`)

```
mapMedicationDispense(dispense: MedicationDispense, ctx: MappingContext): DrugExposure | null
```

- Status filter: `completed` only
- Type concept: 32838 (EHR dispensing)
- Key mapping:
  - medicationCodeableConcept -> drug_source_value
  - whenHandedOver -> drug_exposure_start_date
  - quantity.value -> quantity
  - daysSupply.value -> days_supply
  - dosageInstruction[0].route -> route_source_value

### 5. Tests (`tests/medication-dispense.test.ts`)

Cover:
- Status filtering
- Required field validation
- Quantity and days_supply mapping
- Route mapping
- Reference resolution
- Hash mode determinism

### 6. Spec (`spec/medication-dispense.md`)

Document field mapping, type concept distinction from MedicationRequest/Statement.
