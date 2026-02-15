# Condition.abatement[x] → OMOP CONDITION_OCCURRENCE end date

## Source

FHIR `Condition.abatement[x]` — polymorphic field:
- `abatementDateTime` — date/time of resolution
- `abatementPeriod` — resolution period
- `abatementAge` — age at resolution
- `abatementRange` — age range
- `abatementString` — textual description

## Target

OMOP CONDITION_OCCURRENCE:
- `condition_end_date` (date) — end date
- `condition_end_datetime` (datetime) — end date/time
- `stop_reason` (varchar(20)) — reason for ending

## Mapping

| Source | condition_end_date | condition_end_datetime | stop_reason |
|---|---|---|---|
| `abatementDateTime` | Extract YYYY-MM-DD | Full value | null |
| `abatementPeriod.end` | Extract YYYY-MM-DD | Full value | null |
| `abatementString` | null | null | Text string |
| Nothing available | null | null | null |

## Unmapped abatement[x] types

| Type | Reason | Potential approach |
|---|---|---|
| `abatementAge` | Requires patient's birthDate | Compute when Patient context is available |
| `abatementRange` | Age range; imprecise date | Use midpoint |

## Decision on abatementString

`abatementString` is mapped to `stop_reason` (not to end_date). This preserves the textual description of the reason for disease resolution without attempting to extract a date from free text.
