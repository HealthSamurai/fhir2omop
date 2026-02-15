# Encounter.period → OMOP VISIT_OCCURRENCE date fields

## Источник

FHIR `Encounter.period` — тип `Period`:
- `start` (dateTime) — начало визита
- `end` (dateTime) — конец визита

## Цель

OMOP VISIT_OCCURRENCE:
- `visit_start_date` (date, **required**) — дата начала
- `visit_start_datetime` (datetime) — дата/время начала
- `visit_end_date` (date, **required**) — дата окончания
- `visit_end_datetime` (datetime) — дата/время окончания

## Маппинг

| FHIR | OMOP | Примечания |
|---|---|---|
| `period.start` | `visit_start_date` | Извлечение YYYY-MM-DD |
| `period.start` | `visit_start_datetime` | Полное значение |
| `period.end` | `visit_end_date` | Извлечение YYYY-MM-DD |
| `period.end` | `visit_end_datetime` | Полное значение |

## Обработка отсутствующих данных

| Ситуация | Действие |
|---|---|
| period отсутствует | Запись **не создаётся** |
| period.start отсутствует | Запись **не создаётся** |
| period.end отсутствует | `visit_end_date` = `visit_start_date`, `visit_end_datetime` = null |

## Решение по отсутствующему end

`visit_end_date` — обязательное поле в OMOP. Если `period.end` отсутствует, используем `visit_start_date` как end_date (однодневный визит). `visit_end_datetime` остаётся null — не подставляем фиктивное время.
