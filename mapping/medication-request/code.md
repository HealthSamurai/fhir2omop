# MedicationRequest.medicationCodeableConcept → OMOP DRUG_EXPOSURE code fields

## Source

FHIR `MedicationRequest.medicationCodeableConcept` — CodeableConcept with codes from RxNorm, NDC, ATC.

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

1. RxNorm (`http://www.nlm.nih.gov/research/umls/rxnorm`)
2. SNOMED CT (`http://snomed.info/sct`)
3. NDC (`http://hl7.org/fhir/sid/ndc`)

## Validation

If `medicationCodeableConcept.coding` is empty — record **is not created**.

## Alternative: medicationReference

FHIR supports `medicationReference` (reference to a Medication resource). The current mapper supports only `medicationCodeableConcept`. For `medicationReference`, resolving the reference and extracting the code from the linked Medication resource would be required.
