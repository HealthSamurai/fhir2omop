# Patient.gender → OMOP PERSON gender fields

## Источник

FHIR `Patient.gender` — код из value set `AdministrativeGender`: `male`, `female`, `other`, `unknown`.

## Цель

OMOP PERSON:
- `gender_concept_id` (integer, required) — FK → CONCEPT
- `gender_source_value` (varchar(50)) — оригинальное значение
- `gender_source_concept_id` (integer) — source concept

## Маппинг

| FHIR gender | gender_concept_id | OMOP Concept Name |
|---|---|---|
| `male` | **8507** | MALE |
| `female` | **8532** | FEMALE |
| `other` | **8521** | OTHER |
| `unknown` | **8551** | UNKNOWN |
| отсутствует | **0** | No matching concept |

- `gender_source_value` — оригинальная строка из FHIR (`"male"`, `"female"`, `"other"`, `"unknown"`). Если отсутствует — NULL.
- `gender_source_concept_id` — 0 (FHIR AdministrativeGender не имеет прямого concept в OMOP vocabulary).

## Решение по other/unknown

Маппим `other` → 8521 и `unknown` → 8551 (а не в 0). Concept 0 означает "No matching concept" — это для случаев когда значение не удалось сопоставить. `other` и `unknown` — валидные значения с конкретными concept ID в OMOP Gender vocabulary.

Большинство реализаций (FhirToCdm, omopfhirmap, NACHC) ошибочно маппят в 0, теряя различие. Мы следуем подходу omoponfhir, который корректно использует 8521/8551.

## Консенсус реализаций

- **9/9**: male → 8507, female → 8532
- **1/9** (omoponfhir): other → 8521, unknown → 8551 — наш выбор
- **Остальные**: other/unknown → 0
