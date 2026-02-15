# Patient.address → OMOP LOCATION

## Source

FHIR `Patient.address` — array of `Address`, may contain multiple addresses with different `use` (home, work, temp, old).

## Target

OMOP `LOCATION` — table of physical addresses. Linked to PERSON through `person.location_id` (FK → LOCATION).

OMOP semantics: **last known residential address** of the patient.

## Decision: address selection

A patient in FHIR may have multiple addresses. OMOP supports only one (`location_id`).

**Selection rule:**

1. Address with `use = "home"` (if multiple — last in the array, as most current)
2. If no `home` — first address in the array (`address[0]`)
3. If no addresses — `location_id = NULL`

Addresses with `use = "old"` are skipped when searching for a home address.

## Field mapping

| FHIR Address | OMOP LOCATION | Notes |
|---|---|---|
| `line[0]` | `address_1` | First address line |
| `line[1]` | `address_2` | Second line (if present) |
| `city` | `city` | |
| `state` | `state` | OMOP: varchar(2), for US — state code |
| `postalCode` | `zip` | OMOP: varchar(9) |
| `district` | `county` | |
| `country` | `country_source_value` | Textual country name |
| `country` | `country_concept_id` | Mapping to Geography domain (if possible), otherwise 0 |
| — | `location_source_value` | Full address as single string for tracing |

## OMOP limitations

- `state` — varchar(2). Fits US state codes (CA, NY). For other countries, the value may be truncated.
- `county` — varchar(20). Long district names are truncated.
- `address_1`, `address_2` — varchar(50). Long lines are truncated.

## Deduplication

Each patient gets their own LOCATION record (1:1 with PERSON). Deduplication of identical addresses is not performed — this simplifies ETL and matches the approach of most implementations.

## Implementation consensus

- 6+ out of 9 projects map address → LOCATION
- All use the "one LOCATION per patient" approach
- Selecting the home address is the most common strategy
