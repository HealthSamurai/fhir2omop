# PractitionerRole → OMOP Mapping

FHIR `PractitionerRole` describes a Practitioner in a specific role -- specialty, organization affiliation, location, and period of practice. It does NOT carry identity (name, NPI, gender, birth date); those live on the referenced `Practitioner`.

In OMOP CDM v5.4, PractitionerRole does NOT produce a new `provider` row. Instead, it **enriches an existing provider row** that was created from the underlying `Practitioner` resource. PractitionerRole supplies the specialty and care_site columns of that row.

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `provider` (enrichment) | Adds `specialty_concept_id`, `specialty_source_value`, and `care_site_id` to the Practitioner's existing provider row | No |

## Mapping Strategy

- `PractitionerRole.practitioner` → resolve to find the existing `provider_id` (created from the linked Practitioner).
- `PractitionerRole.specialty[0]` → `specialty_concept_id` (via NUCC, SNOMED, or HL7 v2 Provider Role vocabulary). Code text → `specialty_source_value`.
- `PractitionerRole.organization` → `care_site_id` (FK to `care_site` populated from `Organization`).
- One `provider` row per Practitioner. If multiple PractitionerRoles exist for the same Practitioner, choose the most recent (by `period.end`) or most specific specialty.
- This is **enrichment, not row creation**. The base provider row must already exist (or be created on demand) from the Practitioner mapping.
- Processing order: Location → Organization (care_site) → Practitioner (base provider row) → PractitionerRole (specialty + care_site enrichment) → clinical resources.

## Reference Implementations

- **fhir-to-omop-demo** (jq) -- FHIR → OMOP one-way.
  - `refs/refs/fhir-to-omop-demo/demo/translate/map/PractitionerRole.jq` (80 lines): specialty extraction, merge-based approach where PractitionerRole enriches the provider row. `care_site_id` from `location_ids[0]`.
  - Status: maintained, good reference for Synthea bundles.

- **omoponfhir-v54** (Georgia Tech, Java) -- Does NOT process PractitionerRole as a separate resource; only the Practitioner resource is mapped. As a result, specialty is not populated by omoponfhir, and `care_site_id` is derived from `Practitioner.address` instead.

- **fhir-x-omop** (Python) -- No dedicated PractitionerRole mapper. Falls back to `Practitioner.qualification[0].code` for `specialty_source_value`.

## Status in This Project

Not yet implemented. No `provider` mapper exists in `src/mapper/`. PractitionerRole enrichment depends on the Practitioner mapper being implemented first.
