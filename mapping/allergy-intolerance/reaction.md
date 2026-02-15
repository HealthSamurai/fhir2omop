# AllergyIntolerance.reaction → OMOP OBSERVATION value_as_string

## Источник

FHIR `AllergyIntolerance.reaction[]` — массив реакций:
- `reaction[].manifestation[]` — CodeableConcept с проявлениями (Hives, Nausea, etc.)

## Цель

OMOP OBSERVATION:
- `value_as_string` (varchar(60)) — текстовое описание реакций

## Маппинг

Все проявления из всех реакций собираются в одну строку, разделённую `"; "`.

Для каждого manifestation:
1. `manifestation.coding[0].display` — предпочтительно
2. `manifestation.text` — fallback

## Примеры

| FHIR reactions | value_as_string |
|---|---|
| 1 реакция, 1 проявление: Hives | `"Hives"` |
| 1 реакция, 2 проявления: Hives, SOB | `"Hives; Shortness of breath"` |
| 2 реакции: Hives + Nausea | `"Hives; Nausea"` |
| Нет реакций | null |

## Дополнительные маппинги

| FHIR | OMOP | Примечания |
|---|---|---|
| `type` (allergy/intolerance) | `qualifier_source_value` | Тип аллергической реакции |
| `criticality` (low/high/unable-to-assess) | `value_source_value` | Критичность |

## Немаппированные поля реакций

| FHIR | Причина |
|---|---|
| `reaction.substance` | Нет отдельного поля; код аллергена в основном `code` |
| `reaction.severity` | Нет прямого аналога |
| `reaction.exposureRoute` | Нет прямого аналога |
| `reaction.onset` | Нет прямого аналога (дата реакции) |
| `reaction.note` | Нет колонки |
