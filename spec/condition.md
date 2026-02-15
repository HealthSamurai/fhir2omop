# Condition ↔ OMOP CONDITION_OCCURRENCE Mapping

## Overview

| FHIR Resource | FHIR Profile | OMOP Table | Direction |
|---------------|-------------|------------|-----------|
| Condition | OmopCondition | CONDITION_OCCURRENCE | FHIR → OMOP |

## Status Filtering

### Clinical Status

Only active conditions are mapped. Inactive/resolved conditions represent historical state that typically does not produce new condition_occurrence records.

| Clinical Status | Action |
|-----------------|--------|
| active | Map |
| recurrence | Map |
| relapse | Map |
| inactive | Skip |
| remission | Skip |
| resolved | Skip |
| *(missing)* | Map (clinicalStatus is optional in FHIR) |

### Verification Status

| Verification Status | Action |
|---------------------|--------|
| confirmed | Map |
| unconfirmed | Map |
| provisional | Map |
| differential | Map |
| entered-in-error | Skip |
| refuted | Skip |
| *(missing)* | Map |

## Field Mapping

| FHIR Condition Field | OMOP Field | Notes |
|----------------------|------------|-------|
| `id` | `condition_occurrence_id` | Via IdRegistry (sequential or hash mode) |
| `subject` | `person_id` | Reference resolution |
| `code` | `condition_concept_id` | Requires vocabulary lookup (placeholder: 0) |
| `code.coding[best].code` | `condition_source_value` | Best coding by vocabulary priority |
| `code` | `condition_source_concept_id` | Requires vocabulary lookup (placeholder: 0) |
| `onset[x]` | `condition_start_date` | Date portion (YYYY-MM-DD); see onset handling below |
| `onset[x]` | `condition_start_datetime` | Full ISO datetime when available |
| `abatement[x]` | `condition_end_date` | Date portion; see abatement handling below |
| `abatement[x]` | `condition_end_datetime` | Full ISO datetime when available |
| `category` | `condition_type_concept_id` | See type concept mapping below |
| `clinicalStatus` | `condition_status_concept_id` | See status concept mapping below |
| `clinicalStatus.coding[0].code` | `condition_status_source_value` | Raw clinical status code |
| `abatementString` | `stop_reason` | Free-text reason for resolution |
| `asserter` | `provider_id` | Reference resolution (Practitioner) |
| `recorder` | `provider_id` | Fallback if asserter is absent |
| `encounter` | `visit_occurrence_id` | Reference resolution |

## Onset[x] Handling

FHIR Condition supports polymorphic onset. We handle dateTime and Period; other types require additional context we don't have.

| onset[x] Type | Mapping | Notes |
|---------------|---------|-------|
| `onsetDateTime` | Direct → `condition_start_date/datetime` | Primary path |
| `onsetPeriod` | `period.start` → `condition_start_date/datetime` | Uses period start |
| `onsetAge` | Not mapped | Requires patient birthDate for calculation |
| `onsetRange` | Not mapped | Age range; imprecise |
| `onsetString` | Not mapped | Free text; no reliable date |
| *(missing)* | `recordedDate` as fallback | Last resort for start date |

## Abatement[x] Handling

| abatement[x] Type | Mapping | Notes |
|--------------------|---------|-------|
| `abatementDateTime` | Direct → `condition_end_date/datetime` | Primary path |
| `abatementPeriod` | `period.end` → `condition_end_date/datetime` | Uses period end |
| `abatementString` | → `stop_reason` | Free text reason |
| `abatementAge` | Not mapped | Requires patient birthDate |
| `abatementRange` | Not mapped | Age range; imprecise |
| *(missing)* | `null` end dates | Condition may be ongoing |

## Type Concept Mapping (category → condition_type_concept_id)

| FHIR Category | OMOP Type Concept ID | Description |
|---------------|---------------------|-------------|
| `problem-list-item` | 32840 | Problem list from EHR |
| `encounter-diagnosis` | 32817 | EHR encounter record |
| *(missing/other)* | 32817 | Default: EHR |

## Status Concept Mapping (clinicalStatus → condition_status_concept_id)

| FHIR Clinical Status | OMOP Status Concept ID | Concept Name |
|----------------------|----------------------|--------------|
| `active` | 32902 | Active condition |
| `recurrence` | 32902 | Active condition (treated as active) |
| `relapse` | 32902 | Active condition (treated as active) |
| *(missing)* | 0 | Unknown/unmapped |

## Vocabulary Priority

Code selection follows this priority order (via `selectBestCoding`):

1. SNOMED CT (`http://snomed.info/sct`)
2. ICD-10-CM (`http://hl7.org/fhir/sid/icd-10-cm`)
3. ICD-10 (`http://hl7.org/fhir/sid/icd-10`)
4. CPT-4 (`http://www.ama-assn.org/go/cpt`)

## Validation Rules

Resources are skipped (return null) when:
- `clinicalStatus` is inactive, remission, or resolved
- `verificationStatus` is entered-in-error or refuted
- `code.coding` is empty (no coded concept)
- No resolvable start date (no onset[x] and no recordedDate)

## Unmapped FHIR Elements

These Condition elements have no direct OMOP condition_occurrence field:

| FHIR Element | Reason Not Mapped | Potential Approach |
|--------------|-------------------|--------------------|
| `severity` | No column in condition_occurrence | Could create separate observation record |
| `bodySite` | No column in condition_occurrence | Could map to observation or note |
| `stage` | No column in condition_occurrence | Could create separate observation/measurement |
| `evidence` | No column in condition_occurrence | Could link to observation records |
| `note` | No column in condition_occurrence | Could map to note_nlp table |
| `identifier` | No standard field | Could store in condition_source_value |
| `verificationStatus` | Used for filtering only | No OMOP equivalent beyond status filtering |
| `onset[x]` as Age/Range/string | Imprecise temporal data | Would need patient context for age-based calculation |
| `abatement[x]` as Age/Range | Imprecise temporal data | Would need patient context |
| `recorder` vs `asserter` | OMOP has single provider_id | Asserter preferred; recorder as fallback |

## Reference Implementations

### omoponfhir-v54-r4 (Java)
- Bidirectional mapping
- ICD-10 and SNOMED vocabulary support
- Category-based type concept assignment

### fhir-omop-ig (FML)
- FHIR → OMOP mapping using FHIR Mapping Language
- Maps code, onset, clinicalStatus → condition_status_concept_id

### ETL-German-FHIR-Core (Java)
- Most comprehensive: onset[x] polymorphism with full fallback chain
- Domain-based routing (condition_occurrence, observation, procedure_occurrence)
- ICD-10-GM diagnostic certainty support
- Severity/body site extracted to separate observation records
- Multiple codings generate multiple OMOP records

### FhirToCdm (.NET)
- Minimal: only onsetDateTime, hardcoded type concept
- condition_status_concept_id not mapped

## Gaps and Future Work

- **Concept ID resolution**: `condition_concept_id` and `condition_source_concept_id` are placeholders (0) pending vocabulary DB integration
- **Domain-based routing**: Some SNOMED conditions may actually be procedures or observations; requires concept domain lookup
- **Multiple codings**: Currently selects best coding; could generate multiple records per coding
- **Severity as observation**: Could create OMOP observation records for severity data
- **visit_detail_id**: Could be populated from more granular encounter data
