# Location → location

OMOP CDM v5.4. The `location` table represents a generic way to capture physical location or address information of Persons and Care Sites. Each row is a unique address; the table is shared by `person.location_id`, `care_site.location_id`, and (transitively) provider via care_site.

This document covers the primary FHIR `Location` → OMOP `location` mapping. The Patient-driven path (`Patient.address`) is documented in [`../Patient/location.md`](../Patient/location.md). For the secondary pattern where a FHIR Location resource also produces a care_site row, see [`./care_site.md`](./care_site.md).

## OMOP `location` Field Definitions

From `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`:

| OMOP Field | Type | Required | PK | FK | Description |
|---|---|---|---|---|---|
| `location_id` | integer | Yes | Yes | — | The unique key given to a unique Location. Each instance of a Location in the source data should be assigned this unique key. |
| `address_1` | varchar(50) | No | — | — | This is the first line of the address. |
| `address_2` | varchar(50) | No | — | — | This is the second line of the address. |
| `city` | varchar(50) | No | — | — | City. |
| `state` | varchar(2) | No | — | — | State. |
| `zip` | varchar(9) | No | — | — | Zip codes are handled as strings of up to 9 characters. For US addresses these can be 3-digit, 5-digit, or 9-digit (ZIP+4). For international addresses different rules apply. |
| `county` | varchar(20) | No | — | — | County. |
| `location_source_value` | varchar(50) | No | — | — | Verbatim value for the location as it shows up in the source. |
| `country_concept_id` | integer | No | — | CONCEPT | The Concept Id representing the country (Geography domain). |
| `country_source_value` | varchar(80) | No | — | — | The name of the country. |
| `latitude` | float | No | — | — | Must be between -90 and 90. |
| `longitude` | float | No | — | — | Must be between -180 and 180. |

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `location_id` | integer | Yes (PK) | Surrogate key. Each unique address should be assigned a unique key. fhir-to-omop-demo uses `Location.id` directly. |
| `Location.address.line[0]` | `address_1` | string → varchar(50) | No | First line of street address. |
| `Location.address.line[1]` | `address_2` | string → varchar(50) | No | Second line of street address. |
| `Location.address.city` | `city` | string → varchar(50) | No | City. |
| `Location.address.state` | `state` | string → varchar(2) | No | State. May need normalization (e.g., "California" → "CA"). |
| `Location.address.postalCode` | `zip` | string → varchar(9) | No | 3-, 5-, or 9-digit US zip; international codes also allowed. |
| `Location.address.district` | `county` | string → varchar(20) | No | FHIR `district` is the closest analog to OMOP `county`. |
| `Location.address.country` | `country_source_value` | string → varchar(80) | No | Country name verbatim. |
| `Location.address.country` (mapped) | `country_concept_id` | integer (FK CONCEPT) | No | Mapped to OMOP Geography domain concept. 0 if unmapped. |
| `Location.position.latitude` | `latitude` | decimal → float | No | Must be between -90 and 90. |
| `Location.position.longitude` | `longitude` | decimal → float | No | Must be between -180 and 180. |
| `Location.id` or `Location.address.text` | `location_source_value` | string → varchar(50) | No | Verbatim source identifier or full address text for traceability. |

FHIR fields with no OMOP target: `Location.status`, `Location.operationalStatus`, `Location.name`, `Location.alias`, `Location.description`, `Location.mode`, `Location.type` (could map to `place_of_service_concept_id` on a derived care_site row -- see [`./care_site.md`](./care_site.md)), `Location.telecom`, `Location.physicalType`, `Location.managingOrganization` (used to set `care_site_id` on a derived care_site row), `Location.partOf`, `Location.hoursOfOperation`, `Location.availabilityExceptions`, `Location.endpoint`.

## Reference Resolution

### Shared `location` table with Patient

Both `Patient.address` and `Location.address` populate the same `location` table. The OMOP `person.location_id` and `care_site.location_id` columns reference the same row when the addresses match. Implementations should deduplicate by (address_1, city, state, zip) tuple to avoid creating multiple `location` rows for the same physical address. omoponfhir's `AddressUtil.searchAndUpdate()` performs this lookup-or-create pattern when called from OmopPractitioner and OmopOrganization.

### Producing care_site from Location

Some implementations (fhir-to-omop-demo) additionally emit a `care_site` row from each `Location` resource, with the new care_site's `location_id` pointing back at the location row created above. See [`./care_site.md`](./care_site.md).

## Edge Cases

| Case | Handling |
|---|---|
| Multiple `Location.address.line[]` entries beyond 2 | OMOP `location` has only `address_1` and `address_2`. Concatenate the third+ lines into `address_2` or drop them. |
| `Location.address` absent but `Location.position` present | Create a `location` row with only latitude/longitude populated; address fields null. |
| `Location.position` absent | latitude and longitude null. OMOP allows nulls. |
| State name not 2-letter abbreviation | Normalize (e.g., "California" → "CA"). The OMOP `state` field is varchar(2). For international locations, the 2-char limit may force lossy mapping. |
| zip > 9 chars (international postal codes) | Truncate to 9 characters or store in `location_source_value`. |
| Country present but no concept mapping | `country_source_value` = country name verbatim; `country_concept_id` = 0. |
| Latitude/longitude out of valid range (-90..90 / -180..180) | Reject or null. OMOP DDL constraints in some dialects enforce this. |
| Same address appearing in both Patient.address and Location | Deduplicate by (address_1, city, state, zip). Re-use existing location_id. |
| Location resource with `Location.managingOrganization` | Used to derive a `care_site` row in the dual-source pattern. See [`./care_site.md`](./care_site.md). |
| Multiple Locations with identical addresses but different `Location.id` | Choose one canonical location row; map both Location.id values to it via the ID-mapping table. |

## Sources

- fhir-to-omop-demo jq (Location, 41 lines): `refs/refs/fhir-to-omop-demo/demo/translate/map/Location.jq`
  - Creates BOTH a location row AND a care_site row from the Location resource.
  - care_site row from Location: lines 31-39 (covered in [`./care_site.md`](./care_site.md))
  - care_site_id from `managingOrganization` reference: lines 10, 33
  - location_id = `.id` (Location.id): line 36
- omoponfhir-v54 (uses AddressUtil for address → location resolution from Practitioner and Organization, not Location resources directly):
  - `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopOrganization.java` lines 240, 267-275 (Address → location via AddressUtil)
- NACHC-fhir-to-omop (dummy location):
  - `refs/refs/NACHC-fhir-to-omop/src/main/resources/sqlserver/omop/5.4/location/create-location-and-caresite-dummy-records.sql` (50 lines): creates a single dummy location (id=1).
- OMOP CDM v5.4 location spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 Location: https://hl7.org/fhir/R4/location.html
