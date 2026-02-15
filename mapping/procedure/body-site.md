# Procedure.bodySite → OMOP PROCEDURE_OCCURRENCE modifier fields

## Источник

FHIR `Procedure.bodySite` — массив `CodeableConcept[]`. Описывает анатомическую локализацию процедуры. Обычно кодируется SNOMED CT Body Structure hierarchy.

## Цель

OMOP PROCEDURE_OCCURRENCE:
- `modifier_concept_id` (integer) — FK → CONCEPT, модификатор процедуры
- `modifier_source_value` (varchar(50)) — оригинальный код модификатора

## Маппинг

| FHIR | OMOP |
|---|---|
| `bodySite[0]` код | `modifier_source_value` |
| `bodySite[0]` → vocabulary lookup | `modifier_concept_id` (placeholder 0) |
| `bodySite` отсутствует | `modifier_source_value` = NULL, `modifier_concept_id` = 0 |

## Решение по множественным bodySite

OMOP `modifier_concept_id` — одно значение. При наличии нескольких `bodySite` берётся **первый** элемент. Это потеря информации, но OMOP CDM не поддерживает множественные модификаторы на одну запись.

## Консенсус реализаций

- **2/4** (omoponfhir, HL7 IG): маппят bodySite → modifier_concept_id
- **2/4** (FhirToCdm, ETL-German): не маппят bodySite
- **1/4** (omoponfhir): берёт первый bodySite при множественных значениях
