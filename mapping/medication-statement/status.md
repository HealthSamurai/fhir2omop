# MedicationStatement.status → OMOP filtering

## Source

FHIR `MedicationStatement.status` — code: active, completed, entered-in-error, intended, stopped, not-taken, on-hold, unknown.

## Target

Used for **filtering**.

## Filtering

| Value | Action | Reason |
|---|---|---|
| `active` | Map | Currently taking |
| `completed` | Map | Completed course |
| `entered-in-error` | Skip | Erroneous record |
| `intended` | Skip | Planned — not yet started |
| `stopped` | Skip | Stopped |
| `not-taken` | Skip | Not taken |
| `on-hold` | Skip | On hold |
| `unknown` | Skip | Unknown status |

## Type Concept

| FHIR Resource | drug_type_concept_id | OMOP Concept |
|---|---|---|
| MedicationStatement | **44787730** | Patient Self-Reported Medication |
