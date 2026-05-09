# Practitioner → provider

OMOP CDM v5.4. The `provider` table stores individual healthcare providers. FHIR splits provider information across `Practitioner` (identity, name, qualifications, gender, birth date) and `PractitionerRole` (specialty, organization affiliation). This document covers the Practitioner-driven fields. For specialty and care_site enrichment via PractitionerRole, see [`../PractitionerRole/provider.md`](../PractitionerRole/provider.md).

## Field Mapping (Practitioner-sourced)

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `provider_id` | integer | Yes (PK) | Surrogate key. Hash/sequence/lookup of `Practitioner.id`. It is assumed that every provider with a different unique identifier is a different person. |
| `Practitioner.name[0]` (formatted) | `provider_name` | HumanName → varchar(255) | No | `"{family}, {given}"` or `text`. omoponfhir uses `family + ", " + given` (lines 337-354). fhir-x-omop uses `"{given} {family}"` format (line 13). |
| `Practitioner.identifier` (NPI) | `npi` | string → varchar(20) | No | NPI from system `http://hl7.org/fhir/sid/us-npi`. The National Provider Number issued by CMS. fhir-x-omop filters identifiers by NPI system (lines 15-21). |
| (none) | `dea` | varchar(20) | No | DEA identifier for controlled substance prescriptions. Not standard in FHIR R4 Practitioner. Could be extracted from `Practitioner.qualification` or a custom identifier system. |
| `Practitioner.birthDate` | `year_of_birth` | date → integer | No | Year component of birth date. fhir-x-omop extracts via `int(x.split('-')[0])` (line 30). |
| `Practitioner.gender` | `gender_concept_id` | code → integer (FK CONCEPT) | No | Same mapping as Patient: male→8507, female→8532, other→8521, unknown→8551. See vocabulary table below. |
| `Practitioner.identifier` (best) | `provider_source_value` | string → varchar(50) | No | NPI or first identifier value. Use this field to link back to providers in the source data for ETL error checking. omoponfhir uses `identifierFirstRep.value` (lines 388-392). fhir-x-omop uses `Practitioner.id` (line 26). |
| `Practitioner.gender` | `gender_source_value` | code → varchar(50) | No | Verbatim gender code as it appears in source data. fhir-x-omop uppercases the value (line 29). |
| (none) | `gender_source_concept_id` | integer (FK CONCEPT) | No | 0. Often zero as many sites use proprietary codes to store provider gender. |
| `Practitioner.qualification[0].code` (fallback) | `specialty_source_value` | string → varchar(50) | No | When no PractitionerRole exists, fhir-x-omop falls back to `qualification[0].code.coding[0].code` (line 31). The primary source is `PractitionerRole.specialty[0]` -- see [`../PractitionerRole/provider.md`](../PractitionerRole/provider.md). |

Fields populated from PractitionerRole (`specialty_concept_id`, `care_site_id`, primary `specialty_source_value`, `specialty_source_concept_id`): see [`../PractitionerRole/provider.md`](../PractitionerRole/provider.md).

Fields with no FHIR source: `dea` (no standard FHIR element), `gender_source_concept_id` default to `0`.

FHIR fields with no OMOP target: `Practitioner.active`, `Practitioner.telecom`, `Practitioner.address` (used indirectly to create care_site/location), `Practitioner.photo`, `Practitioner.communication`, `Practitioner.qualification` (except as fallback specialty source).

## Vocabulary Mappings

### Gender (`Practitioner.gender` → `gender_concept_id`)

| FHIR code | OMOP concept_id | OMOP concept_name | Domain |
|---|---|---|---|
| `male` | 8507 | MALE | Gender |
| `female` | 8532 | FEMALE | Gender |
| `other` | 8521 | OTHER | Gender |
| `unknown` | 8551 | UNKNOWN | Gender |
| (absent/null) | 0 | No matching concept | — |

Same mapping as `Patient.gender`. omoponfhir-v54 uses `OmopConceptMapping.omopForAdministrativeGenderCode()` (lines 86-105) which maps null → 8551 (UNKNOWN). Per OMOP Themis convention, absent gender should be 0, not 8551.

## Reference Resolution

### Provider address → care_site + location

omoponfhir creates a `care_site` from the Practitioner's address when no PractitionerRole organization link exists (OmopPractitioner.java lines 358-375):

1. Resolve `Practitioner.address[0]` to a `Location` row via `AddressUtil.searchAndUpdate()`.
2. Search for an existing `care_site` at that location.
3. If none found, create a new `care_site` row with the resolved `location_id`.
4. Set `provider.care_site_id` to the found/created care_site.

### References from clinical event tables

Clinical resources reference providers via:
- `Encounter.participant[].individual` → `visit_occurrence.provider_id`
- `Condition.recorder` / `Condition.asserter` → `condition_occurrence.provider_id`
- `Observation.performer[]` → `measurement.provider_id` / `observation.provider_id`
- `MedicationRequest.requester` → `drug_exposure.provider_id`

