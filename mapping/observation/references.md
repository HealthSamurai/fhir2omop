# Observation references → OMOP FK fields

## Source

FHIR `Observation`:
- `subject` — Reference(Patient)
- `encounter` — Reference(Encounter)
- `performer[]` — Reference(Practitioner|Organization)

## Target

OMOP MEASUREMENT / OBSERVATION:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER

## Mapping

| FHIR Reference | OMOP Field | Notes |
|---|---|---|
| `subject` | `person_id` | Via `ctx.ids.resolveRef()` |
| `encounter` | `visit_occurrence_id` | Via `ctx.ids.resolveRef()` |
| `performer[0]` | `provider_id` | First performer |

## Decision on performer

FHIR allows multiple performers. OMOP has a single `provider_id`. We take the first performer (`performer[0]`).

## Unmapped references

| FHIR Reference | Reason |
|---|---|
| `performer[1..n]` | OMOP has a single provider_id |
| `basedOn` | No direct equivalent |
| `partOf` | No direct equivalent |
| `specimen` | Could map to OMOP specimen table (not implemented) |
| `device` | No direct equivalent in measurement/observation |
| `hasMember` | Grouping — no direct equivalent |
| `derivedFrom` | No direct equivalent |
