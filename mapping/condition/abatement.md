# Condition.abatement[x] → OMOP CONDITION_OCCURRENCE end date

## Источник

FHIR `Condition.abatement[x]` — полиморфное поле:
- `abatementDateTime` — дата/время окончания
- `abatementPeriod` — период окончания
- `abatementAge` — возраст окончания
- `abatementRange` — диапазон возраста
- `abatementString` — текстовое описание

## Цель

OMOP CONDITION_OCCURRENCE:
- `condition_end_date` (date) — дата окончания
- `condition_end_datetime` (datetime) — дата/время окончания
- `stop_reason` (varchar(20)) — причина окончания

## Маппинг

| Источник | condition_end_date | condition_end_datetime | stop_reason |
|---|---|---|---|
| `abatementDateTime` | Извлечение YYYY-MM-DD | Полное значение | null |
| `abatementPeriod.end` | Извлечение YYYY-MM-DD | Полное значение | null |
| `abatementString` | null | null | Текст строки |
| Ничего нет | null | null | null |

## Немаппированные типы abatement[x]

| Тип | Причина | Потенциальный подход |
|---|---|---|
| `abatementAge` | Требует birthDate пациента | Вычислить при наличии контекста Patient |
| `abatementRange` | Диапазон возраста; неточная дата | Использовать среднюю точку |

## Решение по abatementString

`abatementString` маппится в `stop_reason` (а не в end_date). Это сохраняет текстовое описание причины окончания заболевания без попытки извлечь дату из свободного текста.
