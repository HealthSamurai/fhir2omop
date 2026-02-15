# AllergyIntolerance references → OMOP OBSERVATION FK fields

## Source

FHIR `AllergyIntolerance`:
- `patient` — Reference(Patient)
- `encounter` — Reference(Encounter)
- `recorder` — Reference(Practitioner|Patient)

## Target

OMOP OBSERVATION:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER

## Mapping

| FHIR Reference | OMOP Field | Notes |
|---|---|---|
| `patient` | `person_id` | Via `ctx.ids.resolveRef()` |
| `encounter` | `visit_occurrence_id` | Via `ctx.ids.resolveRef()` |
| `recorder` | `provider_id` | Who recorded the allergy |

## Unmapped references

| FHIR Reference | Reason |
|---|---|
| `asserter` | OMOP has a single provider_id; we use recorder |
