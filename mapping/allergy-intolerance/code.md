# AllergyIntolerance.code → OMOP OBSERVATION code fields

## Источник

FHIR `AllergyIntolerance.code` — CodeableConcept с кодами из SNOMED, RxNorm.

## Цель

OMOP OBSERVATION:
- `observation_concept_id` (integer, required) — FK → CONCEPT
- `observation_source_value` (varchar(50)) — оригинальный код
- `observation_source_concept_id` (integer) — source concept

## Маппинг

| FHIR | OMOP | Примечания |
|---|---|---|
| `code.coding[best].code` | `observation_source_value` | Лучший код по приоритету словарей |
| `code` | `observation_concept_id` | **0** (placeholder — требует Athena) |
| `code` | `observation_source_concept_id` | **0** (placeholder) |

## Приоритет словарей

SNOMED CT > RxNorm > другие (через `selectBestCoding()`).

## Валидация

Если `code.coding` пуст — запись **не создаётся**.

## Решение: observation, не drug_exposure

AllergyIntolerance маппится в таблицу OBSERVATION (не DRUG_EXPOSURE). Аллергии — клинические находки, не лекарственные воздействия. Это соответствует подходу omoponfhir и fhir-omop-ig.
