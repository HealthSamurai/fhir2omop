# Task: Procedure -> procedure_occurrence

**Priority**: P1 | **References**: 4/4 (HL7 IG, FhirToCdm, ETL-German, omoponfhir)

## Existing Spec

`spec/procedure.md` — field mapping, type concepts, domain routing notes, implementation examples from 4 reference projects.

## Deliverables

### 1. FHIR Type (`src/types/fhir.ts`)

Add `Procedure` interface:

```
Procedure.id
Procedure.status: completed | in-progress | not-done | on-hold | stopped | entered-in-error | unknown
Procedure.code: CodeableConcept
Procedure.subject: Reference
Procedure.encounter: Reference
Procedure.performedDateTime: string
Procedure.performedPeriod: Period
Procedure.performer[].actor: Reference
Procedure.bodySite: CodeableConcept[]
Procedure.reasonCode: CodeableConcept[]
Procedure.usedCode: CodeableConcept[]
```

### 2. OMOP Type (`src/types/omop.ts`)

Add `ProcedureOccurrence` interface:

```
procedure_occurrence_id: number
person_id: number
procedure_concept_id: number
procedure_date: string
procedure_datetime: string | null
procedure_end_date: string | null
procedure_end_datetime: string | null
procedure_type_concept_id: number
modifier_concept_id: number | null
quantity: number | null
provider_id: number | null
visit_occurrence_id: number | null
visit_detail_id: number | null
procedure_source_value: string | null
procedure_source_concept_id: number
qualifier_source_value: string | null
```

### 3. FSH Profile (`profiles/OmopProcedure.fsh`)

- Base: Procedure
- status: restrict to `completed`
- code: 1..1, bind to OMOP-resolvable procedure codes (SNOMED, CPT4, ICD-10-PCS, HCPCS)
- performed[x]: 1..1
- subject: 1..1

Add `OmopProcedureCodes` ValueSet to `profiles/valuesets.fsh`:
- SNOMED CT, CPT4, ICD-10-PCS, HCPCS

### 4. Mapper (`src/mapper/procedure.ts`)

```
mapProcedure(procedure: Procedure, ctx: MappingContext): ProcedureOccurrence | null
```

- Status filter: `completed` only
- Type concept: 32817 (EHR)
- Field mapping per spec/procedure.md
- bodySite -> modifier_source_value (concept_id = 0 for now)
- performer[0].actor -> provider_id via ctx.ids.resolveRef

### 5. Tests (`tests/procedure.test.ts`)

Cover:
- Status filtering (completed -> mapped; not-done/entered-in-error -> null)
- Required field validation (code, performedDateTime)
- Date handling (performedDateTime vs performedPeriod, end date)
- Reference resolution (subject, encounter, performer)
- Code prioritization (SNOMED > CPT4 > ICD-10-PCS)
- Body site mapping
- Hash mode determinism

### 6. ValueSet Update (`profiles/valuesets.fsh`)

Add `OmopProcedureStatus` ValueSet restricting to `completed`.
Add `OmopProcedureCodes` ValueSet with SNOMED, CPT4, ICD-10-PCS, HCPCS.
