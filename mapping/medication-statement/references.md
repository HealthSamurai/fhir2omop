# MedicationStatement references → OMOP DRUG_EXPOSURE FK fields

## Source

FHIR `MedicationStatement`:
- `subject` — Reference(Patient)
- `context` — Reference(Encounter)
- `informationSource` — Reference(Practitioner|Patient|RelatedPerson)

## Target

OMOP DRUG_EXPOSURE:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER

## Mapping

| FHIR Reference | OMOP Field | Notes |
|---|---|---|
| `subject` | `person_id` | Via `ctx.ids.resolveRef()` |
| `context` | `visit_occurrence_id` | Encounter in which it was recorded |
| `informationSource` | `provider_id` | Information source |

## Differences from MedicationRequest

- `context` instead of `encounter` (FHIR R4 naming)
- `informationSource` instead of `requester` — source may be patient or relative
