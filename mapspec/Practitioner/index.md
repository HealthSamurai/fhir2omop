# Practitioner → OMOP Mapping

FHIR `Practitioner` represents an individual healthcare provider (a person with formal responsibility for delivering healthcare). It maps to a single OMOP CDM table: `provider`. Clinical event tables (visit_occurrence, condition_occurrence, observation, drug_exposure, etc.) carry `provider_id` foreign keys back to this row.

## Source FHIR Resource → OMOP Table

| FHIR Resource | OMOP Table | Notes |
|---|---|---|
| `Practitioner` | `provider` | Individual healthcare provider |

## Mapping Strategy

- Core mapping: `Practitioner.name` → `provider_name`, `Practitioner.identifier` → `provider_source_value`.
- NPI (`http://hl7.org/fhir/sid/us-npi`) is the standard identifier for US providers and populates `provider.npi`.
- `Practitioner.gender` → `gender_concept_id` (same vocabulary mapping as Patient: male→8507, female→8532, other→8521, unknown→8551).
- `Practitioner.birthDate` → `year_of_birth` (year component only).
- Specialty does NOT live on Practitioner itself -- it comes from `PractitionerRole.specialty`. See [`../PractitionerRole/provider.md`](../PractitionerRole/provider.md).
- `Practitioner.address` may be used to derive a `care_site` row when no `PractitionerRole.organization` link exists (omoponfhir behavior).
- Processing order: Location → Organization (care_site) → Practitioner → PractitionerRole → clinical resources, so `provider_id` foreign keys can be resolved.

## Per-Table Docs

- [provider](./provider.md) -- Practitioner → provider field map, gender vocabulary, edge cases.

## Reference Implementations

- **omoponfhir-v54** (Georgia Tech, Java) -- Bidirectional. Most complete Practitioner handling.
  - `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPractitioner.java` (396 lines): name formatting, NPI extraction, gender mapping, address → care_site creation, deduplication by providerSourceValue.
  - Status: stale (2022), but most feature-complete admin mapper.

- **fhir-to-omop-demo** (jq) -- FHIR → OMOP one-way.
  - `refs/refs/fhir-to-omop-demo/demo/translate/map/Practitioner.jq` (54 lines): provider row with NPI, gender_concept_id. Also creates a person row (unusual).
  - Status: maintained, good reference for Synthea bundles.

- **fhir-x-omop** (Python) -- Bidirectional with partial coverage.
  - `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/provider.py` (38 lines): Practitioner → provider. Name formatting ("given family"), NPI extraction by system, gender source (uppercased), year_of_birth, specialty fallback to qualification.
  - Status: early WIP.

- **NACHC-fhir-to-omop** (Java) -- No Practitioner mapper.
  - `refs/refs/NACHC-fhir-to-omop/src/main/resources/sqlserver/omop/5.4/location/create-location-and-caresite-dummy-records.sql` (50 lines): creates a single dummy provider (id=1). All references default to this fixed ID.
  - Status: active, but Practitioner is not mapped from FHIR data.

## Status in This Project

Not yet implemented. No `provider` mapper exists in `src/mapper/`. Existing clinical mappers resolve `provider_id` via stub IDs or deferred reference resolution.
