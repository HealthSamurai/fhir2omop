# ID Mapping: FHIR → OMOP

## Problem

FHIR resources use string identifiers (often UUIDs like `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`),
while OMOP CDM requires integer primary keys (`person_id`, `visit_occurrence_id`, etc.)
and integer foreign keys (`person_id` in condition_occurrence, `provider_id`, etc.).

## Solution: IdRegistry

An `IdRegistry` assigns stable integer IDs to FHIR resource references.
Two modes are supported:

### Mode 1: Hash (recommended for production)

Uses FNV-1a-64 hash on `"ResourceType:fhirId"` to produce a deterministic BIGINT.

```
hash("Patient:abc-123-uuid")  →  4812507891234567
hash("Patient:abc-123-uuid")  →  4812507891234567  (same — idempotent)
```

Properties:
- **Deterministic across runs**: same FHIR ID always produces the same OMOP integer
- **Stateless**: no lookup table or sequence coordination needed
- **Parallel-friendly**: each mapper can compute IDs independently
- **Idempotent**: re-running ETL produces identical IDs
- **Namespaced**: `Patient:abc` and `Encounter:abc` hash to different values

### Mode 2: Sequential (simple, collision-free)

Assigns 1, 2, 3... in order of first encounter. Deterministic within a single run
but not across runs (depends on processing order).

### Choosing a Mode

```ts
// Hash mode (recommended)
const ctx = new MappingContext(new IdRegistry("hash"));

// Sequential mode (default, backward-compatible)
const ctx = new MappingContext(new IdRegistry("sequential"));
```

## Hash Function: FNV-1a-64

