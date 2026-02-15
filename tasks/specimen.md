# Task: Specimen -> specimen

**Priority**: P3 | **References**: 1/4 (HL7 IG mentions; minimal implementations)

## Existing Spec

Listed in `spec/overview.md` but no dedicated spec file.

## Context

OMOP `specimen` table links lab measurements to biological samples. Direct 1:1 mapping. Lower priority since most OMOP analyses don't use specimen data, but it enables more precise lab result tracking.

## Deliverables

### 1. FHIR Type (`src/types/fhir.ts`)

Add `Specimen` interface:

```
Specimen.id
Specimen.type: CodeableConcept  (specimen type, e.g. blood, urine)
Specimen.subject: Reference  (patient)
Specimen.collection.collectedDateTime: string
Specimen.collection.collectedPeriod: Period
Specimen.collection.quantity: Quantity
Specimen.collection.bodySite: CodeableConcept
```

### 2. OMOP Type (`src/types/omop.ts`)

Add `Specimen` interface:

```
specimen_id: number
person_id: number
specimen_concept_id: number
specimen_type_concept_id: number
specimen_date: string
specimen_datetime: string | null
quantity: number | null
unit_concept_id: number | null
unit_source_value: string | null
anatomic_site_concept_id: number
anatomic_site_source_value: string | null
disease_status_concept_id: number
disease_status_source_value: string | null
specimen_source_id: string | null
specimen_source_value: string | null
```

### 3. FSH Profile (`profiles/OmopSpecimen.fsh`)

- Base: Specimen
- type: 1..1, bind to SNOMED specimen types
- subject: 1..1
- collection.collectedDateTime: recommended

### 4. Mapper (`src/mapper/specimen.ts`)

```
mapSpecimen(specimen: Specimen, ctx: MappingContext): OmopSpecimen | null
```

- No status filtering (Specimen has no status in R4)
- Type concept: 32817 (EHR)
- Key mapping:
  - type -> specimen_concept_id (0) + specimen_source_value
  - collection.collectedDateTime -> specimen_date
  - collection.quantity -> quantity + unit_source_value
  - collection.bodySite -> anatomic_site_source_value
  - subject -> person_id

### 5. Tests (`tests/specimen.test.ts`)

Cover:
- Required field validation (type, subject)
- Date handling
- Quantity and unit mapping
- Body site mapping
- Reference resolution
- Hash mode determinism

### 6. Spec (`spec/specimen.md`)

Document field mapping, link to measurement records via specimen_id.
