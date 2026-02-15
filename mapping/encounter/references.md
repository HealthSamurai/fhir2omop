# Encounter references → OMOP VISIT_OCCURRENCE FK fields

## Source

FHIR `Encounter`:
- `subject` — Reference(Patient)
- `participant[].individual` — Reference(Practitioner)
- `serviceProvider` — Reference(Organization)

## Target

OMOP VISIT_OCCURRENCE:
- `person_id` (integer, **required**) — FK → PERSON
- `provider_id` (integer) — FK → PROVIDER
- `care_site_id` (integer) — FK → CARE_SITE

## Mapping

| FHIR Reference | OMOP Field | Notes |
|---|---|---|
| `subject` | `person_id` | Via `ctx.ids.resolveRef()` |
| `participant[0].individual` | `provider_id` | First visit participant |
| `serviceProvider` | `care_site_id` | Service provider organization |

## Decision on participant

FHIR Encounter can have multiple participants. OMOP VISIT_OCCURRENCE has a single `provider_id`. We take the first participant (`participant[0].individual`).

## Unmapped references

| FHIR Reference | Reason |
|---|---|
| `participant[1..n]` | OMOP has a single provider_id |
| `location` | Not mapped to visit_occurrence (separate CARE_SITE table) |
| `partOf` | Not mapped (nested encounters) |
| `reasonReference` | Not mapped (reason for visit) |
