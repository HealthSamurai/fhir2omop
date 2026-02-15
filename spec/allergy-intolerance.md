# AllergyIntolerance ↔ OMOP OBSERVATION Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| AllergyIntolerance | OBSERVATION | Bidirectional |

**Note**: Maps to `observation` table (not drug_exposure) - allergies are clinical findings.

## Field Mapping

| FHIR Field | OMOP Field |
|------------|------------|
| `code` | `observation_concept_id` |
| `onsetDateTime` | `observation_date/datetime` |
| `patient` | `person_id` |
| `encounter` | `visit_occurrence_id` |
| `recorder` | `provider_id` |
| `reaction.manifestation` | `value_as_concept_id` |

## Status Filtering

### Clinical Status

| Clinical Status | Action |
|-----------------|--------|
| active | Map |
| inactive | Skip |
| resolved | Skip |
| *(missing)* | Map (clinicalStatus is optional) |

### Verification Status

| Verification Status | Action |
|---------------------|--------|
| confirmed | Map |
| unconfirmed | Map |
| refuted | Skip |
| entered-in-error | Skip |
| *(missing)* | Map |

## Extended Field Mapping

| FHIR Field | OMOP Field | Notes |
|------------|------------|-------|
| `id` | `observation_id` | Via IdRegistry |
| `patient` | `person_id` | Reference resolution |
| `code` | `observation_concept_id` | Requires vocabulary lookup (placeholder: 0) |
| `code.coding[best].code` | `observation_source_value` | Best coding by vocabulary priority |
| `onsetDateTime` | `observation_date` | Date portion (YYYY-MM-DD) |
| `onsetDateTime` | `observation_datetime` | Full ISO datetime |
| *(EHR)* | `observation_type_concept_id` | 32817 (EHR) |
| `reaction.manifestation` | `value_as_string` | Joined with "; " |
| `type` | `qualifier_source_value` | "allergy" or "intolerance" |
| `criticality` | `value_source_value` | "low", "high", or "unable-to-assess" |
| `encounter` | `visit_occurrence_id` | Reference resolution |
| `recorder` | `provider_id` | Reference resolution |

## Validation Rules

Resources are skipped (return null) when:
- `clinicalStatus` is inactive or resolved
- `verificationStatus` is entered-in-error or refuted
- `code.coding` is empty
- `onsetDateTime` is missing

## Vocabulary Priority

1. SNOMED CT (`http://snomed.info/sct`)
2. RxNorm (`http://www.nlm.nih.gov/research/umls/rxnorm`)

## Unmapped FHIR Elements

| FHIR Element | Reason Not Mapped | Potential Approach |
|--------------|-------------------|--------------------|
| `category` | No direct OMOP equivalent | Map to qualifier_source_value |
| `asserter` | OMOP has single provider_id; using recorder | Could prioritize asserter |
| `onsetAge` | Requires patient birthDate | Calculate with Patient context |
| `onsetPeriod` | Only onsetDateTime supported | Use period.start |
| `onsetRange` | Imprecise temporal data | Not applicable |
| `onsetString` | Free text | NLP extraction |
| `lastOccurrence` | No column | Date of last reaction |
| `note` | No column | Map to note_nlp |
| `reaction.substance` | No separate field | Allergen in main code |
| `reaction.severity` | No direct equivalent | Map to value_as_string |
| `reaction.exposureRoute` | No direct equivalent | Route of exposure |
| `reaction.onset` | No direct equivalent | Date of specific reaction |
| `identifier` | No standard field | Store in observation_source_value |

## Implementations

- **omoponfhir-v54-r4**: `OmopAllergyIntolerance.java` - bidirectional
- **fhir-omop-ig**: `Allergy.fml` - FHIR→OMOP
- **FhirToCdm**: `CreateObservation()` - FHIR→OMOP

## Gaps and Future Work

- **Concept ID resolution**: `observation_concept_id` and `observation_source_concept_id` are placeholders (0) pending Athena vocabulary integration
- **onsetPeriod/onsetAge**: Only `onsetDateTime` is supported; other onset types need implementation
- **Reaction coding**: `value_as_concept_id` could be populated with coded reaction manifestation via vocabulary lookup
- **Category as qualifier**: `category` (food/medication/environment/biologic) could enrich the observation
