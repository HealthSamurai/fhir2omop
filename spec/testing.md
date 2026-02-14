# FHIR R4 to OMOP CDM — Test Strategy

## Overview

Tests validate the mapping logic from FHIR R4 resources to OMOP CDM v5.4 tables. Each mapper is tested independently with FHIR JSON fixtures covering normal, edge, and error cases.

## Test Framework

- **Runtime**: Bun (`bun test`)
- **Test files**: `tests/<resource>.test.ts`
- **Fixtures**: Inline FHIR resources in test files (keeps tests self-contained)
- **No external dependencies**: Pure unit tests, no database or vocabulary service required

## Test Categories

### 1. Field Mapping Tests
Verify that each FHIR field maps to the correct OMOP field(s).

### 2. Edge Case Tests
- Missing optional fields
- Partial dates (YYYY, YYYY-MM)
- Empty arrays
- Null/undefined values

### 3. Decision Tests
Validate specific mapping decisions documented in `mapping/`:
- Gender: other → 8521, unknown → 8551 (not 0)
- BirthDate: missing → no PERSON record created
- Identifier: priority SSN > MRN > first > Patient.id
- Address: home → first → NULL selection

### 4. Status Filter Tests
Verify that resources with invalid statuses are skipped:
- Condition: only active/confirmed
- Observation: only final/amended/corrected
- Procedure: only completed
- Encounter: only finished

### 5. Domain Routing Tests (Observation)
Verify correct routing based on concept domain:
- Lab/vital codes → measurement table
- Social/lifestyle codes → observation table

## Resource Coverage

| Resource | OMOP Table | Test File |
|----------|-----------|-----------|
| Patient | PERSON, LOCATION, DEATH | `tests/patient.test.ts` |
| Encounter | VISIT_OCCURRENCE | `tests/encounter.test.ts` |
| Condition | CONDITION_OCCURRENCE | `tests/condition.test.ts` |
| Observation | MEASUREMENT, OBSERVATION | `tests/observation.test.ts` |
| MedicationRequest | DRUG_EXPOSURE | `tests/medication.test.ts` |

## Running Tests

```sh
bun test                    # Run all tests
bun test tests/patient      # Run patient tests only
```
