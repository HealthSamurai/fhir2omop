# Procedure.performed[x] → OMOP PROCEDURE_OCCURRENCE date fields

## Источник

FHIR `Procedure.performed[x]` — полиморфное поле:
- `performedDateTime` — точная дата/время
- `performedPeriod` — период с `start` и `end`
- Также возможны `performedString`, `performedAge`, `performedRange` (не маппятся)

## Цель

OMOP PROCEDURE_OCCURRENCE:
- `procedure_date` (date, **required**) — дата процедуры
- `procedure_datetime` (datetime) — дата/время процедуры
- `procedure_end_date` (date) — дата окончания
- `procedure_end_datetime` (datetime) — дата/время окончания

## Маппинг

| FHIR поле | OMOP поле |
|---|---|
| `performedDateTime` | `procedure_date` (дата), `procedure_datetime` (полное значение) |
| `performedPeriod.start` | `procedure_date`, `procedure_datetime` (если нет performedDateTime) |
| `performedPeriod.end` | `procedure_end_date`, `procedure_end_datetime` |

Приоритет: `performedDateTime` > `performedPeriod.start` для даты начала.

## Решение по отсутствующей дате

Если ни `performedDateTime`, ни `performedPeriod.start` не указаны — запись **не создаётся**. `procedure_date` — обязательное NOT NULL поле в OMOP.

## Консенсус реализаций

- **4/4**: маппят performedDateTime → procedure_date/datetime
- **3/4**: маппят performedPeriod.start → procedure_date, performedPeriod.end → procedure_end_date
- **4/4**: требуют наличия даты для создания записи
