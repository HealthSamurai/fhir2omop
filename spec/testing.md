# FHIR R4 to OMOP CDM — Test Strategy

## Overview

Tests validate the mapping logic from FHIR R4 resources to OMOP CDM v5.4 tables. Each mapper is tested via both JSON data-driven tests and inline unit tests, covering normal, edge, and error cases.

## Test Framework

- **Runtime**: Bun (`bun test`)
- **JSON data-driven tests**: `tests/{resource}/run.test.ts` + `*.json` fixtures
- **Inline unit tests**: `tests/{resource}.test.ts`
- **No external dependencies**: Pure unit tests, no database or vocabulary service required

## Testing Approaches

### 1. JSON Data-Driven Tests (primary)

Each resource has a `tests/{resource}/` directory with:
- `run.test.ts` — test runner that auto-loads all JSON fixtures
- `*.json` — test case files organized by mapping topic

JSON test case format:
```json
[{
  "description": "what is being tested",
  "spec": "mapping/resource/element.md",
  "fhir": [{ "resourceType": "...", ... }],
  "omop": [{ "table": "omop_table", "field": "expected_value" }]
}]
```

Key features:
- **Dual mode**: All tests run in both sequential and hash ID modes automatically
- **Partial matching**: Only specified fields are checked (other fields ignored)
- **Table grouping**: Results grouped by OMOP table name
- **Skip cases**: `omop: null` means resource should produce no output
- **ID relaxation**: In hash mode, ID fields auto-checked as `> 0` (not exact match)

### 2. Inline Unit Tests (supplementary)

Each resource also has `tests/{resource}.test.ts` with programmatic tests using helper factories:
```typescript
function makeResource(overrides = {}): ResourceType {
  return { /* valid defaults */ ...overrides };
}
```

## Test Categories

### 1. Status Filter Tests
Verify that resources with invalid statuses are skipped (return null):
- Condition: only active/recurrence/relapse + confirmed/unconfirmed/provisional/differential
- Observation: only final/amended/corrected
- Encounter: only finished/in-progress
- MedicationRequest: only active/completed
- MedicationStatement: only active/completed
- AllergyIntolerance: only active (clinical) + not entered-in-error/refuted

### 2. Field Mapping Tests
Verify that each FHIR field maps to the correct OMOP field(s).

### 3. Edge Case Tests
- Missing optional fields
- Partial dates (YYYY, YYYY-MM)
- Empty arrays / null values
- Polymorphic type handling (onset[x], effective[x], value[x])

### 4. Reference Tests
Verify FK relationships: person_id, visit_occurrence_id, provider_id.

### 5. Full Integration Tests
End-to-end mapping of complete FHIR resources to all OMOP output tables.

### 6. Decision Tests
Validate specific mapping decisions documented in `mapping/`:
- Gender: other → 8521, unknown → 8551 (not 0)
- BirthDate: missing → no PERSON record
- Identifier: priority SSN > MRN > first > Patient.id
- Address: home → first → NULL selection
- Observation routing: category-based measurement vs observation

## Resource Coverage

| Resource | OMOP Table(s) | JSON Fixtures | Inline Tests |
|----------|--------------|---------------|--------------|
| Patient | person, location, death | 8 files | yes |
| Condition | condition_occurrence | 5 files | yes |
| Encounter | visit_occurrence | 5 files | yes |
| Observation | measurement, observation | 6 files | yes |
| MedicationRequest | drug_exposure | 4 files | yes |
| MedicationStatement | drug_exposure | 4 files | yes |
| AllergyIntolerance | observation | 5 files | yes |
| MappingContext | — | — | yes |

**Total: 601 tests, 2000 expect() calls, 15 test files.**

## Running Tests

```sh
bun test                              # Run all tests
bun test tests/patient                # Run patient tests (inline + JSON)
bun test tests/condition/run.test.ts  # Run condition JSON tests only
```
