# Patient.birthDate → OMOP PERSON birth fields

## Source

FHIR `Patient.birthDate` — type `date`. Can be a full date (`1990-03-15`), partial (`1990-03`, `1990`), or absent.

## Target

OMOP PERSON:
- `year_of_birth` (integer, **required**) — year of birth
- `month_of_birth` (integer) — month of birth
- `day_of_birth` (integer) — day of birth
- `birth_datetime` (datetime) — full birth date/time

## Mapping

| FHIR birthDate | year_of_birth | month_of_birth | day_of_birth | birth_datetime |
|---|---|---|---|---|
| `"1990-03-15"` | 1990 | 3 | 15 | 1990-03-15T00:00:00 |
| `"1990-03"` | 1990 | 3 | NULL | 1990-03-01T00:00:00 |
| `"1990"` | 1990 | NULL | NULL | 1990-01-01T00:00:00 |
| absent | **record not created** | — | — | — |

## Decision on missing birthDate

`year_of_birth` is a required field (NOT NULL) in OMOP PERSON. If `Patient.birthDate` is absent, the PERSON record **is not created**. The event is logged as a warning to track data loss.

The alternative (a default value like 1900) was rejected — it pollutes data and can distort analytics.

## birth_datetime

For partial dates, padding is used: missing month → 01, missing day → 01, time → 00:00:00.

## Implementation consensus

- **9/9**: parse birthDate into year/month/day
- All use the same date component parsing logic
