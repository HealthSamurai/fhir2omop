# Location → care_site (secondary pattern)

OMOP CDM v5.4. The primary source for the `care_site` table is FHIR `Organization` -- see [`../Organization/care_site.md`](../Organization/care_site.md). This document covers the **secondary pattern** where a FHIR `Location` resource also produces a `care_site` row, in addition to its primary `location` row (see [`./location.md`](./location.md)).

This pattern is used by **fhir-to-omop-demo** (jq), which emits a care_site row from each Location resource. It is **not** used by omoponfhir-v54, fhir-x-omop, ETL-German-FHIR-Core, or NACHC.

## Pattern Overview

For each FHIR `Location` resource:

1. Emit a `location` row (address, lat/lng) -- see [`./location.md`](./location.md).
2. Additionally emit a `care_site` row with:
   - `care_site_id` = `Location.managingOrganization.reference` (resolved to the Organization's care_site_id).
   - `location_id` = `Location.id` (the location row produced in step 1).
   - Other care_site fields (name, place_of_service_concept_id) typically null since Location does not carry them in the same form Organization does.

This is a deliberate choice in fhir-to-omop-demo: the Organization mapper emits a care_site row with name and source value but **no** `location_id` (sets null). The Location mapper then emits a *second* care_site row with the same `care_site_id` (because `managingOrganization` points at the Organization) but populated `location_id`. Downstream consumers may merge these two rows.

## Field Mapping (Location-derived care_site row)

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| `Location.managingOrganization.reference` | `care_site_id` | integer (PK) | Yes | Resolves to the Organization's care_site_id. The same `care_site_id` value as the row produced by `Organization.jq` -- the two rows describe the same care site. |
| (typically null on this row) | `care_site_name` | varchar(255) | No | Set by the Organization-derived care_site row, not this one. |
| (typically null on this row) | `place_of_service_concept_id` | integer (FK CONCEPT) | No | Set by the Organization-derived care_site row, not this one. |
| `Location.id` | `location_id` | integer (FK LOCATION) | No | Points to the `location` row produced from this same Location resource. |
| (typically null on this row) | `care_site_source_value` | varchar(50) | No | Set by the Organization-derived care_site row, not this one. |
| (typically null on this row) | `place_of_service_source_value` | varchar(50) | No | Set by the Organization-derived care_site row, not this one. |

For the full `care_site` field reference and all the other field-mapping details (Organization.name → care_site_name, Organization.type → place_of_service_concept_id, etc.), see [`../Organization/care_site.md`](../Organization/care_site.md).

## Dedup / Reconciliation

Because `Organization.jq` and `Location.jq` both emit care_site rows that may share the same `care_site_id`, downstream processing has two options:

1. **Merge before insert.** Group rows by `care_site_id` and coalesce non-null fields across the two rows: `care_site_name` from the Organization row, `location_id` from the Location row, etc. Insert one merged row per `care_site_id`.

2. **Insert both, accept duplicates.** Two rows per care site. May break uniqueness constraints in some OMOP DDLs (the standard CDM specifies `care_site_id` as PRIMARY KEY, so duplicate IDs will fail to insert).

3. **Pick one source authoritatively.** Always prefer Organization-derived rows; ignore Location-derived rows. Lose the `location_id` linkage.

fhir-to-omop-demo's documentation does not specify a reconciliation strategy explicitly; the upstream consumer is expected to handle this.

## Edge Cases

| Case | Handling |
|---|---|
| `Location.managingOrganization` absent | No care_site_id available -- skip the care_site row. The location row is still emitted. |
| `Location.managingOrganization` references an Organization not in bundle | Deferred resolution. Stub care_site_id; resolve when Organization arrives. |
| Multiple Locations under the same managingOrganization | Each Location emits a care_site row with the same `care_site_id`. Without merge, this produces duplicates -- a single Organization with N Locations yields 1 + N care_site rows. |
| Location with no address but with managingOrganization | care_site row emitted but `location_id` points at a sparse location row (lat/lng only or empty). |
| Location with address but no managingOrganization | location row only -- no care_site row. |

## Sources

- fhir-to-omop-demo jq (Location, 41 lines): `refs/refs/fhir-to-omop-demo/demo/translate/map/Location.jq`
  - SECOND care_site row from Location resource: lines 31-39
  - care_site_id from `managingOrganization` reference: line 10, 33
  - location_id = `.id` (Location.id): line 36
- fhir-to-omop-demo jq (Organization, 22 lines): `refs/refs/fhir-to-omop-demo/demo/translate/map/Organization.jq`
  - Organization-derived care_site row (no location_id): lines 11-22
  - location_id null in this row: line 17
- Primary Organization → care_site mapping: [`../Organization/care_site.md`](../Organization/care_site.md)
- Primary Location → location mapping: [`./location.md`](./location.md)
- OMOP CDM v5.4 care_site spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 Location: https://hl7.org/fhir/R4/location.html
