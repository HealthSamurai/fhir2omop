# MedicationStatement references → OMOP DRUG_EXPOSURE FK fields

## Источник

FHIR `MedicationStatement`:
- `subject` — Reference(Patient)
- `context` — Reference(Encounter)
- `informationSource` — Reference(Practitioner|Patient|RelatedPerson)

## Цель

OMOP DRUG_EXPOSURE:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER

## Маппинг

| FHIR Reference | OMOP Field | Примечания |
|---|---|---|
| `subject` | `person_id` | Через `ctx.ids.resolveRef()` |
| `context` | `visit_occurrence_id` | Encounter в контексте которого записан |
| `informationSource` | `provider_id` | Источник информации |

## Отличия от MedicationRequest

- `context` вместо `encounter` (FHIR R4 naming)
- `informationSource` вместо `requester` — источник может быть пациент или родственник
