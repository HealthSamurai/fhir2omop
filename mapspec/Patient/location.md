# Patient.address → location

OMOP CDM v5.4. The `location` table is a normalized address store referenced by `person.location_id` and `care_site.location_id`. One Patient produces at most one `location` row (most recent address); FK from `person`.

## Trigger

`Patient.address[]` has at least one entry with usable address fields.

If `Patient.address` is absent or empty, no `location` row is created and `person.location_id` stays null.

## Address Selection

FHIR allows multiple addresses with `use` codes. Strategy:

1. Filter out `address.use = 'old'`.
2. Prefer `address.use = 'home'`.
3. If multiple home addresses, pick the **last** (interpreted as most recent — FHIR doesn't strictly order, but conventional). Some implementations (omoponfhir) take the first.
4. Fallback: first non-old address.

## Field Mapping

| FHIR Path | OMOP Field | Type | Notes |
|---|---|---|---|
| (generated) | `location_id` | integer (PK) | Surrogate key. One per distinct address; deduplication is implementation-dependent. |
| `Patient.address.line[0]` | `address_1` | string → varchar(50) | Truncate at 50 chars |
| `Patient.address.line[1]` | `address_2` | string → varchar(50) | Truncate at 50 chars; null if `line` has only one entry |
| `Patient.address.city` | `city` | string → varchar(50) | |
| `Patient.address.state` | `state` | string → **varchar(2)** | Truncate to 2 chars (US state code). Non-US data: store first 2 chars or move to `location_source_value`. |
| `Patient.address.postalCode` | `zip` | string → varchar(9) | Up to 9 chars (ZIP+4). Strip non-digits for US data. International postcodes that exceed 9 chars must be truncated. |
| `Patient.address.district` | `county` | string → varchar(20) | District ≈ county in US |
| `Patient.address.country` | `country_source_value` | string → varchar(80) | Verbatim |
| (lookup) | `country_concept_id` | integer (FK CONCEPT.Geography) | Map country name/ISO code to OMOP Geography concept. Default 0 if no lookup. |
| concat of above | `location_source_value` | string → varchar(50) | Verbatim source representation, often `line, city, state, zip, country` joined |
| (rare) | `latitude` | float | From `address.extension[geolocation].latitude` (`http://hl7.org/fhir/StructureDefinition/geolocation`); range -90..90 |
| (rare) | `longitude` | float | From `address.extension[geolocation].longitude`; range -180..180 |

## Linkage

After the `location` row is written, set `person.location_id` to the new `location_id`.

ETL-German and omoponfhir do this two-pass:
1. Patient mapper emits a deferred `post_process_map` row carrying address fields.
2. Post-processing step writes `location` rows and updates `person.location_id`.

This is necessary in batch ETLs because location-deduplication queries (`SELECT location_id FROM location WHERE address_1 = ? AND city = ? …`) need all rows present.

## Edge Cases

| Case | Handling |
|---|---|
| Multiple `line[]` entries (>2) | OMOP only has `address_1` and `address_2`. Concatenate beyond into `address_2` or drop. |
| State longer than 2 chars (e.g., "California") | Lookup state abbreviation (`CA`); if no lookup, truncate to first 2 letters or write to `location_source_value` only |
| Non-US ZIP (alphanumeric, "K1A 0B1") | Store as-is up to 9 chars; analytics that bin by ZIP3 will break |
| `address.text` only (no structured fields) | Store in `location_source_value`; leave structured fields null |
| Geocoding extension absent | `latitude`/`longitude` null |
| Multiple distinct `home` addresses across `Patient` updates | OMOP only stores one. Last write wins; address history is lost. |
| Care site address (when `Patient.managingOrganization.address` is needed) | Out of scope here — handle in Organization → care_site mapper |
| Same address shared by multiple persons (e.g., family) | Implementations vary: deduplicate (single `location_id` shared) or duplicate (one row per person). Both are valid OMOP. |

## Implementation Comparison

| Project | Creates location row? | Dedup? | Geolocation | Notes |
|---|---|---|---|---|
| HL7 IG | n/a (Location.fsh defines fields, no FML) | — | — | Logical model only |
| omoponfhir | Yes | Yes (search by address_1+city+state+zip) | No | Bidirectional; `searchAndUpdate` pattern |
| FhirToCdm | Yes (separate table built per Person) | No | No | Per-patient row, no dedup |
| ETL-German | Yes (via `post_process_map`) | Yes (post-processed) | No | Deferred to PostProcessTask |
| NACHC | Default to `location_id = 1` | n/a | No | Address not actually mapped |
| omopfhirmap | **No** | — | — | Address not mapped |
| mends-on-fhir | Partial (state, zip only) | n/a | No | Reverse direction |
| GT-FHIR | Yes (search-or-create) | Yes | No | Legacy DSTU2 |
| fhir-to-omop-demo | **No** | — | — | `null` for `location_id` in Patient.jq |
| fhir-x-omop | No | — | — | Not in mapping |

## Sources

- HL7 IG logical model: `refs/refs/fhir-omop-ig/input/fsh/Location.fsh`
- omoponfhir Java (search-or-create + bidirectional): `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java`
- FhirToCdm C#: `refs/refs/FhirToCdm/FhirToCdmMappings.cs` `CreatePersonAndLocations()` lines 20-170 (location built inline per person)
- ETL-German Java (deferred location): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/PatientMapper.java` lines 293-334 — `dataOne = "zip;city;country"`, `dataTwo = "lines;state"`, `omopTable = "LOCATION"`
- GT-FHIR Java (DSTU2 legacy): `refs/refs/GT-FHIR/gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/Person.java` lines 382-458
- OMOP CDM v5.4 location spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
