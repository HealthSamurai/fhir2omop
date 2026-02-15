# Procedure.code → OMOP PROCEDURE_OCCURRENCE concept fields

## Источник

FHIR `Procedure.code` — `CodeableConcept` с одной или несколькими кодировками. Типичные системы: SNOMED CT, CPT-4, ICD-10-PCS, HCPCS.

## Цель

OMOP PROCEDURE_OCCURRENCE:
- `procedure_concept_id` (integer, required) — FK → CONCEPT, стандартный concept
- `procedure_source_value` (varchar(50)) — оригинальный код
- `procedure_source_concept_id` (integer) — source concept ID

## Маппинг

1. Из `code.coding[]` выбирается лучшая кодировка по приоритету: SNOMED > CPT4 > ICD10CM > ICD10
2. `procedure_source_value` = код выбранной кодировки
3. `procedure_concept_id` = 0 (placeholder, требуется vocabulary lookup через CONCEPT таблицу)
4. `procedure_source_concept_id` = 0 (placeholder)

## Решение по отсутствующему коду

Если `code` отсутствует или `code.coding` пуст — запись **не создаётся**. `procedure_concept_id` — обязательное поле.

## Приоритет кодировок

| Приоритет | Система | URI |
|---|---|---|
| 1 | SNOMED CT | http://snomed.info/sct |
| 2 | CPT-4 | http://www.ama-assn.org/go/cpt |
| 3 | ICD-10-CM | http://hl7.org/fhir/sid/icd-10-cm |
| 4 | ICD-10 | http://hl7.org/fhir/sid/icd-10 |

## Консенсус реализаций

- **4/4**: извлекают код из coding, сохраняют source_value
- **3/4**: поддерживают SNOMED и CPT-4
- **2/4** (omoponfhir, ETL-German): поддерживают ICD-10-PCS
