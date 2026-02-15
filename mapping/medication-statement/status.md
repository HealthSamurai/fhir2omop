# MedicationStatement.status → OMOP filtering

## Источник

FHIR `MedicationStatement.status` — code: active, completed, entered-in-error, intended, stopped, not-taken, on-hold, unknown.

## Цель

Используется для **фильтрации**.

## Фильтрация

| Значение | Действие | Причина |
|---|---|---|
| `active` | Map | Текущий приём |
| `completed` | Map | Завершённый приём |
| `entered-in-error` | Skip | Ошибочная запись |
| `intended` | Skip | Планируемый — ещё не начат |
| `stopped` | Skip | Остановлен |
| `not-taken` | Skip | Не принимался |
| `on-hold` | Skip | Приостановлен |
| `unknown` | Skip | Неизвестный статус |

## Type Concept

| FHIR Resource | drug_type_concept_id | OMOP Concept |
|---|---|---|
| MedicationStatement | **44787730** | Patient Self-Reported Medication |
