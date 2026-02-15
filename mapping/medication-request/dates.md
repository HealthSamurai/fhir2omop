# MedicationRequest dates → OMOP DRUG_EXPOSURE date fields

## Source

FHIR `MedicationRequest`:
- `authoredOn` (dateTime) — prescription date
- `dispenseRequest.validityPeriod.end` (dateTime) — end of validity period

## Target

OMOP DRUG_EXPOSURE:
- `drug_exposure_start_date` (date, **required**) — start
- `drug_exposure_start_datetime` (datetime) — start
- `drug_exposure_end_date` (date) — end
- `drug_exposure_end_datetime` (datetime) — end

## Mapping

| FHIR | OMOP | Notes |
|---|---|---|
| `authoredOn` | `drug_exposure_start_date` | Extract YYYY-MM-DD |
| `authoredOn` | `drug_exposure_start_datetime` | Full value |
| `dispenseRequest.validityPeriod.end` | `drug_exposure_end_date` | Extract YYYY-MM-DD |
| `dispenseRequest.validityPeriod.end` | `drug_exposure_end_datetime` | Full value |
| absent end | null | Open-ended prescription |

## Validation

If `authoredOn` is absent — record **is not created**. drug_exposure_start_date is a required field.
