# Location → OMOP Mapping

FHIR `Location` represents a physical place where services are provided -- a building, room, vehicle, or geographic position. It is referenced from many other resources (Patient.address indirectly, Encounter.location, Organization.address indirectly, PractitionerRole.location).

In OMOP CDM v5.4, FHIR Location maps **primarily** to the `location` table (street address, city, state, zip, lat/lng). In some implementations (notably fhir-to-omop-demo), it **also** produces `care_site` rows alongside Organization-derived ones.

## Source FHIR Resource → OMOP Tables

| FHIR Resource | OMOP Table | Notes |
|---|---|---|
| `Location` | `location` (primary) | Physical address row. Shared with Patient.address. |
| `Location` | `care_site` (secondary) | Some implementations create a care_site row from Location, with `Location.managingOrganization` as `care_site_id` and `Location.id` as `location_id`. |

## Mapping Strategy

- `Location.address` → `address_1`, `address_2`, `city`, `state`, `zip`, `county`. `Location.position.latitude`/`longitude` → `latitude`, `longitude`.
- The `location` table is also populated from `Patient.address`; rows may need to be deduplicated by address components.
- For implementations that also derive care_site from Location: `Location.managingOrganization.reference` resolves the parent Organization's care_site_id; `Location.id` becomes the new care_site row's `location_id`.
- Processing order: Location → Organization (care_site, may use Location's location_id) → Practitioner/PractitionerRole → clinical resources.

## Reference Implementations

- **fhir-to-omop-demo** (jq) -- FHIR → OMOP one-way. Most explicit Location handling.
  - `refs/refs/fhir-to-omop-demo/demo/translate/map/Location.jq` (41 lines): creates BOTH a location row AND a care_site row (with location_id) from the Location resource. care_site_id comes from `managingOrganization`.
  - Status: maintained, good reference for Synthea bundles.

- **omoponfhir-v54** (Georgia Tech, Java) -- Resolves addresses from Practitioner.address and Organization.address into `location` rows via `AddressUtil.searchAndUpdate()`. No standalone Location resource handling beyond this.

- **NACHC-fhir-to-omop** (Java) -- Creates a single dummy `location` row (id=1) used by all references.
  - `refs/refs/NACHC-fhir-to-omop/src/main/resources/sqlserver/omop/5.4/location/create-location-and-caresite-dummy-records.sql` (50 lines).

## Status in This Project

Not yet implemented. No `location` mapper exists in `src/mapper/`.
