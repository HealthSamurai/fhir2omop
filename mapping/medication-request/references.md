# MedicationRequest references → OMOP DRUG_EXPOSURE FK fields

## Источник

FHIR `MedicationRequest`:
- `subject` — Reference(Patient)
- `encounter` — Reference(Encounter)
- `requester` — Reference(Practitioner|Organization)

## Цель

OMOP DRUG_EXPOSURE:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER

## Маппинг

| FHIR Reference | OMOP Field | Примечания |
|---|---|---|
| `subject` | `person_id` | Через `ctx.ids.resolveRef()` |
| `encounter` | `visit_occurrence_id` | Через `ctx.ids.resolveRef()` |
| `requester` | `provider_id` | Назначающий врач |
