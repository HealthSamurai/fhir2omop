# Task: MedicationAdministration -> drug_exposure

**Priority**: P3 | **References**: 2/4 (HL7 IG, ETL-German)

## Existing Spec

Listed in `spec/overview.md` and `spec/medication.md` but no dedicated spec file.

## Context

MedicationAdministration captures inpatient medication events — exact time a nurse gives a medication. Most precise timing of all medication resources. Used heavily in ICU/inpatient settings.

## Deliverables

### 1. FHIR Type (`src/types/fhir.ts`)

Add `MedicationAdministration` interface:

```
MedicationAdministration.id
MedicationAdministration.status: in-progress | not-done | on-hold | completed | entered-in-error | stopped | unknown
MedicationAdministration.medicationCodeableConcept: CodeableConcept
MedicationAdministration.medicationReference: Reference
MedicationAdministration.subject: Reference
MedicationAdministration.context: Reference  (encounter)
MedicationAdministration.effectiveDateTime: string
MedicationAdministration.effectivePeriod: Period
MedicationAdministration.performer[].actor: Reference
MedicationAdministration.dosage.dose: Quantity
MedicationAdministration.dosage.route: CodeableConcept
MedicationAdministration.dosage.rateQuantity: Quantity
```

### 2. OMOP Type

Reuse existing `DrugExposure` interface — no changes needed.

### 3. FSH Profile (`profiles/OmopMedicationAdministration.fsh`)

- Base: MedicationAdministration
- status: restrict to completed
- medication[x]: 1..1, bind to OmopDrugCodes
- subject: 1..1
- effective[x]: 1..1

### 4. Mapper (`src/mapper/medication-administration.ts`)

```
mapMedicationAdministration(admin: MedicationAdministration, ctx: MappingContext): DrugExposure | null
```

- Status filter: `completed` only
- Type concept: 38000179 (Physician administered drug)
- Key mapping:
  - medicationCodeableConcept -> drug_source_value
  - effectiveDateTime or effectivePeriod.start -> drug_exposure_start_date
  - effectivePeriod.end -> drug_exposure_end_date (or same as start)
  - dosage.dose.value -> quantity
  - dosage.route -> route_source_value
  - performer[0].actor -> provider_id

### 5. Tests (`tests/medication-administration.test.ts`)

Cover:
- Status filtering
- Required field validation
- Date handling (dateTime vs Period)
- Dosage mapping (dose, route, rate)
- Reference resolution
- Hash mode determinism

### 6. Spec (`spec/medication-administration.md`)

Document field mapping, type concept, distinction from other medication resources.
