# Observation.status → OMOP filtering

## Source

FHIR `Observation.status` — code from value set `ObservationStatus`: registered, preliminary, final, amended, corrected, cancelled, entered-in-error, unknown.

## Target

Used for **filtering** — determines whether a record is created.

## Filtering

| Value | Action | Reason |
|---|---|---|
| `final` | Map | Final result |
| `amended` | Map | Amended — valid result |
| `corrected` | Map | Corrected — valid result |
| `preliminary` | Skip | Preliminary — may change |
| `registered` | Skip | Registered — no result yet |
| `cancelled` | Skip | Cancelled |
| `entered-in-error` | Skip | Erroneous record |
| `unknown` | Skip | Unknown status |

## Decision

We map only `final`, `amended`, `corrected`. Preliminary is skipped — analytics requires stable results. Amended and corrected are included — they are updated but valid values.
