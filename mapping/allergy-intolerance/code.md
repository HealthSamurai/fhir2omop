# AllergyIntolerance.code → OMOP OBSERVATION code fields

## Source

FHIR `AllergyIntolerance.code` — CodeableConcept with codes from SNOMED, RxNorm.

## Target

OMOP OBSERVATION:
- `observation_concept_id` (integer, required) — FK → CONCEPT
- `observation_source_value` (varchar(50)) — original code
- `observation_source_concept_id` (integer) — source concept

## Mapping

| FHIR | OMOP | Notes |
|---|---|---|
| `code.coding[best].code` | `observation_source_value` | Best code by vocabulary priority |
| `code` | `observation_concept_id` | **0** (placeholder — requires Athena) |
| `code` | `observation_source_concept_id` | **0** (placeholder) |

## Vocabulary priority

SNOMED CT > RxNorm > others (via `selectBestCoding()`).

## Validation

If `code.coding` is empty — record **is not created**.

## Decision: observation, not drug_exposure

AllergyIntolerance is mapped to the OBSERVATION table (not DRUG_EXPOSURE). Allergies are clinical findings, not drug exposures. This is consistent with the approach of omoponfhir and fhir-omop-ig.
