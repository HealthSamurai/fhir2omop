# Task: DiagnosticReport -> measurement / observation / note

**Priority**: P3 | **References**: 1/4 (ETL-German full impl; NACHC parser only)

## Existing Spec

`spec/diagnostic-report.md` — brief field mapping, domain-based routing, ETL-German reference.

## Context

DiagnosticReport is a container for lab panels and radiology reports. The `result` references to Observation resources are already handled by the Observation mapper. The value-add here is mapping `conclusionCode` (structured findings) and `conclusion` (narrative text -> note table).

## Deliverables

### 1. FHIR Type (`src/types/fhir.ts`)

Add `DiagnosticReport` interface:

```
DiagnosticReport.id
DiagnosticReport.status: registered | partial | preliminary | final | amended | corrected | appended | cancelled | entered-in-error | unknown
DiagnosticReport.category: CodeableConcept[]
DiagnosticReport.code: CodeableConcept
DiagnosticReport.subject: Reference
DiagnosticReport.encounter: Reference
DiagnosticReport.effectiveDateTime: string
DiagnosticReport.effectivePeriod: Period
DiagnosticReport.performer: Reference[]
DiagnosticReport.result: Reference[]  (-> Observation)
DiagnosticReport.conclusionCode: CodeableConcept[]
DiagnosticReport.conclusion: string
```

### 2. OMOP Types

Reuse `Measurement`, `OmopObservation`. May need `Note` interface:

```
note_id: number
person_id: number
note_date: string
note_datetime: string | null
note_type_concept_id: number
note_class_concept_id: number
note_title: string | null
note_text: string
encoding_concept_id: number
language_concept_id: number
provider_id: number | null
visit_occurrence_id: number | null
note_source_value: string | null
```

### 3. FSH Profile (`profiles/OmopDiagnosticReport.fsh`)

- Base: DiagnosticReport
- status: restrict to final, amended, corrected
- code: 1..1, bind to LOINC
- subject: 1..1

### 4. Mapper (`src/mapper/diagnostic-report.ts`)

```
mapDiagnosticReport(report: DiagnosticReport, ctx: MappingContext): DiagnosticReportMappingResult | null
```

Result type contains:
- measurement/observation from conclusionCode (domain-based routing)
- note from conclusion text (if present)
- Does NOT re-map result references (those are Observation resources mapped separately)

Status filter: final, amended, corrected.

### 5. Tests (`tests/diagnostic-report.test.ts`)

Cover:
- Status filtering
- ConclusionCode -> measurement/observation routing
- Conclusion text -> note mapping
- Reference resolution
- Result references (verify they are NOT duplicated)
- Code prioritization (LOINC primary)

### 6. Spec Update (`spec/diagnostic-report.md`)

Expand existing placeholder with full field mapping and routing decisions.
