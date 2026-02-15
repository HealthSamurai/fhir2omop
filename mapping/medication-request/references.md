# MedicationRequest references → OMOP DRUG_EXPOSURE FK fields

## Source

FHIR `MedicationRequest`:
- `subject` — Reference(Patient)
- `encounter` — Reference(Encounter)
- `requester` — Reference(Practitioner|Organization)

## Target

OMOP DRUG_EXPOSURE:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER

## Mapping

| FHIR Reference | OMOP Field | Notes |
|---|---|---|
| `subject` | `person_id` | Via `ctx.ids.resolveRef()` |
| `encounter` | `visit_occurrence_id` | Via `ctx.ids.resolveRef()` |
| `requester` | `provider_id` | Prescribing physician |
