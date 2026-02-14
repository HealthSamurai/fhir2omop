# Observation → OMOP MEASUREMENT / OBSERVATION Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| Observation | MEASUREMENT, OBSERVATION | FHIR → OMOP |

## Domain-Based Routing

Routing is based on `Observation.category`:

| Category | OMOP Target Table |
|----------|-------------------|
| laboratory | measurement |
| vital-signs | measurement |
| social-history | observation |
| survey | observation |
| activity | observation |
| *(no category)* | measurement (default) |

## Status Filtering

Only observations with finalized statuses are mapped:

| Status | Action |
|--------|--------|
| final | Map |
| amended | Map |
| corrected | Map |
| preliminary | Skip |
| registered | Skip |
| cancelled | Skip |
| entered-in-error | Skip |
| unknown | Skip |

## Field Mapping — MEASUREMENT

| FHIR Field | OMOP Field | Notes |
|------------|------------|-------|
| `id` | `measurement_id` | Via IdRegistry (sequential or hash mode) |
| `subject` | `person_id` | Reference resolution |
| `code` | `measurement_concept_id` | Requires vocabulary lookup (placeholder: 0) |
| `effectiveDateTime` | `measurement_date` | Date portion (YYYY-MM-DD) |
| `effectiveDateTime` | `measurement_datetime` | Full ISO datetime |
| *(EHR)* | `measurement_type_concept_id` | 32817 (EHR) |
| `valueQuantity.comparator` | `operator_concept_id` | `<`→4171756, `<=`→4171754, `>=`→4171755, `>`→4172703 |
| `valueQuantity.value` | `value_as_number` | Numeric result |
| `valueCodeableConcept` | `value_as_concept_id` | Requires vocabulary lookup (placeholder: null) |
| `valueQuantity.unit` | `unit_source_value` | Raw unit string |
| `valueQuantity.unit` | `unit_concept_id` | Requires UCUM lookup (placeholder: null) |
| `referenceRange[0].low.value` | `range_low` | Reference range lower bound |
| `referenceRange[0].high.value` | `range_high` | Reference range upper bound |
| `performer[0]` | `provider_id` | Reference resolution |
| `encounter` | `visit_occurrence_id` | Reference resolution |
| `code.coding[0].code` | `measurement_source_value` | Best coding by vocabulary priority |
| *(raw value)* | `value_source_value` | Verbatim value string (e.g., "<10 mg/dL") |

## Field Mapping — OBSERVATION

| FHIR Field | OMOP Field | Notes |
|------------|------------|-------|
| `id` | `observation_id` | Via IdRegistry |
| `subject` | `person_id` | Reference resolution |
| `code` | `observation_concept_id` | Requires vocabulary lookup (placeholder: 0) |
| `effectiveDateTime` | `observation_date` | Date portion |
| `effectiveDateTime` | `observation_datetime` | Full ISO datetime |
| *(EHR)* | `observation_type_concept_id` | 32817 (EHR) |
| `valueQuantity.value` | `value_as_number` | Numeric result |
| `valueString` | `value_as_string` | Text result |
| `valueCodeableConcept` | `value_as_string` | Source code value (text fallback) |
| `valueCodeableConcept` | `value_as_concept_id` | Requires vocabulary lookup (placeholder: null) |
| `valueQuantity.unit` | `unit_source_value` | Raw unit string |
| `interpretation[0].coding[0].code` | `qualifier_source_value` | Interpretation code (e.g., "H" for High) |
| `interpretation` | `qualifier_concept_id` | Requires vocabulary lookup (placeholder: null) |
| `performer[0]` | `provider_id` | Reference resolution |
| `encounter` | `visit_occurrence_id` | Reference resolution |
| `code.coding[0].code` | `observation_source_value` | Best coding by vocabulary priority |
| *(raw value)* | `value_source_value` | Verbatim value string |

## Component Observations

Observations with `component` (e.g., blood pressure) are expanded: each component produces its own OMOP record.

| Aspect | Behavior |
|--------|----------|
| Routing | All components share parent's category-based routing |
| Code | Component's own `code` overrides parent code |
| Value | Component's own `value[x]` is used |
| Reference Range | Component's own `referenceRange` is used |
| ID | Suffixed with `-comp-{index}` for unique IdRegistry keys |
| References | `person_id`, `visit_occurrence_id`, `provider_id` inherited from parent |

Example: Blood pressure (LOINC 85354-9) with systolic (8480-6) and diastolic (8462-4) produces 2 measurement records.

## Vocabulary Priority

Code selection follows this priority order (via `selectBestCoding`):

1. SNOMED CT
2. RxNorm
3. LOINC
4. ICD-10-CM
5. ICD-10
6. CPT-4
7. NDC
8. CVX

## Validation Rules

Resources are skipped (return null) when:
- Status is not final/amended/corrected
- `code.coding` is empty (no coded concept)
- `effectiveDateTime` is missing (OMOP date fields are required)

## Gaps and Future Work

- **Concept ID resolution**: All `*_concept_id` fields are placeholders (0/null) until vocabulary DB integration
- **Unit concept mapping**: UCUM codes need lookup in OMOP vocabulary
- **effectivePeriod**: Only `effectiveDateTime` is supported; `effectivePeriod` could map start→date
- **Specimen reference**: `Observation.specimen` could link to OMOP specimen table
- **Method**: `Observation.method` has no direct OMOP field
- **bodySite**: `Observation.bodySite` could map to measurement anatomic site

## Reference Implementations

### omoponfhir-v54-r4 (Java)
- Bidirectional mapping using `FObservationView`
- Category-based routing (laboratory, vital-signs, survey)
- Supports component observations

### fhir-omop-ig (FML)
- FHIR → OMOP mapping using FHIR Mapping Language
- Direct field mapping for code, effective, value

### ETL-German-FHIR-Core (Java)
- Domain-based routing to observation or measurement
- LOINC and SNOMED vocabulary support
- Reference range handling

### FhirToCdm (.NET)
- FHIR → OMOP (measurement table only)
