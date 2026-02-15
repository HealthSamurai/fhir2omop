# Condition references → OMOP CONDITION_OCCURRENCE FK fields

## Источник

FHIR `Condition`:
- `subject` — Reference(Patient)
- `encounter` — Reference(Encounter)
- `asserter` — Reference(Practitioner|Patient)
- `recorder` — Reference(Practitioner|Patient)

## Цель

OMOP CONDITION_OCCURRENCE:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER
- `visit_detail_id` (integer) — FK → VISIT_DETAIL

## Маппинг

| FHIR Reference | OMOP Field | Примечания |
|---|---|---|
| `subject` | `person_id` | Через `ctx.ids.resolveRef()` |
| `encounter` | `visit_occurrence_id` | Через `ctx.ids.resolveRef()` |
| `asserter` | `provider_id` | Приоритетный источник провайдера |
| `recorder` | `provider_id` | Fallback если asserter отсутствует |
| — | `visit_detail_id` | null (не маппируется) |

## Решение по asserter vs recorder

OMOP имеет единственное поле `provider_id`. FHIR различает:
- `asserter` — кто утвердил/диагностировал заболевание
- `recorder` — кто записал в систему

Используем **asserter** как приоритетный, **recorder** как fallback. Логика:
```
provider_id = ctx.ids.resolveRef(condition.asserter ?? condition.recorder)
```

## visit_detail_id

Не маппируется. Потребовал бы более гранулярные данные об encounter (под-визиты, отделения).
