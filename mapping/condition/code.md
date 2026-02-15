# Condition.code → OMOP CONDITION_OCCURRENCE code fields

## Source

FHIR `Condition.code` — type `CodeableConcept`. Contains one or more Codings with codes from different systems (SNOMED, ICD-10-CM, ICD-10).

## Target

OMOP CONDITION_OCCURRENCE:
- `condition_concept_id` (integer, required) — FK → CONCEPT
- `condition_source_value` (varchar(50)) — original code
- `condition_source_concept_id` (integer) — source concept

## Mapping

| FHIR | OMOP | Notes |
|---|---|---|
| `code.coding[best].code` | `condition_source_value` | Best code by vocabulary priority |
| `code` | `condition_concept_id` | **0** (placeholder — requires Athena vocabulary) |
| `code` | `condition_source_concept_id` | **0** (placeholder) |

## Vocabulary priority

Best Coding selection via `selectBestCoding()`:

1. SNOMED CT (`http://snomed.info/sct`)
2. ICD-10-CM (`http://hl7.org/fhir/sid/icd-10-cm`)
3. ICD-10 (`http://hl7.org/fhir/sid/icd-10`)
4. CPT-4 (`http://www.ama-assn.org/go/cpt`)

If multiple Codings — the code from the system with the highest priority is selected.

## Validation

If `code.coding` is empty — record **is not created** (return null). Code is a required condition for mapping.

## Future work

- `condition_concept_id` requires lookup in Athena by source vocabulary + code
- `condition_source_concept_id` — concept_id of the source code in OMOP vocabulary
