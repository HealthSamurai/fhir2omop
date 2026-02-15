# Patient.gender → OMOP PERSON gender fields

## Source

FHIR `Patient.gender` — code from value set `AdministrativeGender`: `male`, `female`, `other`, `unknown`.

## Target

OMOP PERSON:
- `gender_concept_id` (integer, required) — FK → CONCEPT
- `gender_source_value` (varchar(50)) — original value
- `gender_source_concept_id` (integer) — source concept

## Mapping

| FHIR gender | gender_concept_id | OMOP Concept Name |
|---|---|---|
| `male` | **8507** | MALE |
| `female` | **8532** | FEMALE |
| `other` | **8521** | OTHER |
| `unknown` | **8551** | UNKNOWN |
| absent | **0** | No matching concept |

- `gender_source_value` — original string from FHIR (`"male"`, `"female"`, `"other"`, `"unknown"`). If absent — NULL.
- `gender_source_concept_id` — 0 (FHIR AdministrativeGender has no direct concept in OMOP vocabulary).

## Decision on other/unknown

We map `other` → 8521 and `unknown` → 8551 (not to 0). Concept 0 means "No matching concept" — it is for cases where the value could not be matched. `other` and `unknown` are valid values with specific concept IDs in the OMOP Gender vocabulary.

Most implementations (FhirToCdm, omopfhirmap, NACHC) incorrectly map to 0, losing the distinction. We follow the omoponfhir approach, which correctly uses 8521/8551.

## Implementation consensus

- **9/9**: male → 8507, female → 8532
- **1/9** (omoponfhir): other → 8521, unknown → 8551 — our choice
- **Others**: other/unknown → 0
