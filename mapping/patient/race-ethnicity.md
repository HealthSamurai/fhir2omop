# Patient extensions (Race/Ethnicity) → OMOP PERSON race/ethnicity fields

## Источник

US Core extensions на Patient:
- `http://hl7.org/fhir/us/core/StructureDefinition/us-core-race` — раса
- `http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity` — этническая принадлежность

Каждый extension содержит:
- `ombCategory` — код OMB (Office of Management and Budget)
- `detailed` — детализированный код (опционально)
- `text` — текстовое описание

## Цель

OMOP PERSON:
- `race_concept_id` (integer, **required**) — FK → CONCEPT
- `race_source_value` (varchar(50)) — оригинальное значение
- `race_source_concept_id` (integer) — FK → CONCEPT, обычно 0
- `ethnicity_concept_id` (integer, **required**) — FK → CONCEPT
- `ethnicity_source_value` (varchar(50)) — оригинальное значение
- `ethnicity_source_concept_id` (integer) — FK → CONCEPT, обычно 0

## Маппинг Race

Используем `ombCategory` код из US Core Race extension.

| OMB Code | Display | race_concept_id | OMOP Concept Name |
|---|---|---|---|
| `1002-5` | American Indian or Alaska Native | **8657** | American Indian or Alaska Native |
| `2028-9` | Asian | **8515** | Asian |
| `2054-5` | Black or African American | **8516** | Black or African American |
| `2076-8` | Native Hawaiian or Other Pacific Islander | **8557** | Native Hawaiian or Other Pacific Islander |
| `2106-3` | White | **8527** | White |
| `UNK` | Unknown | **8552** | Unknown |
| отсутствует | — | **0** | No matching concept |

- `race_source_value` — текст из `text` sub-extension или display из `ombCategory`
- `race_source_concept_id` — 0

## Маппинг Ethnicity

Используем `ombCategory` код из US Core Ethnicity extension.

| OMB Code | Display | ethnicity_concept_id | OMOP Concept Name |
|---|---|---|---|
| `2135-2` | Hispanic or Latino | **38003563** | Hispanic or Latino |
| `2186-5` | Not Hispanic or Latino | **38003564** | Not Hispanic or Latino |
| `UNK` | Unknown | **0** | No matching concept |
| отсутствует | — | **0** | No matching concept |

- `ethnicity_source_value` — текст из `text` sub-extension или display из `ombCategory`
- `ethnicity_source_concept_id` — 0

## Решения

### US-специфичность

Race и Ethnicity в OMOP — это US-ориентированные поля (OMB categories). Для данных из других стран:
- Если есть локальные extensions (например, German `ethnicGroup`) — маппить через SNOMED → OMOP concept lookup
- Если данных о расе/этничности нет — использовать `concept_id = 0`

### Множественные категории

US Core позволяет указать несколько `ombCategory` и `detailed` кодов. OMOP поддерживает только одно значение. Правило:
1. Берём первый `ombCategory` код
2. Если `ombCategory` отсутствует — берём первый `detailed` код
3. Текст сохраняем полностью в `*_source_value`

### Обязательность полей

`race_concept_id` и `ethnicity_concept_id` — required в OMOP (NOT NULL). Если extension отсутствует, используем `0` (No matching concept), а не NULL.

## Консенсус реализаций

- **5/9** проектов маппят race/ethnicity (все US-ориентированные)
- Подходы: hardcoded map (FhirToCdm), DB lookup (NACHC), ConceptMap файлы (mends-on-fhir)
- German ETL использует другой extension (`ethnicGroup`) с SNOMED кодами
- Мы используем hardcoded маппинг OMB → OMOP concept ID (простой и надёжный)
