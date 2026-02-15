# MedicationStatement.medicationCodeableConcept → OMOP DRUG_EXPOSURE code fields

## Источник

FHIR `MedicationStatement.medicationCodeableConcept` — CodeableConcept с кодами из RxNorm, NDC, ATC.

## Цель

OMOP DRUG_EXPOSURE:
- `drug_concept_id` (integer, required) — FK → CONCEPT
- `drug_source_value` (varchar(50)) — оригинальный код
- `drug_source_concept_id` (integer) — source concept

## Маппинг

| FHIR | OMOP | Примечания |
|---|---|---|
| `medicationCodeableConcept.coding[best].code` | `drug_source_value` | Лучший код по приоритету словарей |
| `medicationCodeableConcept` | `drug_concept_id` | **0** (placeholder — требует Athena) |
| `medicationCodeableConcept` | `drug_source_concept_id` | **0** (placeholder) |

## Приоритет словарей

Аналогичен MedicationRequest: RxNorm > SNOMED > NDC.

## Валидация

Если `medicationCodeableConcept.coding` пуст — запись **не создаётся**.
