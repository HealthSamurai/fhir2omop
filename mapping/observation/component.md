# Observation.component → OMOP expanded records

## Source

FHIR `Observation.component` — array of components (e.g., systolic/diastolic blood pressure in one Observation).

Each component contains:
- `code` — CodeableConcept
- `value[x]` — value
- `referenceRange` — reference range
- `interpretation` — interpretation

## Target

Each component creates a **separate record** in OMOP (measurement or observation).

## Mapping

| Aspect | Behavior |
|---|---|
| Routing | All components inherit category-based routing from the parent |
| code | Uses `component.code` (overrides parent code) |
| value[x] | Uses `component.value[x]` |
| referenceRange | Uses `component.referenceRange` |
| ID | Suffix `-comp-{index}` for uniqueness in IdRegistry |
| person_id | Inherited from parent |
| visit_occurrence_id | Inherited from parent |
| provider_id | Inherited from parent |

## Examples

### Blood pressure (LOINC 85354-9)

Input Observation with 2 components → 2 measurement records:
1. Systolic (8480-6): value=120, unit=mmHg
2. Diastolic (8462-4): value=80, unit=mmHg

### Questionnaire (survey)

Input Observation with N components → N observation records.

## Handling invalid components

Components with empty `code.coding` are skipped. The rest create records.

## Single component

If only 1 component — a single record is returned (not an array).
