# Task: Immunization -> drug_exposure

**Priority**: P1 | **References**: 3/4 (HL7 IG, FhirToCdm, ETL-German)

## Existing Spec

`spec/immunization.md` — field mapping, CVX vocabulary, type concepts, implementation examples from 4 reference projects.

## Deliverables

### 1. FHIR Type (`src/types/fhir.ts`)

Add `Immunization` interface:

```
Immunization.id
Immunization.status: completed | entered-in-error | not-done
Immunization.vaccineCode: CodeableConcept
Immunization.patient: Reference
Immunization.encounter: Reference
Immunization.occurrenceDateTime: string
Immunization.performer[].actor: Reference
Immunization.lotNumber: string
Immunization.route: CodeableConcept
Immunization.doseQuantity: Quantity
Immunization.site: CodeableConcept
Immunization.protocolApplied[].doseNumber: number
```

### 2. OMOP Type

Reuse existing `DrugExposure` interface — no changes needed.

### 3. FSH Profile (`profiles/OmopImmunization.fsh`)

- Base: Immunization
- status: restrict to `completed`
- vaccineCode: 1..1, bind to `OmopVaccineCodes` (CVX, SNOMED, ATC)
- occurrenceDateTime: 1..1
- patient: 1..1

Add `OmopVaccineCodes` ValueSet to `profiles/valuesets.fsh`:
- CVX (primary), SNOMED CT, ATC

### 4. Mapper (`src/mapper/immunization.ts`)

```
mapImmunization(immunization: Immunization, ctx: MappingContext): DrugExposure | null
```

- Status filter: `completed` only
- Type concept: 38000179 (Physician administered drug)
- Key mapping rules:
  - occurrenceDateTime -> drug_exposure_start_date = drug_exposure_end_date (single event)
  - lotNumber -> lot_number
  - doseQuantity.value -> quantity
  - route -> route_source_value (route_concept_id = 0)
  - vaccineCode -> drug_source_value via getSourceValue()

### 5. Tests (`tests/immunization.test.ts`)

Cover:
- Status filtering (completed -> mapped; not-done/entered-in-error -> null)
- Required field validation (vaccineCode, occurrenceDateTime)
- Single-event date mapping (start = end)
- Lot number mapping
- Dose quantity mapping
- Route mapping
- Reference resolution (patient, encounter, performer)
- CVX code selection priority
- Hash mode determinism

### 6. ValueSet Update (`profiles/valuesets.fsh`)

Add `OmopImmunizationStatus` and `OmopVaccineCodes` ValueSets.
