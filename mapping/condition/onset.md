# Condition.onset[x] → OMOP CONDITION_OCCURRENCE start date

## Источник

FHIR `Condition.onset[x]` — полиморфное поле:
- `onsetDateTime` — дата/время начала
- `onsetPeriod` — период начала
- `onsetAge` — возраст начала
- `onsetRange` — диапазон возраста
- `onsetString` — текстовое описание

Fallback: `Condition.recordedDate` — дата записи в систему.

## Цель

OMOP CONDITION_OCCURRENCE:
- `condition_start_date` (date, **required**) — дата начала
- `condition_start_datetime` (datetime) — дата/время начала

## Маппинг (fallback chain)

| Приоритет | Источник | condition_start_date | condition_start_datetime |
|---|---|---|---|
| 1 | `onsetDateTime` | Извлечение YYYY-MM-DD | Полное значение |
| 2 | `onsetPeriod.start` | Извлечение YYYY-MM-DD | Полное значение |
| 3 | `recordedDate` | Извлечение YYYY-MM-DD | Полное значение |
| — | Ничего нет | **Запись не создаётся** | — |

## Немаппированные типы onset[x]

| Тип | Причина | Потенциальный подход |
|---|---|---|
| `onsetAge` | Требует birthDate пациента | Вычислить при наличии контекста Patient |
| `onsetRange` | Диапазон возраста; неточная дата | Использовать среднюю точку диапазона |
| `onsetString` | Свободный текст; нет надёжной даты | NLP extraction |

## Решение по recordedDate

`recordedDate` — последний fallback. Это дата записи, не дата начала заболевания, но лучше иметь приблизительную дату чем потерять запись целиком.

## Консенсус реализаций

- **ETL-German-FHIR-Core**: наиболее полный — поддерживает весь fallback chain
- **omoponfhir**: onsetDateTime + recordedDate
- **Большинство**: только onsetDateTime
