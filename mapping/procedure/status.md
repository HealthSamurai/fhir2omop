# Procedure.status → фильтр конвертации

## Источник

FHIR `Procedure.status` — обязательное поле, код из `EventStatus`: `preparation`, `in-progress`, `not-done`, `on-hold`, `stopped`, `completed`, `entered-in-error`, `unknown`.

## Цель

OMOP `PROCEDURE_OCCURRENCE` — не имеет прямого поля статуса. Таблица подразумевает, что запись — это выполненная процедура.

## Маппинг

| FHIR status | Действие |
|---|---|
| `completed` | **конвертируется** |
| `in-progress` | пропускается |
| `preparation` | пропускается |
| `not-done` | пропускается |
| `on-hold` | пропускается |
| `stopped` | пропускается |
| `entered-in-error` | пропускается |
| `unknown` | пропускается |

## Решение по фильтрации

Только `completed` процедуры конвертируются. OMOP procedure_occurrence предполагает факт выполненной процедуры. Незавершённые, отменённые или ошибочные записи не должны попадать в аналитику.

## Консенсус реализаций

- **4/4** (HL7 IG, FhirToCdm, ETL-German, omoponfhir): фильтруют по статусу, пропускают `entered-in-error`
- **3/4** (HL7 IG, ETL-German, FhirToCdm): принимают только `completed`
- **1/4** (omoponfhir): не фильтрует явно по статусу, но маппит всё в procedure_occurrence
