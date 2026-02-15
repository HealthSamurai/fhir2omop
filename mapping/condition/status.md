# Condition.clinicalStatus / verificationStatus → OMOP filtering and status fields

## Source

FHIR `Condition.clinicalStatus` — CodeableConcept from `condition-clinical`:
- active, recurrence, relapse, inactive, remission, resolved

FHIR `Condition.verificationStatus` — CodeableConcept from `condition-ver-status`:
- confirmed, unconfirmed, provisional, differential, entered-in-error, refuted

## Target

OMOP CONDITION_OCCURRENCE:
- `condition_status_concept_id` (integer) — status
- `condition_status_source_value` (varchar(50)) — original code

Also used for **filtering** — determines whether a record is created.

## Filtering

### Clinical Status

| Value | Action | Reason |
|---|---|---|
| `active` | Map | Current disease |
| `recurrence` | Map | Recurrence — active state |
| `relapse` | Map | Relapse — active state |
| `inactive` | Skip | Inactive — historical |
| `remission` | Skip | In remission |
| `resolved` | Skip | Resolved |
| absent | Map | clinicalStatus is optional in FHIR |

### Verification Status

| Value | Action | Reason |
|---|---|---|
| `confirmed` | Map | Confirmed diagnosis |
| `unconfirmed` | Map | Unconfirmed — still mapped |
| `provisional` | Map | Provisional |
| `differential` | Map | Differential |
| `entered-in-error` | Skip | Erroneous record |
| `refuted` | Skip | Refuted |
| absent | Map | verificationStatus is optional |

## Status Concept Mapping

| FHIR clinicalStatus | condition_status_concept_id | OMOP Concept |
|---|---|---|
| `active` | **32902** | Active condition |
| `recurrence` | **32902** | Active condition |
| `relapse` | **32902** | Active condition |
| absent | **0** | Unknown |

- `condition_status_source_value` — original clinicalStatus code (`"active"`, `"recurrence"`, etc.). If absent — NULL.

## Type Concept Mapping (category)

| FHIR category | condition_type_concept_id | OMOP Concept |
|---|---|---|
| `problem-list-item` | **32840** | Problem list from EHR |
| `encounter-diagnosis` | **32817** | EHR encounter record |
| absent/other | **32817** | EHR (default) |
