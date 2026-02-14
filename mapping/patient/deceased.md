# Patient.deceased[x] → OMOP DEATH

## Источник

FHIR `Patient` имеет два взаимоисключающих поля:
- `deceasedBoolean` — факт смерти без даты
- `deceasedDateTime` — дата/время смерти

## Цель

OMOP `DEATH`:
- `person_id` (integer, **required**) — FK → PERSON
- `death_date` (date, **required**) — дата смерти
- `death_datetime` (datetime) — дата/время смерти
- `death_type_concept_id` (integer, **required**) — источник данных
- `cause_concept_id` (integer) — причина смерти
- `cause_source_value` (varchar(50)) — оригинальный код причины
- `cause_source_concept_id` (integer) — source concept причины

## Маппинг

| FHIR | OMOP DEATH | Примечания |
|---|---|---|
| `deceasedDateTime` | `death_date` | Извлечение даты из dateTime |
| `deceasedDateTime` | `death_datetime` | Полное значение |
| — | `death_type_concept_id` | **32817** (EHR) |
| — | `cause_concept_id` | 0 (причина из Patient недоступна) |
| — | `cause_source_value` | NULL |

## Правила создания записи DEATH

| Ситуация | DEATH создаётся? | Причина |
|---|---|---|
| `deceasedDateTime` есть | **Да** | Есть дата для death_date |
| `deceasedBoolean = true`, нет dateTime | **Нет** | death_date — обязательное поле, нет даты |
| `deceasedBoolean = false` | **Нет** | Пациент жив |
| Ни deceasedBoolean, ни deceasedDateTime | **Нет** | Нет данных о смерти |

## Решение по deceasedBoolean без даты

`death_date` — обязательное поле (NOT NULL) в OMOP DEATH. Без `deceasedDateTime` нельзя заполнить дату. Запись DEATH **не создаётся**. Событие логируется как warning.

Альтернатива (подстановка фиктивной даты) отвергнута — это исказит аналитику смертности.

## death_type_concept_id

Используем **32817** (EHR) — данные получены из электронной медицинской карты.

## Причина смерти

`Patient` не содержит причину смерти. Для маппинга причины нужен отдельный ресурс `Observation` с кодом причины смерти (LOINC 69453-9 "Cause of death"). Это выходит за рамки маппинга Patient.

## Консенсус реализаций

- **3/9** (omoponfhir, ETL-German, mends): создают DEATH из deceasedDateTime
- **6/9**: не создают DEATH запись — потеря данных о смерти
- Все, кто создают DEATH, используют только deceasedDateTime (не deceasedBoolean)
