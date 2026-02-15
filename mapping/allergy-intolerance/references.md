# AllergyIntolerance references → OMOP OBSERVATION FK fields

## Источник

FHIR `AllergyIntolerance`:
- `patient` — Reference(Patient)
- `encounter` — Reference(Encounter)
- `recorder` — Reference(Practitioner|Patient)

## Цель

OMOP OBSERVATION:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER

## Маппинг

| FHIR Reference | OMOP Field | Примечания |
|---|---|---|
| `patient` | `person_id` | Через `ctx.ids.resolveRef()` |
| `encounter` | `visit_occurrence_id` | Через `ctx.ids.resolveRef()` |
| `recorder` | `provider_id` | Кто записал аллергию |

## Немаппированные ссылки

| FHIR Reference | Причина |
|---|---|
| `asserter` | OMOP имеет один provider_id; используем recorder |
