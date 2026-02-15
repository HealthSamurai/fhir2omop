# Condition.clinicalStatus / verificationStatus → OMOP filtering and status fields

## Источник

FHIR `Condition.clinicalStatus` — CodeableConcept из `condition-clinical`:
- active, recurrence, relapse, inactive, remission, resolved

FHIR `Condition.verificationStatus` — CodeableConcept из `condition-ver-status`:
- confirmed, unconfirmed, provisional, differential, entered-in-error, refuted

## Цель

OMOP CONDITION_OCCURRENCE:
- `condition_status_concept_id` (integer) — состояние
- `condition_status_source_value` (varchar(50)) — оригинальный код

Также используется для **фильтрации** — определяет создавать ли запись.

## Фильтрация

### Clinical Status

| Значение | Действие | Причина |
|---|---|---|
| `active` | Map | Текущее заболевание |
| `recurrence` | Map | Повтор — активное состояние |
| `relapse` | Map | Рецидив — активное состояние |
| `inactive` | Skip | Неактивное — историческое |
| `remission` | Skip | В ремиссии |
| `resolved` | Skip | Разрешилось |
| отсутствует | Map | clinicalStatus опционален в FHIR |

### Verification Status

| Значение | Действие | Причина |
|---|---|---|
| `confirmed` | Map | Подтверждённый диагноз |
| `unconfirmed` | Map | Неподтверждённый — всё равно маппим |
| `provisional` | Map | Предварительный |
| `differential` | Map | Дифференциальный |
| `entered-in-error` | Skip | Ошибочная запись |
| `refuted` | Skip | Опровергнутый |
| отсутствует | Map | verificationStatus опционален |

## Status Concept Mapping

| FHIR clinicalStatus | condition_status_concept_id | OMOP Concept |
|---|---|---|
| `active` | **32902** | Active condition |
| `recurrence` | **32902** | Active condition |
| `relapse` | **32902** | Active condition |
| отсутствует | **0** | Unknown |

- `condition_status_source_value` — оригинальный код clinicalStatus (`"active"`, `"recurrence"` и т.д.). Если отсутствует — NULL.

## Type Concept Mapping (category)

| FHIR category | condition_type_concept_id | OMOP Concept |
|---|---|---|
| `problem-list-item` | **32840** | Problem list from EHR |
| `encounter-diagnosis` | **32817** | EHR encounter record |
| отсутствует/другое | **32817** | EHR (default) |
