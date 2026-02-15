# Task: Organization -> care_site

**Priority**: P2 | **References**: 3/4 (FhirToCdm, ETL-German, omoponfhir)

## Existing Spec

None — new spec needed.

## Context

Encounter mapper references `care_site_id` via `serviceProvider`. Patient mapper references via `managingOrganization`. No mapper populates the `care_site` table. This is a dangling FK.

## Deliverables

### 1. FHIR Type (`src/types/fhir.ts`)

Add `Organization` interface:

```
Organization.id
Organization.identifier: Identifier[]
Organization.active: boolean
Organization.type: CodeableConcept[]
Organization.name: string
Organization.address: Address[]
Organization.partOf: Reference
```

### 2. OMOP Type (`src/types/omop.ts`)

Add `CareSite` interface:

```
care_site_id: number
care_site_name: string | null
place_of_service_concept_id: number
location_id: number | null
care_site_source_value: string | null
place_of_service_source_value: string | null
```

### 3. FSH Profile (`profiles/OmopOrganization.fsh`)

- Base: Organization
- name: 1..1
- identifier: recommended

### 4. Mapper (`src/mapper/organization.ts`)

```
mapOrganization(org: Organization, ctx: MappingContext): { careSite: CareSite, location: Location | null }
```

- active = false -> skip (return null)
- name -> care_site_name
- identifier[0].value -> care_site_source_value
- type -> place_of_service_source_value (concept_id = 0)
- address -> Location record (reuse Patient address->location pattern)
- Reuse `selectAddress` utility or extract shared address mapper

### 5. Tests (`tests/organization.test.ts`)

Cover:
- Name mapping
- Identifier extraction
- Type -> place_of_service mapping
- Address -> Location generation
- Active flag filtering
- Hash mode determinism

### 6. Spec (`spec/organization.md`)

Document field mapping, type concept mapping for place_of_service.