These references can point to `Practitioner` or `PractitionerRole`. If the reference is to a PractitionerRole, resolve through to the underlying Practitioner to get the `provider_id`.

## Edge Cases

| Case | Handling |
|---|---|
| Missing name | `provider_name` = null. OMOP allows null. Use `provider_source_value` (identifier) for downstream traceability. |
| No NPI identifier | `npi` = null. Non-US providers or systems without NPI. Use first available identifier for `provider_source_value`. |
| Multiple identifiers | Pick NPI first (`system = http://hl7.org/fhir/sid/us-npi`), then first identifier. omoponfhir uses `identifierFirstRep` (line 388). |
| No PractitionerRole for Practitioner | `specialty_concept_id` = 0, `care_site_id` = null. Provider row is valid but sparse. fhir-x-omop falls back to `Practitioner.qualification[0].code` for specialty (line 31). |
| Practitioner.gender absent | `gender_concept_id` = 0, `gender_source_value` = null. |
| Practitioner referenced but not in bundle | Deferred resolution. Create stub provider with `provider_source_value` = reference string, populate later. NACHC defaults `provider_id` to 1. |
| Duplicate Practitioner (same identifier, different resources) | Deduplicate by identifier value. omoponfhir searches `providerSourceValue` column to find existing provider (lines 153-168). |
| Name formatting inconsistency | Different implementations use different formats: omoponfhir = `"family, given"`, fhir-x-omop = `"given family"`. Pick one and document. |
| DEA number needed | No standard FHIR element. Check `Practitioner.identifier` for a DEA system URI or `qualification` entries. |

## Implementation Comparison

PractitionerRole-specific behaviors below are documented in [`../PractitionerRole/provider.md`](../PractitionerRole/provider.md).

| Aspect | HL7 IG (FSH) | omoponfhir-v54 | fhir-to-omop-demo | fhir-x-omop | ETL-German | NACHC |
|---|---|---|---|---|---|---|
| Direction | F↔O (logical model) | F↔O | F→O | F→O (+ O→F) | F→O | F→O |
| `provider_id` strategy | 1..1 integer | IdMapping (FHIR↔OMOP) | uses FHIR `.id` | `int(Practitioner.id)` | (no dedicated mapper) | autogen sequence |
| `provider_name` format | 0..1 string | `"family, given"` | null (from PractitionerRole.display) | `"given family"` | — | — |
| NPI extraction | 0..1 string | `identifierFirstRep.value` | `.npi` (pre-extracted) | filter by NPI system | — | — |
| Specialty source | — (no FML map) | not mapped (no PractitionerRole handling -- see PractitionerRole/provider.md) | see PractitionerRole/provider.md | `qualification[0].code` (fallback) | — | — |
| `care_site_id` source | 0..1 FK CareSite | created from Practitioner.address | see PractitionerRole/provider.md | not mapped | — | default 1 |
| Gender mapping | 0..1 code | `OmopConceptMapping` enum | pre-computed `.gender_concept_id` | `gender.upper()` (source only) | — | — |
| `year_of_birth` | 0..1 integer | not mapped | not mapped | `birthDate.split('-')[0]` | — | — |
| Deduplication | — | search by providerSourceValue | no | no | — | — |
| Address → Location | — | yes (via AddressUtil) | no | no | — | — |

## Sources

- HL7 IG FSH logical model (normative): `refs/refs/fhir-omop-ig/input/fsh/Provider.fsh`
  - All 13 provider fields defined: lines 1-20
- omoponfhir-v54 Java (bidirectional, 396 lines): `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPractitioner.java`
  - Name formatting (family, given): lines 331-355
  - Address → care_site creation: lines 358-375
  - Gender concept mapping: lines 378-386
  - Identifier → provider_source_value: lines 388-392
  - Deduplication by providerSourceValue: lines 151-168
  - OMOP → FHIR (constructFHIR): lines 82-137
- omoponfhir-v54 concept mapping: `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopConceptMapping.java`
  - Gender enum (MALE/FEMALE/UNKNOWN/OTHER/NULL): lines 30-34
  - `omopForAdministrativeGenderCode()`: lines 86-105
- fhir-to-omop-demo jq (Practitioner): `refs/refs/fhir-to-omop-demo/demo/translate/map/Practitioner.jq`
  - Provider row output with NPI, gender_concept_id: lines 16-31
  - Also creates person row (unusual): lines 33-52
- fhir-x-omop Python (to_omop): `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/provider.py`
  - Name formatting: lines 7-13
  - NPI extraction by system: lines 15-21
  - Gender source value (uppercased): line 29
  - year_of_birth from birthDate: line 30
  - Specialty fallback to qualification: line 31
- fhir-x-omop Python (to_fhir): `refs/refs/fhir-x-omop/fhir_x_omop/to_fhir/practitioner.py`
  - Reverse mapping: provider → Practitioner: lines 9-34
- OMOP CDM v5.4 provider spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 Practitioner: https://hl7.org/fhir/R4/practitioner.html
