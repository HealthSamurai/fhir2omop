# Encounter.period → OMOP VISIT_OCCURRENCE date fields

## Source

FHIR `Encounter.period` — type `Period`:
- `start` (dateTime) — visit start
- `end` (dateTime) — visit end

## Target

OMOP VISIT_OCCURRENCE:
- `visit_start_date` (date, **required**) — start date
- `visit_start_datetime` (datetime) — start date/time
- `visit_end_date` (date, **required**) — end date
- `visit_end_datetime` (datetime) — end date/time

## Mapping

| FHIR | OMOP | Notes |
|---|---|---|
| `period.start` | `visit_start_date` | Extract YYYY-MM-DD |
| `period.start` | `visit_start_datetime` | Full value |
| `period.end` | `visit_end_date` | Extract YYYY-MM-DD |
| `period.end` | `visit_end_datetime` | Full value |

## Handling missing data

| Situation | Action |
|---|---|
| period absent | Record **not created** |
| period.start absent | Record **not created** |
| period.end absent | `visit_end_date` = `visit_start_date`, `visit_end_datetime` = null |

## Decision on missing end

`visit_end_date` is a required field in OMOP. If `period.end` is absent, we use `visit_start_date` as end_date (single-day visit). `visit_end_datetime` remains null — we do not substitute a fictitious time.
