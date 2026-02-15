# Observation.component → OMOP expanded records

## Источник

FHIR `Observation.component` — массив компонентов (например, систолическое/диастолическое давление в одном Observation).

Каждый компонент содержит:
- `code` — CodeableConcept
- `value[x]` — значение
- `referenceRange` — референсный диапазон
- `interpretation` — интерпретация

## Цель

Каждый компонент создаёт **отдельную запись** в OMOP (measurement или observation).

## Маппинг

| Аспект | Поведение |
|---|---|
| Роутинг | Все компоненты наследуют category-based routing от родителя |
| code | Используется `component.code` (перезаписывает parent code) |
| value[x] | Используется `component.value[x]` |
| referenceRange | Используется `component.referenceRange` |
| ID | Суффикс `-comp-{index}` для уникальности в IdRegistry |
| person_id | Наследуется от родителя |
| visit_occurrence_id | Наследуется от родителя |
| provider_id | Наследуется от родителя |

## Примеры

### Кровяное давление (LOINC 85354-9)

Входной Observation с 2 компонентами → 2 записи measurement:
1. Систолическое (8480-6): value=120, unit=mmHg
2. Диастолическое (8462-4): value=80, unit=mmHg

### Опросник (survey)

Входной Observation с N компонентами → N записей observation.

## Обработка невалидных компонентов

Компоненты с пустым `code.coding` пропускаются. Остальные создают записи.

## Один компонент

Если только 1 компонент — возвращается одиночная запись (не массив).
