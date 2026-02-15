# MedicationRequest.medicationCodeableConcept → OMOP DRUG_EXPOSURE code fields

## Источник

FHIR `MedicationRequest.medicationCodeableConcept` — CodeableConcept с кодами из RxNorm, NDC, ATC.

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

1. RxNorm (`http://www.nlm.nih.gov/research/umls/rxnorm`)
2. SNOMED CT (`http://snomed.info/sct`)
3. NDC (`http://hl7.org/fhir/sid/ndc`)

## Валидация

Если `medicationCodeableConcept.coding` пуст — запись **не создаётся**.

## Альтернатива: medicationReference

FHIR поддерживает `medicationReference` (ссылка на ресурс Medication). Текущий маппер поддерживает только `medicationCodeableConcept`. Для `medicationReference` потребуется разрешение ссылки и извлечение кода из связанного ресурса Medication.
