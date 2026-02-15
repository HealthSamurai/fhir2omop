# AllergyIntolerance.clinicalStatus / verificationStatus → OMOP filtering

## Source

FHIR `AllergyIntolerance.clinicalStatus` — CodeableConcept: active, inactive, resolved.
FHIR `AllergyIntolerance.verificationStatus` — CodeableConcept: unconfirmed, confirmed, refuted, entered-in-error.

## Target

Used for **filtering**.

## Filtering

### Clinical Status

| Value | Action | Reason |
|---|---|---|
| `active` | Map | Current allergy |
| `inactive` | Skip | Inactive |
| `resolved` | Skip | Resolved |
| absent | Map | clinicalStatus is optional |

### Verification Status

| Value | Action | Reason |
|---|---|---|
| `confirmed` | Map | Confirmed |
| `unconfirmed` | Map | Unconfirmed — still mapped |
| `refuted` | Skip | Refuted |
| `entered-in-error` | Skip | Erroneous record |
| absent | Map | verificationStatus is optional |

## Decision

Stricter than Condition: only `active` for clinicalStatus. `inactive` or `resolved` allergies do not create records — they represent historical state.
