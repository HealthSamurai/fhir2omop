# MedicationStatement.effective[x] → OMOP DRUG_EXPOSURE date fields

## Source

FHIR `MedicationStatement.effective[x]` — polymorphic field:
- `effectiveDateTime` — exact date/time
- `effectivePeriod` — period (start/end)

## Target

OMOP DRUG_EXPOSURE:
- `drug_exposure_start_date` (date, **required**) — start
- `drug_exposure_start_datetime` (datetime) — start
- `drug_exposure_end_date` (date) — end
- `drug_exposure_end_datetime` (datetime) — end

## Mapping

| FHIR | OMOP | Notes |
|---|---|---|
| `effectiveDateTime` | `drug_exposure_start_date` | Extract YYYY-MM-DD |
| `effectiveDateTime` | `drug_exposure_start_datetime` | Full value |
| `effectivePeriod.start` | `drug_exposure_start_date` | Fallback if no dateTime |
| `effectivePeriod.start` | `drug_exposure_start_datetime` | Full value |
| `effectivePeriod.end` | `drug_exposure_end_date` | Extract YYYY-MM-DD |
| `effectivePeriod.end` | `drug_exposure_end_datetime` | Full value |

## Fallback chain

1. `effectiveDateTime` → start_date
2. `effectivePeriod.start` → start_date (if no dateTime)
3. Nothing → record **is not created**

## Validation

If neither effectiveDateTime nor effectivePeriod.start is present — record is not created.
