# Patient → OMOP: Полная спецификация маппинга

## Обзор

FHIR Patient маппится в три OMOP-таблицы:

| OMOP таблица | Что маппится | Обязательность |
|---|---|---|
| **PERSON** | Демография, идентификаторы, ссылки | Всегда создаётся |
| **LOCATION** | Адрес пациента | Если есть address |
| **DEATH** | Факт и дата смерти | Если есть deceasedDateTime |

## Сводная таблица маппинга

### PERSON

| FHIR Patient | OMOP PERSON | Спецификация | Статус |
|---|---|---|---|
| `gender` | `gender_concept_id`, `gender_source_value` | [gender.md](gender.md) | Консенсус 9/9 (male/female) |
| `birthDate` | `year_of_birth`, `month_of_birth`, `day_of_birth`, `birth_datetime` | [birthdate.md](birthdate.md) | Консенсус 9/9 |
| `id` / `identifier` | `person_source_value` | [identifier.md](identifier.md) | Консенсус 9/9 (формат расходится) |
| `address` | → LOCATION → `location_id` | [address-location.md](address-location.md) | Консенсус 6/9 |
| US Core Race ext | `race_concept_id`, `race_source_value` | [race-ethnicity.md](race-ethnicity.md) | 5/9 (US-only) |
| US Core Ethnicity ext | `ethnicity_concept_id`, `ethnicity_source_value` | [race-ethnicity.md](race-ethnicity.md) | 5/9 (US-only) |
| `generalPractitioner` | `provider_id` | [references.md](references.md) | 4/9 |
| `managingOrganization` | `care_site_id` | [references.md](references.md) | 2/9 |
| `name` | — (нет поля в OMOP) | [name.md](name.md) | Потеря данных |
| `deceased[x]` | → DEATH таблица | [death.md](death.md) | 3/9 |

### Константы и дефолты

| OMOP поле | Значение | Примечание |
|---|---|---|
| `person_id` | Сгенерированный integer | Mapping table: FHIR id → OMOP integer |
| `gender_source_concept_id` | 0 | |
| `race_source_concept_id` | 0 | |
| `ethnicity_source_concept_id` | 0 | |
| `person_source_concept_id` | 0 | |

## Условия создания записи PERSON

Запись PERSON **не создаётся** если:
- `Patient.birthDate` отсутствует (`year_of_birth` — NOT NULL в OMOP)

Запись PERSON создаётся с пустыми FK если:
- Нет адреса → `location_id = NULL`
- Нет race/ethnicity extensions → `race_concept_id = 0`, `ethnicity_concept_id = 0`
- Нет generalPractitioner → `provider_id = NULL`
- Нет managingOrganization → `care_site_id = NULL`

## Порядок загрузки

```
1. Location       → OMOP LOCATION
2. Organization   → OMOP CARE_SITE
3. Practitioner   → OMOP PROVIDER
4. Patient        → OMOP PERSON  (FK → LOCATION, CARE_SITE, PROVIDER)
                  → OMOP LOCATION (из Patient.address)
                  → OMOP DEATH   (из Patient.deceased[x])
```

## Поля FHIR Patient, которые не маппятся

| FHIR поле | Причина |
|---|---|
| `name` | Нет полей в стандартном OMOP (PHI) |
| `telecom` | Нет полей в стандартном OMOP |
| `maritalStatus` | Нет поля в стандартном OMOP |
| `multipleBirth[x]` | Нет поля в OMOP |
| `photo` | Нет поля в OMOP |
| `contact` | Нет таблицы контактных лиц в OMOP |
| `communication` | Нет поля в OMOP |
| `link` | Дедупликация/связывание — отдельный процесс |
| `active` | OMOP не отслеживает статус записи |

## Ключевые дизайн-решения

1. **gender other/unknown** → 8521/8551 (не 0). Следуем omoponfhir. [gender.md](gender.md)
2. **identifier формат** → `system|value` с приоритизацией SSN > MRN > первый. [identifier.md](identifier.md)
3. **Адрес** → берём `use = "home"`, fallback на первый. [address-location.md](address-location.md)
4. **birthDate отсутствует** → PERSON не создаётся. [birthdate.md](birthdate.md)
5. **deceasedBoolean без даты** → DEATH не создаётся. [death.md](death.md)
6. **Имя** → не маппится (стандартный OMOP, PHI). [name.md](name.md)
7. **Race/Ethnicity отсутствует** → concept_id = 0. [race-ethnicity.md](race-ethnicity.md)

## Базовая реализация

Ориентируемся на паттерны **omoponfhir-v54-r4** как наиболее полную и корректную реализацию из 9 изученных проектов. Подробный анализ: [spec/patient.md](../../spec/patient.md)
