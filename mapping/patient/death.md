# Patient.deceased → OMOP DEATH

## Источник

FHIR Patient:
- `Patient.deceasedBoolean` — флаг: пациент умер (без даты)
- `Patient.deceasedDateTime` — дата/время смерти

Эти поля взаимоисключающие (choice type `deceased[x]`).

## Цель

OMOP DEATH:
- `person_id` (integer, **required**) — FK → PERSON
- `death_date` (date, **required**) — дата смерти
- `death_datetime` (datetime) — дата/время смерти
- `death_type_concept_id` (integer) — FK → CONCEPT, провенанс записи
- `cause_concept_id` (integer) — FK → CONCEPT, причина смерти
- `cause_source_value` (varchar(50)) — текст причины
- `cause_source_concept_id` (integer) — FK → CONCEPT

## Маппинг

### deceasedDateTime (есть дата)

| FHIR | OMOP DEATH | Примечание |
|---|---|---|
| `deceasedDateTime` | `death_date` | Извлечь дату из datetime |
| `deceasedDateTime` | `death_datetime` | Полное значение |
| — | `death_type_concept_id` | **32817** (EHR) |
| — | `cause_concept_id` | 0 (Patient не содержит причину смерти) |
| — | `cause_source_value` | NULL |

### deceasedBoolean = true (без даты)

`death_date` — обязательное поле (NOT NULL). Варианты:

1. **Не создавать запись DEATH** — теряем факт смерти, но не загрязняем данные
2. **Использовать дату из другого источника** — например, из Encounter или Condition с `deceasedBoolean`

Решение: **не создавать запись DEATH** при `deceasedBoolean = true` без даты. Факт смерти логировать как warning. Если дата смерти доступна из других ресурсов (Encounter, Observation), она будет записана при их обработке.

### deceasedBoolean = false или отсутствует

Запись DEATH не создаётся.

## death_type_concept_id

Указывает источник данных о смерти:

| Concept ID | Name | Когда использовать |
|---|---|---|
| **32817** | EHR | Данные из электронной медкарты (наш случай по умолчанию) |
| 32885 | Death Certificate | Данные из свидетельства о смерти |
| 32812 | Claim | Данные из страховых требований |

## Причина смерти

`Patient` не содержит причину смерти. Поля `cause_concept_id` и `cause_source_value` заполняются из других источников:
- `Condition` с `category = encounter-diagnosis` на момент смерти
- Специализированные extensions

При маппинге Patient → DEATH: `cause_concept_id = 0`, `cause_source_value = NULL`.

## Консенсус реализаций

- **3/9** проектов создают DEATH запись (omoponfhir, ETL-German, mends-on-fhir)
- **6/9** игнорируют `deceasedDateTime` — серьёзный пробел
- Мы создаём DEATH запись при наличии `deceasedDateTime`
