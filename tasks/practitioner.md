# Task: Practitioner / PractitionerRole -> provider

**Priority**: P2 | **References**: 3/4 (FhirToCdm, ETL-German, omoponfhir)

## Existing Spec

None — new spec needed.

## Context

Clinical mappers already extract `provider_id` from FHIR references (performer, requester, asserter, recorder) but there is no mapper to populate the `provider` table. This is a dangling FK.

## Deliverables

### 1. FHIR Types (`src/types/fhir.ts`)

Add `Practitioner` interface:

```
Practitioner.id
Practitioner.identifier: Identifier[]  (NPI etc.)
Practitioner.name: HumanName[]
Practitioner.gender: male | female | other | unknown
Practitioner.active: boolean
```

Add `PractitionerRole` interface:

```
PractitionerRole.id
PractitionerRole.practitioner: Reference
PractitionerRole.organization: Reference
PractitionerRole.specialty: CodeableConcept[]
PractitionerRole.code: CodeableConcept[]
```

### 2. OMOP Type (`src/types/omop.ts`)

Add `Provider` interface:

```
provider_id: number
provider_name: string | null
npi: string | null
dea: string | null
specialty_concept_id: number
care_site_id: number | null
year_of_birth: number | null
gender_concept_id: number
gender_source_value: string | null
provider_source_value: string | null
specialty_source_value: string | null
specialty_source_concept_id: number
gender_source_concept_id: number
```

### 3. FSH Profile (`profiles/OmopPractitioner.fsh`)

- Base: Practitioner
- identifier: 1..* (recommend NPI)
- name: 1..*

### 4. Mapper (`src/mapper/practitioner.ts`)

```
mapPractitioner(practitioner: Practitioner, role?: PractitionerRole, ctx): Provider
```

- No status filtering (Practitioner has no clinical status)
- active = false -> skip (return null)
- identifier (NPI system) -> npi, provider_source_value
- name -> provider_name (family + given)
- role.specialty -> specialty_source_value (specialty_concept_id = 0)
- role.organization -> care_site_id via ctx.ids.resolveRef
- gender -> gender_concept_id (same mapping as Patient)

### 5. Tests (`tests/practitioner.test.ts`)

Cover:
- Name formatting
- NPI extraction from identifiers
- Specialty mapping from PractitionerRole
- Organization -> care_site_id reference resolution
- Gender concept mapping
- Active flag filtering
- Hash mode determinism

### 6. Spec (`spec/practitioner.md`)

Document field mapping decisions, NPI selection logic, PractitionerRole merging strategy.
