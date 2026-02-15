# MedicationRequest.status → OMOP filtering

## Source

FHIR `MedicationRequest.status` — code: active, on-hold, cancelled, completed, entered-in-error, stopped, draft, unknown.

## Target

Used for **filtering** — determines whether a DRUG_EXPOSURE record is created.

## Filtering

| Value | Action | Reason |
|---|---|---|
| `active` | Map | Active prescription |
| `completed` | Map | Completed prescription |
| `on-hold` | Skip | On hold |
| `cancelled` | Skip | Cancelled |
| `entered-in-error` | Skip | Erroneous record |
| `stopped` | Skip | Stopped |
| `draft` | Skip | Draft — not prescribed |
| `unknown` | Skip | Unknown status |

## Type Concept

| FHIR Resource | drug_type_concept_id | OMOP Concept |
|---|---|---|
| MedicationRequest | **38000177** | Prescription written |
