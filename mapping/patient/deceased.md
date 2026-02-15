# Patient.deceased[x] → OMOP DEATH

## Source

FHIR `Patient` has two mutually exclusive fields:
- `deceasedBoolean` — fact of death without date
- `deceasedDateTime` — date/time of death

## Target

OMOP `DEATH`:
- `person_id` (integer, **required**) — FK → PERSON
- `death_date` (date, **required**) — date of death
- `death_datetime` (datetime) — date/time of death
- `death_type_concept_id` (integer, **required**) — data source
- `cause_concept_id` (integer) — cause of death
- `cause_source_value` (varchar(50)) — original cause code
- `cause_source_concept_id` (integer) — source concept of cause

## Mapping

| FHIR | OMOP DEATH | Notes |
|---|---|---|
| `deceasedDateTime` | `death_date` | Date extraction from dateTime |
| `deceasedDateTime` | `death_datetime` | Full value |
| — | `death_type_concept_id` | **32817** (EHR) |
| — | `cause_concept_id` | 0 (cause not available from Patient) |
| — | `cause_source_value` | NULL |

## Rules for creating DEATH record

| Situation | DEATH created? | Reason |
|---|---|---|
| `deceasedDateTime` present | **Yes** | Date available for death_date |
| `deceasedBoolean = true`, no dateTime | **No** | death_date is required, no date available |
| `deceasedBoolean = false` | **No** | Patient is alive |
| Neither deceasedBoolean nor deceasedDateTime | **No** | No death data |

## Decision on deceasedBoolean without date

`death_date` is a required field (NOT NULL) in OMOP DEATH. Without `deceasedDateTime`, the date cannot be populated. The DEATH record **is not created**. The event is logged as a warning.

The alternative (substituting a fictitious date) was rejected — it would distort mortality analytics.

## death_type_concept_id

We use **32817** (EHR) — data obtained from the electronic health record.

## Cause of death

`Patient` does not contain cause of death. Mapping the cause requires a separate `Observation` resource with a cause of death code (LOINC 69453-9 "Cause of death"). This is outside the scope of Patient mapping.

## Implementation consensus

- **3/9** (omoponfhir, ETL-German, mends): create DEATH from deceasedDateTime
- **6/9**: do not create DEATH record — loss of death data
- All who create DEATH use only deceasedDateTime (not deceasedBoolean)
