# MedicationStatement.medicationCodeableConcept → OMOP DRUG_EXPOSURE code fields

## Source

FHIR `MedicationStatement.medicationCodeableConcept` — CodeableConcept with codes from RxNorm, NDC, ATC.

## Target

OMOP DRUG_EXPOSURE:
- `drug_concept_id` (integer, required) — FK → CONCEPT
- `drug_source_value` (varchar(50)) — original code
- `drug_source_concept_id` (integer) — source concept

## Mapping

| FHIR | OMOP | Notes |
|---|---|---|
| `medicationCodeableConcept.coding[best].code` | `drug_source_value` | Best code by vocabulary priority |
| `medicationCodeableConcept` | `drug_concept_id` | **0** (placeholder — requires Athena) |
| `medicationCodeableConcept` | `drug_source_concept_id` | **0** (placeholder) |

## Vocabulary priority

Same as MedicationRequest: RxNorm > SNOMED > NDC.

## Validation

If `medicationCodeableConcept.coding` is empty — record **is not created**.
