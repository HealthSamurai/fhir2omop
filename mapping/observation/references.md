# Observation references → OMOP FK fields

## Источник

FHIR `Observation`:
- `subject` — Reference(Patient)
- `encounter` — Reference(Encounter)
- `performer[]` — Reference(Practitioner|Organization)

## Цель

OMOP MEASUREMENT / OBSERVATION:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER

## Маппинг

| FHIR Reference | OMOP Field | Примечания |
|---|---|---|
| `subject` | `person_id` | Через `ctx.ids.resolveRef()` |
| `encounter` | `visit_occurrence_id` | Через `ctx.ids.resolveRef()` |
| `performer[0]` | `provider_id` | Первый исполнитель |

## Решение по performer

FHIR допускает множество performers. OMOP имеет один `provider_id`. Берём первого performer (`performer[0]`).

## Немаппированные ссылки

| FHIR Reference | Причина |
|---|---|
| `performer[1..n]` | OMOP имеет один provider_id |
| `basedOn` | Нет прямого аналога |
| `partOf` | Нет прямого аналога |
| `specimen` | Можно маппить в OMOP specimen таблицу (не реализовано) |
| `device` | Нет прямого аналога в measurement/observation |
| `hasMember` | Группировка — нет прямого аналога |
| `derivedFrom` | Нет прямого аналога |
