# Patient.id / Patient.identifier → OMOP PERSON person_source_value

## Источник

- `Patient.id` — логический идентификатор ресурса
- `Patient.identifier` — массив бизнес-идентификаторов (SSN, MRN и др.), каждый с `system` и `value`

## Цель

OMOP PERSON:
- `person_source_value` (varchar(50)) — исходный идентификатор пациента

## Решение: стратегия выбора идентификатора

Формат записи: `"{system}|{value}"` — сохраняем систему для уникальности при интеграции данных из нескольких источников.

**Приоритет выбора:**

1. `identifier` с `system = "http://hl7.org/fhir/sid/us-ssn"` (SSN)
2. `identifier` с `type.coding.code = "MR"` (MRN — Medical Record Number)
3. `identifier[0]` (первый в массиве)
4. `Patient.id` (fallback, без system — просто id)

## Примеры

| FHIR | person_source_value |
|---|---|
| identifier: system=`http://hospital.org/mrn`, value=`12345` | `http://hospital.org/mrn\|12345` |
| identifier: system=`http://hl7.org/fhir/sid/us-ssn`, value=`999-99-9999` | `http://hl7.org/fhir/sid/us-ssn\|999-99-9999` |
| только Patient.id = `abc-123` | `abc-123` |

## Дополнительные поля

- `person_source_concept_id` — 0 (нет стандартного concept для типа идентификатора)

## Ограничения

- `person_source_value` — varchar(50). Длинные system URI + value могут превысить лимит. В этом случае обрезаем system до минимально различимой части.

## Консенсус реализаций

- **9/9**: сохраняют идентификатор в person_source_value
- **omoponfhir**: формат `system^value` — мы используем аналогичный подход с `system|value`
- **Остальные**: просто Patient.id без system
