# Encounter.status → OMOP filtering

## Source

FHIR `Encounter.status` — code from value set `EncounterStatus`: planned, arrived, triaged, in-progress, onleave, finished, cancelled, entered-in-error, unknown.

## Target

Used for **filtering** — determines whether a VISIT_OCCURRENCE record is created.

## Filtering

| Value | Action | Reason |
|---|---|---|
| `finished` | Map | Completed visit |
| `in-progress` | Map | Current visit — valid data |
| `planned` | Skip | Planned — has not occurred yet |
| `arrived` | Skip | Arrived — visit has not started |
| `triaged` | Skip | Triage — visit has not started |
| `onleave` | Skip | On leave — no stable data |
| `cancelled` | Skip | Cancelled |
| `entered-in-error` | Skip | Erroneous record |
| `unknown` | Skip | Unknown status |

## Decision

We map only `finished` and `in-progress`. Planned/cancelled/entered-in-error do not represent real visits. in-progress is included to support current hospitalizations.
