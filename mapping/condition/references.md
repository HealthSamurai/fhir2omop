# Condition references → OMOP CONDITION_OCCURRENCE FK fields

## Source

FHIR `Condition`:
- `subject` — Reference(Patient)
- `encounter` — Reference(Encounter)
- `asserter` — Reference(Practitioner|Patient)
- `recorder` — Reference(Practitioner|Patient)

## Target

OMOP CONDITION_OCCURRENCE:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER
- `visit_detail_id` (integer) — FK → VISIT_DETAIL

## Mapping

| FHIR Reference | OMOP Field | Notes |
|---|---|---|
| `subject` | `person_id` | Via `ctx.ids.resolveRef()` |
| `encounter` | `visit_occurrence_id` | Via `ctx.ids.resolveRef()` |
| `asserter` | `provider_id` | Priority source for provider |
| `recorder` | `provider_id` | Fallback if asserter is absent |
| — | `visit_detail_id` | null (not mapped) |

## Decision on asserter vs recorder

OMOP has a single `provider_id` field. FHIR distinguishes:
- `asserter` — who asserted/diagnosed the condition
- `recorder` — who recorded it in the system

We use **asserter** as priority, **recorder** as fallback. Logic:
```
provider_id = ctx.ids.resolveRef(condition.asserter ?? condition.recorder)
```

## visit_detail_id

Not mapped. Would require more granular encounter data (sub-visits, departments).
