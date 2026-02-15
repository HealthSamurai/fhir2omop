# MedicationRequest.status → OMOP filtering

## Источник

FHIR `MedicationRequest.status` — code: active, on-hold, cancelled, completed, entered-in-error, stopped, draft, unknown.

## Цель

Используется для **фильтрации** — определяет создавать ли запись DRUG_EXPOSURE.

## Фильтрация

| Значение | Действие | Причина |
|---|---|---|
| `active` | Map | Активный рецепт |
| `completed` | Map | Завершённый рецепт |
| `on-hold` | Skip | Приостановлен |
| `cancelled` | Skip | Отменён |
| `entered-in-error` | Skip | Ошибочная запись |
| `stopped` | Skip | Остановлен |
| `draft` | Skip | Черновик — не назначен |
| `unknown` | Skip | Неизвестный статус |

## Type Concept

| FHIR Resource | drug_type_concept_id | OMOP Concept |
|---|---|---|
| MedicationRequest | **38000177** | Prescription written |
