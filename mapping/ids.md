# ID Mapping: FHIR → OMOP

## Problem

FHIR resources use string identifiers (often UUIDs like `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`),
while OMOP CDM requires integer primary keys (`person_id`, `visit_occurrence_id`, etc.)
and integer foreign keys (`person_id` in condition_occurrence, `provider_id`, etc.).

## Solution: IdRegistry

An `IdRegistry` assigns stable sequential integer IDs to FHIR resource references.
It maintains a per-resource-type map from FHIR ID → integer.

### Behavior

- First encounter of a FHIR ID → assigns next sequential integer (starting from 1)
- Subsequent encounters of same FHIR ID → returns the same integer
- Namespaced by resource type: `Patient/abc` and `Encounter/abc` get independent IDs
- Works with any string ID format: numeric, UUID, slug, etc.

### Primary Keys

Each FHIR resource ID maps to an OMOP primary key:

| FHIR Resource | FHIR ID | OMOP Table | OMOP PK |
|---------------|---------|------------|---------|
| Patient | Patient.id | person | person_id |
| Encounter | Encounter.id | visit_occurrence | visit_occurrence_id |
| Condition | Condition.id | condition_occurrence | condition_occurrence_id |
| Observation | Observation.id | measurement / observation | measurement_id / observation_id |
| MedicationRequest | MedicationRequest.id | drug_exposure | drug_exposure_id |

If `Resource.id` is absent, no PK is assigned (field left undefined for DB auto-generation).

### Foreign Keys (References)

FHIR references like `{ "reference": "Patient/abc-123" }` are resolved via the same registry:

| FHIR Reference | OMOP FK Field | Used In |
|----------------|---------------|---------|
| `Patient/{id}` | person_id | condition_occurrence, measurement, observation, drug_exposure, visit_occurrence, death |
| `Encounter/{id}` | visit_occurrence_id | condition_occurrence, measurement, observation, drug_exposure |
| `Practitioner/{id}` | provider_id | person, condition_occurrence, measurement, observation, drug_exposure, visit_occurrence |
| `Organization/{id}` | care_site_id | person, visit_occurrence |
| `Location/{id}` | location_id | person (derived from Patient.address) |

### Cross-Resource Consistency

A shared `MappingContext` (containing one `IdRegistry`) must be passed to all mappers
during a single ETL run. This ensures that `Patient/abc` always resolves to the same
`person_id` whether referenced from a Condition, Encounter, or Observation.

```
const ctx = new MappingContext();

// Patient "abc" gets person_id = 1
mapPatient(patient, ctx);

// Condition referencing Patient/abc also gets person_id = 1
mapCondition(condition, ctx);
```

### Location IDs

Locations derived from Patient.address use a synthetic key `Patient/{patient.id}`
in the Location namespace, ensuring each patient's address gets a unique location_id.

### Death Records

Death records inherit the `person_id` from their parent Patient mapping,
ensuring the FK relationship is consistent.

## Consensus of Reference Implementations

| Project | ID Strategy |
|---------|-------------|
| omoponfhir-v54-r4 | Assumes numeric IDs, stores identifier in `person_source_value` as `system^value` |
| ETL-German-FHIR-Core | Tracks `fhir_logical_id` extension field for incremental updates |
| FhirToCdm | DB auto-increment for PKs, stores `Patient.id` in `person_source_value` |
| NACHC-fhir-to-omop | DB auto-increment, stores `Patient.id` in `person_source_value` |
| omopfhirmap | Direct `Patient.id` copy, assumes numeric for references |

Our approach (IdRegistry) combines the best aspects:
- Works with any FHIR ID format (UUID, numeric, slug)
- Deterministic within a single ETL run (same input → same IDs)
- Preserves original FHIR identifier in `*_source_value` fields
- No database dependency for ID generation
