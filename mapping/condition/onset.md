# Condition.onset[x] → OMOP CONDITION_OCCURRENCE start date

## Source

FHIR `Condition.onset[x]` — polymorphic field:
- `onsetDateTime` — date/time of onset
- `onsetPeriod` — onset period
- `onsetAge` — age at onset
- `onsetRange` — age range
- `onsetString` — textual description

Fallback: `Condition.recordedDate` — date recorded in the system.

## Target

OMOP CONDITION_OCCURRENCE:
- `condition_start_date` (date, **required**) — start date
- `condition_start_datetime` (datetime) — start date/time

## Mapping (fallback chain)

| Priority | Source | condition_start_date | condition_start_datetime |
|---|---|---|---|
| 1 | `onsetDateTime` | Extract YYYY-MM-DD | Full value |
| 2 | `onsetPeriod.start` | Extract YYYY-MM-DD | Full value |
| 3 | `recordedDate` | Extract YYYY-MM-DD | Full value |
| — | Nothing available | **Record not created** | — |

## Unmapped onset[x] types

| Type | Reason | Potential approach |
|---|---|---|
| `onsetAge` | Requires patient's birthDate | Compute when Patient context is available |
| `onsetRange` | Age range; imprecise date | Use midpoint of range |
| `onsetString` | Free text; no reliable date | NLP extraction |

## Decision on recordedDate

`recordedDate` is the last fallback. This is the recording date, not the disease onset date, but it is better to have an approximate date than to lose the record entirely.

## Implementation consensus

- **ETL-German-FHIR-Core**: most complete — supports the full fallback chain
- **omoponfhir**: onsetDateTime + recordedDate
- **Most others**: only onsetDateTime