[FNV-1a](https://www.ietf.org/archive/id/draft-eastlake-fnv-21.html) (Fowler-Noll-Vo)
is a non-cryptographic hash function producing a 64-bit integer.

```
offset_basis = 0xcbf29ce484222325
prime        = 0x100000001b3

hash = offset_basis
for each byte in input:
    hash = hash XOR byte
    hash = hash × prime  (mod 2^64)

return hash & 0x7fffffffffffffff  // mask to 63 bits for signed BIGINT
```

The output is masked to 63 bits to fit OMOP's signed BIGINT range (0 to 2^63-1).

### Collision Probability

Using the birthday paradox formula `p ≈ 1 - e^(-k²/2N)` where N = 2^63:

| Records (k) | Collision probability |
|---|---|
| 1 million | ~5 × 10⁻⁸ (1 in 20 million) |
| 10 million | ~5 × 10⁻⁶ (1 in 200,000) |
| 100 million | ~5 × 10⁻⁴ (1 in 2,000) |
| 1 billion | ~5 × 10⁻² (1 in 20) |

For healthcare datasets (<100M patients), the risk is very low.

## Collision Detection

Collisions are detected using OMOP's `*_source_value` fields, which always
store the original FHIR identifier. If two different source values produce
the same hash, the registry records a collision.

### In-Memory Detection (during ETL)

The `IdRegistry` maintains a reverse map (hash → fhirId) per resource type.
When a new FHIR ID hashes to an existing value with a different source ID,
a collision is recorded:

```ts
const ctx = new MappingContext(new IdRegistry("hash"));

// ... run all mappers ...

if (ctx.ids.hasCollisions()) {
  for (const c of ctx.ids.getCollisions()) {
    console.error(
      `COLLISION: ${c.resourceType} "${c.fhirId}" and "${c.existingFhirId}" ` +
      `both hash to ${c.hashValue}`
    );
  }
  // Abort ETL or switch to sequential mode for affected resource types
}
```

### Post-Load SQL Verification

After loading into the database, verify via `*_source_value` columns:

```sql
-- Check person_id collisions
SELECT person_id, COUNT(*) as cnt,
       ARRAY_AGG(DISTINCT person_source_value) as source_values
FROM person
GROUP BY person_id
HAVING COUNT(DISTINCT person_source_value) > 1;

-- Check visit_occurrence_id collisions
SELECT visit_occurrence_id, COUNT(*) as cnt,
       ARRAY_AGG(DISTINCT visit_source_value) as source_values
FROM visit_occurrence
GROUP BY visit_occurrence_id
HAVING COUNT(DISTINCT visit_source_value) > 1;

-- Generic pattern for any table:
-- SELECT <pk>, COUNT(*), ARRAY_AGG(DISTINCT <source_value>)
-- FROM <table> GROUP BY <pk>
-- HAVING COUNT(DISTINCT <source_value>) > 1;
```

If any collisions are found, remediation options:
1. Switch to sequential mode for the affected resource type
2. Add a salt/namespace prefix to the hash input
3. Use a wider hash (128-bit) with a collision-resolution table

## Primary Keys

Each FHIR resource ID maps to an OMOP primary key:

| FHIR Resource | FHIR ID | OMOP Table | OMOP PK |
|---------------|---------|------------|---------|
| Patient | Patient.id | person | person_id |
| Encounter | Encounter.id | visit_occurrence | visit_occurrence_id |
| Condition | Condition.id | condition_occurrence | condition_occurrence_id |
| Observation | Observation.id | measurement / observation | measurement_id / observation_id |
| MedicationRequest | MedicationRequest.id | drug_exposure | drug_exposure_id |

If `Resource.id` is absent, no PK is assigned (field left undefined for DB auto-generation).

## Foreign Keys (References)

FHIR references like `{ "reference": "Patient/abc-123" }` are resolved via the same registry:

| FHIR Reference | OMOP FK Field | Used In |
|----------------|---------------|---------|
| `Patient/{id}` | person_id | condition_occurrence, measurement, observation, drug_exposure, visit_occurrence, death |
| `Encounter/{id}` | visit_occurrence_id | condition_occurrence, measurement, observation, drug_exposure |
| `Practitioner/{id}` | provider_id | person, condition_occurrence, measurement, observation, drug_exposure, visit_occurrence |
| `Organization/{id}` | care_site_id | person, visit_occurrence |
| `Location/{id}` | location_id | person (derived from Patient.address) |

## Cross-Resource Consistency

A shared `MappingContext` (containing one `IdRegistry`) must be passed to all mappers
during a single ETL run. This ensures that `Patient/abc` always resolves to the same
`person_id` whether referenced from a Condition, Encounter, or Observation.

```ts
const ctx = new MappingContext(new IdRegistry("hash"));

// Patient "abc" gets person_id = hash("Patient:abc")
mapPatient(patient, ctx);

// Condition referencing Patient/abc gets the same person_id
mapCondition(condition, ctx);

// Verify no collisions at the end
assert(!ctx.ids.hasCollisions());
```

## Prior Art

| Project | Approach |
|---------|----------|
| [OHDSI/dbt-synthea](https://github.com/OHDSI/dbt-synthea) | MD5 hash for deterministic location joins (`safe_hash` macro), `row_number()` for PKs |
| [Frankenberger et al. (OHDSI 2023)](https://www.ohdsi.org/2023showcase-5/) | "Deterministic hash function [with] surrogate keys as inputs to generate unique, consistent OMOP primary and foreign keys" |
| [Snowflake MD5_NUMBER_LOWER64](https://docs.snowflake.com/en/sql-reference/functions/md5_number_lower64) | Built-in function producing 64-bit integer hash for surrogate keys |
| [dbt generate_surrogate_key](https://docs.getdbt.com/blog/managing-surrogate-keys) | MD5-based hash macro, industry-standard pattern for idempotent ETL |
| [Data Vault 2.0](https://www.tpximpact.com/knowledge-hub/blogs/tech/hash-keys-data-warehousing-1) | Hash keys as standard pattern for deterministic surrogate keys |
| omoponfhir-v54-r4 | Stores identifier in `person_source_value` as `system^value` |
| ETL-German-FHIR-Core | Tracks `fhir_logical_id` extension field for incremental updates |
| FhirToCdm / NACHC | DB auto-increment for PKs, stores `Patient.id` in `person_source_value` |
