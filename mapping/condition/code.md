# Condition.code → OMOP CONDITION_OCCURRENCE code fields

## Источник

FHIR `Condition.code` — тип `CodeableConcept`. Содержит один или несколько Coding с кодами из разных систем (SNOMED, ICD-10-CM, ICD-10).

## Цель

OMOP CONDITION_OCCURRENCE:
- `condition_concept_id` (integer, required) — FK → CONCEPT
- `condition_source_value` (varchar(50)) — оригинальный код
- `condition_source_concept_id` (integer) — source concept

## Маппинг

| FHIR | OMOP | Примечания |
|---|---|---|
| `code.coding[best].code` | `condition_source_value` | Лучший код по приоритету словарей |
| `code` | `condition_concept_id` | **0** (placeholder) — требует Athena vocabulary |
| `code` | `condition_source_concept_id` | **0** (placeholder) |

## Приоритет словарей

Выбор лучшего Coding через `selectBestCoding()`:

1. SNOMED CT (`http://snomed.info/sct`)
2. ICD-10-CM (`http://hl7.org/fhir/sid/icd-10-cm`)
3. ICD-10 (`http://hl7.org/fhir/sid/icd-10`)
4. CPT-4 (`http://www.ama-assn.org/go/cpt`)

Если несколько Coding — выбирается код из системы с наивысшим приоритетом.

## Валидация

Если `code.coding` пуст — запись **не создаётся** (return null). Код — обязательное условие для маппинга.

## Будущая работа

- `condition_concept_id` требует lookup в Athena по source vocabulary + code
- `condition_source_concept_id` — concept_id исходного кода в OMOP vocabulary
