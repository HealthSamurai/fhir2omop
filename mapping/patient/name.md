# Patient.name → OMOP (нет стандартного поля)

## Источник

FHIR `Patient.name` — массив `HumanName`:
- `family` — фамилия
- `given` — массив имён
- `prefix` — префикс (Mr., Dr.)
- `suffix` — суффикс (Jr., III)
- `use` — назначение (official, usual, nickname, old, temp)
- `text` — полное имя одной строкой

## Цель

**Стандартный OMOP PERSON не имеет полей для имени пациента.**

## Анализ реализаций

| Проект | Подход | Хранение |
|---|---|---|
| omoponfhir-v54-r4 | Extension-таблица FPerson | `family_name`, `given1_name`, `given2_name`, `prefix_name`, `suffix_name` |
| mends-on-fhir | Hardcoded placeholder | `"MENDS NONAME"` |
| FHIROntopOMOP | Нестандартные колонки | `fname`, `name1`, `name2` |
| Все остальные (6/9) | **Не маппится** | Данные теряются |

## Решение

**Имя не маппится в стандартную схему OMOP.** Это осознанная потеря данных.

### Обоснование

1. OMOP CDM спроектирован для деидентифицированных данных — имя является PHI (Protected Health Information)
2. Добавление extension-таблиц (как FPerson) нарушает стандартную схему и усложняет совместимость с OHDSI-инструментами (ATLAS, Achilles)
3. Большинство реализаций (6/9) также не маппят имя

### Если имя необходимо

Для случаев, когда идентификация пациента нужна (clinical workflows, не research):
- Создать extension-таблицу `f_person` по образцу omoponfhir
- Или хранить в отдельной системе с FK на `person_id`
- Это выходит за рамки стандартного FHIR→OMOP маппинга

## Выбор имени (если потребуется extension)

Правило выбора из массива `Patient.name`:
1. `name` с `use = "official"`
2. `name` с `use = "usual"`
3. `name[0]` (первое в массиве)
