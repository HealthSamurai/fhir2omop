# Patient US Core Race/Ethnicity → OMOP PERSON race/ethnicity fields

## Источник

US Core расширения на `Patient`:
- **Race**: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-race`
- **Ethnicity**: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity`

Каждое расширение содержит вложенные extension:
- `ombCategory` — категория OMB (Office of Management and Budget)
- `detailed` — детализированный код (например, конкретная азиатская этническая группа)
- `text` — текстовое описание

Мы маппим `ombCategory` как основной источник.

## Цель

OMOP PERSON:
- `race_concept_id` (integer, **required**) — FK → CONCEPT
- `race_source_value` (varchar(50)) — оригинальное значение
- `race_source_concept_id` (integer) — source concept
- `ethnicity_concept_id` (integer, **required**) — FK → CONCEPT
- `ethnicity_source_value` (varchar(50)) — оригинальное значение
- `ethnicity_source_concept_id` (integer) — source concept

## Маппинг Race

| OMB Race Code | Display | race_concept_id | OMOP Concept Name |
|---|---|---|---|
| `1002-5` | American Indian or Alaska Native | **8657** | American Indian or Alaska Native |
| `2028-9` | Asian | **8515** | Asian |
| `2054-5` | Black or African American | **8516** | Black or African American |
| `2076-8` | Native Hawaiian or Other Pacific Islander | **8557** | Native Hawaiian or Other Pacific Islander |
| `2106-3` | White | **8527** | White |
| отсутствует | — | **0** | No matching concept |

- `race_source_value` — display из ombCategory coding. Если нет display — code.
- `race_source_concept_id` — 0 (OMB коды не имеют прямого OMOP source concept).

## Маппинг Ethnicity

| OMB Ethnicity Code | Display | ethnicity_concept_id | OMOP Concept Name |
|---|---|---|---|
| `2135-2` | Hispanic or Latino | **38003563** | Hispanic or Latino |
| `2186-5` | Not Hispanic or Latino | **38003564** | Not Hispanic or Latino |
| отсутствует | — | **0** | No matching concept |

- `ethnicity_source_value` — display из ombCategory coding. Если нет display — code.
- `ethnicity_source_concept_id` — 0.

## Решение по отсутствующим расширениям

Если US Core Race/Ethnicity extension отсутствует:
- `race_concept_id` = 0, `race_source_value` = NULL
- `ethnicity_concept_id` = 0, `ethnicity_source_value` = NULL

Concept 0 = "No matching concept". Не используем 8552 (Unknown) — это для случаев когда значение явно указано как "unknown". Отсутствие расширения означает "не записано", а не "неизвестно".

## Ограничения

- US-специфично: US Core расширения не используются в Европе
- Немецкие данные используют `ethnicGroup` extension (SNOMED) — несовместимо с US Core
- `race_concept_id` и `ethnicity_concept_id` — required fields в OMOP. Даже при отсутствии данных нужно записать 0.

## Консенсус реализаций

| Project | Race Source | Метод | Отсутствует |
|---|---|---|---|
| omoponfhir-v54-r4 | US Core ombCategory | Hardcoded map | null |
| FhirToCdm | US Core ombCategory display | Hardcoded map | 0 |
| NACHC | US Core ombCategory | DB lookup | 0 + "Not Available" |
| mends-on-fhir | OMOP concept | ConceptMap JSON | UNK |
| ETL-German-FHIR-Core | German ethnicGroup | SNOMED lookup | 8552 (Unknown) |

Мы следуем подходу omoponfhir с прямым маппингом OMB code → concept_id и значением 0 для отсутствующих данных.
