# Organization → care_site

OMOP CDM v5.4. The `care_site` table contains a list of uniquely identified institutional (physical or organizational) units where healthcare delivery is practiced (offices, wards, hospitals, clinics, etc.). FHIR `Organization` maps here. FHIR `Location` can also contribute care_site rows in some implementations (see fhir-to-omop-demo).

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `care_site_id` | integer | Yes (PK) | Surrogate key. Assign an ID to each combination of a location and nature of the site. omoponfhir uses `IdMapping` (FHIR ID ↔ OMOP ID, lines 117-118). fhir-to-omop-demo uses `Organization.id` directly (line 14). ETL-German pre-loads from CSV with sequential IDs (CARE_SITE.csv line 1+). |
| `Organization.name` | `care_site_name` | string → varchar(255) | No | The name of the care site as it appears in the source data. omoponfhir sets via `careSite.setCareSiteName(myOrganization.getName())` (line 246). fhir-to-omop-demo uses `.name` (line 15). ETL-German pre-loads from CSV (e.g., "Innere Medizin", "Kardiologie"). |
| `Organization.type[0].coding[0]` | `place_of_service_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | High-level characterization of the care site. Should be a concept from the Visit domain. omoponfhir maps via `OmopConceptMapping.omopForOrganizationTypeCode()` (lines 253-263). fhir-to-omop-demo sets null (line 16). ETL-German pre-loads concept IDs from CSV (e.g., 4318944, 45765841). 0 if unmapped. |
| `Organization.address` → Location | `location_id` | ref → integer (FK LOCATION) | No | The location_id from the LOCATION table representing the physical location of the care site. omoponfhir resolves via `AddressUtil.searchAndUpdate()` on `Organization.address[0]` (lines 240, 267-275). fhir-to-omop-demo sets null from Organization, but creates a care_site row from Location.jq with `location_id = Location.id` (Location.jq line 36). ETL-German does not set location_id. |
| `Organization.identifier[0].value` or `Organization.name` | `care_site_source_value` | varchar(50) | No | The identifier of the care site as it appears in the source data. Could be separate from the care site name. omoponfhir uses `identifierFirstRep.value` (lines 234-238). fhir-to-omop-demo uses `.identifier[0].value` via `synthea_id` (line 18). ETL-German uses FAB department codes (e.g., "0100", "0300"). |
| `Organization.type[0]` text or code | `place_of_service_source_value` | varchar(50) | No | The source code for the place of service as it appears in the source data. Raw organization type code before vocabulary mapping. fhir-to-omop-demo sets null (line 19). ETL-German does not populate this field. |

Fields with no FHIR source: none -- all 6 `care_site` fields have a potential FHIR source.

FHIR fields with no OMOP target: `Organization.identifier` (partially used for `care_site_source_value`), `Organization.active`, `Organization.alias`, `Organization.telecom`, `Organization.partOf` (parent organization -- see hierarchy section), `Organization.contact`, `Organization.endpoint`.

## Vocabulary Mappings

### Organization Type (`Organization.type` → `place_of_service_concept_id`)

The HL7 FHIR OrganizationType CodeSystem (`http://terminology.hl7.org/CodeSystem/organization-type`) provides coarse-grained organization categories. omoponfhir maps these via the `OmopConceptMapping` enum (OmopConceptMapping.java lines 39-50):

| FHIR OrganizationType Code | Display | OMOP concept_id | OMOP concept_name | Notes |
|---|---|---|---|---|
| `prov` | Healthcare Provider | 4107295 | Healthcare Provider | General healthcare delivery organization |
| `dept` | Hospital Department | 4318944 | Department | Organizational unit within a hospital |
| `team` | Organizational Team | 4217012 | Team | Care team or workgroup |
| `govt` | Government | 4195901 | Government | Government body |
| `ins` | Insurance Company | 8844 | Other Place of Service | No exact match; defaults to generic |
| `edu` | Educational Institute | 4030303 | Educational Institution | Teaching hospital, medical school |
| `reli` | Religious Institution | 8844 | Other Place of Service | No exact match |
| `crs` | Clinical Research Sponsor | 8844 | Other Place of Service | Clinical trial sponsor |
| `cg` | Community Group | 4127377 | Community Health Care | Community-based care |
| `bus` | Non-Healthcare Business | 8844 | Other Place of Service | Non-healthcare entity |
| `other` | Other | 8844 | Other Place of Service | Catch-all |
| (null/absent) | — | 8844 | Other Place of Service | omoponfhir default for unknown type |

### CMS Place of Service Concepts (Visit Domain)

When the source vocabulary is CMS Place of Service (US claims data) or similar, use standard Visit domain concepts:

| Place of Service | OMOP concept_id | OMOP concept_name | Common FHIR Organization.type |
|---|---|---|---|
| Inpatient Hospital | 8717 | Inpatient Hospital | `prov` with class context |
| Office | 8940 | Office | `prov` (outpatient) |
| Emergency Room - Hospital | 8870 | Emergency Room - Hospital | `prov` with ER context |
| Pharmacy | 8975 | Pharmacy | custom code |
| Independent Laboratory | 8951 | Independent Laboratory | custom code |
| Ambulatory Surgical Center | 8883 | Ambulatory Surgical Center | `prov` |
| Home | 8536 | Home | — |
| Skilled Nursing Facility | 8676 | Skilled Nursing Facility | `prov` |
| Telehealth | 581399 | Telehealth | — |
| (unknown) | 0 | No matching concept | — |

### German MII Department Codes (ETL-German-FHIR-Core)

ETL-German uses a pre-loaded CSV file (`CARE_SITE.csv`, 487 rows) mapping German FAB department codes to OMOP specialty concepts rather than Visit domain concepts. Example mappings:

| FAB Code | Department Name | OMOP concept_id | OMOP concept_name |
|---|---|---|---|
| 0100 | Innere Medizin | 45765841 | Internal Medicine |
| 0300 | Kardiologie | 45765807 | Cardiology |
| 0200 | Geriatrie | 4184919 | Geriatric Medicine |
| 1200 | Neonatologie | 4192653 | Neonatology |
| 1500 | Allgemeine Chirurgie | 45765829 | General Surgery |
| 2800 | Neurologie | 45773131 | Neurology |
| 3400 | Dermatologie | 45773123 | Dermatology |
| 3600 | Intensivmedizin | 4148828 | General/Family Practice |
| 0000-0004 | Pseudo-Fachabteilung | 4318944 | Department |

Note: ETL-German maps to Specialty domain concepts (e.g., 45765841 = "Internal Medicine"), not Visit domain concepts (e.g., 8717 = "Inpatient Hospital"). This is a deviation from the OMOP CDM recommendation to use Visit domain concepts for `place_of_service_concept_id`. The OMOP CDM spec states: "Choose the concept in the visit domain that best represents the setting."

## Reference Resolution

### Organization.address → location_id

Two strategies are used by reference implementations:

1. **omoponfhir approach (address-based):** Resolve `Organization.address[0]` to a Location row. `AddressUtil.searchAndUpdate()` searches for an existing location matching the address components (address_1, city, state, zip) and creates one if not found. The returned `location_id` is assigned to `care_site.location_id` (OmopOrganization.java lines 240, 267-275). This is run twice in the code -- once at line 240 for the first address and again in the loop at lines 267-275; the loop breaks after the first address since OMOP stores only one location per care site.

2. **fhir-to-omop-demo approach (Location resource-based):** The Organization mapper does NOT set `location_id` (sets null, line 17). Instead, the Location.jq mapper creates a SECOND care_site row from the FHIR Location resource, using `Location.managingOrganization` as the `care_site_id` and `Location.id` as the `location_id` (Location.jq lines 32-38). This means a single Organization can produce two care_site rows -- one from the Organization resource (with name and source value) and one from the Location resource (with location_id). This may cause duplicates if not reconciled.

### Organization.partOf → Hierarchy

FHIR `Organization.partOf` creates a tree hierarchy (e.g., Hospital → Department → Unit). OMOP `care_site` is a flat table -- there is no `parent_care_site_id` column. Approaches:

1. **Map all levels as flat rows** (most common). Each Organization in the hierarchy becomes its own care_site row. No parent-child relationship is preserved. omoponfhir uses this approach. The `partof` include parameter is supported for FHIR read operations (constructResource lines 167-179) but has no effect on the OMOP representation.

2. **Map only leaf-level organizations.** Only the most specific level (e.g., ward, unit) is mapped. Parent organizations are ignored. This reduces duplicate care_site rows but loses organizational context.

3. **Concatenate hierarchy into care_site_name.** E.g., "General Hospital > Cardiology Dept > ICU". Preserves context in a single field but requires resolving all partOf references before writing.

4. **ETL-German approach.** Ignores Organization resources entirely. Care sites are pre-loaded from a static CSV file keyed by German FAB department code. The Encounter mapper resolves `care_site_id` by looking up the FAB code from `Encounter.serviceType.coding` in the `DbMappings.findCareSiteId` map (EncounterDepartmentCaseMapper.java lines 601-612).

### References from other OMOP tables

The `care_site_id` column appears in several OMOP tables:

| OMOP Table | Field | FHIR Source |
|---|---|---|
| `person` | `care_site_id` | `Patient.managingOrganization` |
| `provider` | `care_site_id` | `PractitionerRole.organization` or Practitioner.address → care_site |
| `visit_occurrence` | `care_site_id` | `Encounter.serviceProvider` |
| `visit_detail` | `care_site_id` | `Encounter.location[].location` (department-level encounter) |

These references require the care_site row to exist before the referencing row is inserted. Processing order: Organization/Location → care_site, then Patient/Practitioner/Encounter.

## Edge Cases

| Case | Handling |
|---|---|
| Missing Organization.name | `care_site_name` = null. OMOP allows null. Use `care_site_source_value` (identifier) for traceability. omoponfhir passes null through without guard (line 246). |
| No Organization.type | `place_of_service_concept_id` = 0, `place_of_service_source_value` = null. omoponfhir throws FHIRException on null type code (OmopConceptMapping.java line 108-109) and catches it silently (OmopOrganization.java line 260-262), leaving the field unset. |
| Organization.partOf hierarchy | Flat mapping -- each level becomes a separate care_site row. No parent linkage. See hierarchy section above. |
| Duplicate organizations (same identifier, different resources) | Deduplicate by `care_site_source_value`. omoponfhir searches by `careSiteSourceValue` column to find existing records before creating new ones (lines 122-137). fhir-to-omop-demo does not deduplicate -- will produce duplicate rows. |
| Multiple Organization.type[] entries | omoponfhir iterates all types but uses only the first coding's code for concept lookup (lines 249-264). OMOP supports only one `place_of_service_concept_id` per care_site. Pick the most specific or first entry. |
| Organization referenced but not in bundle | Deferred resolution. Create a stub care_site row with `care_site_source_value` = reference string. Populate name/type later when the Organization resource arrives. NACHC creates a single "Not Available" dummy care_site (id=1) for all unresolved references. |
| Organization.address has multiple addresses | OMOP supports one location per care_site. omoponfhir breaks after the first address in the loop (line 274). Pick the primary/first address. |
| Organization.identifier absent | `care_site_source_value` may be null. omoponfhir will throw NullPointerException on `identifier.getValue().isEmpty()` check (line 235) if identifiers list is empty. Use `Organization.name` or `Organization.id` as fallback. |
| FHIR Location resource references Organization | fhir-to-omop-demo creates a care_site row from Location.jq using `managingOrganization` as `care_site_id` and `Location.id` as `location_id` (lines 32-38). This produces a second care_site row alongside the one from Organization.jq. Reconciliation needed. |
| Organization.active = false | Most implementations ignore this flag and map inactive organizations. Consider filtering in ETL preprocessing or flagging for review. OMOP has no "active" concept for care_site. |
| Very long care_site_name (>255 chars) | Truncate to 255 characters. `care_site_name` is varchar(255). German department names with hierarchy (e.g., "Intensivmedizin/Schwerpunkt Frauenheilkunde und Geburtshilfe") can approach this limit. |

## Implementation Comparison

| Aspect | HL7 IG (FSH) | omoponfhir-v54 | fhir-to-omop-demo | fhir-x-omop | ETL-German | NACHC |
|---|---|---|---|---|---|---|
| Direction | F↔O (logical model) | F↔O (bidirectional) | F→O | F→O (+ O→F) | F→O | F→O |
| Source resource | Organization | Organization | Organization + Location | Encounter.serviceProvider | Encounter.serviceType (FAB code) | (dummy record) |
| `care_site_id` strategy | 1..1 integer | IdMapping (FHIR↔OMOP) | `Organization.id` | `int(reference.split('/')[1])` | sequential from CSV | fixed id=1 |
| `care_site_name` | 0..1 string | `Organization.getName()` | `.name` | not mapped | from CSV (German dept names) | "Not Available" |
| `place_of_service_concept_id` | 0..1 code (Visit domain) | `OmopConceptMapping` enum (12 codes) | null | not mapped | from CSV (specialty concepts) | null |
| `location_id` | 0..1 FK Location | `AddressUtil.searchAndUpdate()` on address | null (from Org); `.id` (from Location) | not mapped | not set | fixed id=1 |
| `care_site_source_value` | 0..1 string | `identifierFirstRep.value` | `.identifier[0].value` | not mapped | FAB code (e.g., "0100") | null |
| `place_of_service_source_value` | 0..1 string | not explicitly set | null | not mapped | not set | null |
| Deduplication | — | search by careSiteSourceValue | none | none | pre-loaded (no duplicates) | single dummy row |
| Hierarchy handling | — | flat (all levels) | flat | — | N/A (no Org processing) | N/A |
| Organization.type mapping | — | 12 OrganizationType → concept | not mapped | — | German FAB → specialty | — |

## Sources

- HL7 IG FSH logical model (normative): `refs/refs/fhir-omop-ig/input/fsh/CareSite.fsh`
  - All 6 care_site fields defined: lines 1-13
  - `place_of_service_concept_id` defined as 0..1 code: line 10
  - `location_id` defined as 0..1 Reference(Location): line 11
- omoponfhir-v54 Java (bidirectional, 279 lines): `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopOrganization.java`
  - OMOP → FHIR (constructFHIR): lines 79-109
  - FHIR → OMOP entry point (toDbase): lines 112-151
  - Deduplication by careSiteSourceValue: lines 122-137
  - constructOmop (FHIR→OMOP field mapping): lines 219-278
  - Identifier → care_site_source_value: lines 234-238
  - Address → location via AddressUtil: lines 240, 267-275
  - Organization.name → care_site_name: line 246
  - Organization.type → place_of_service via OmopConceptMapping: lines 249-264
  - partOf include support (FHIR read only): lines 163-183
- omoponfhir-v54 concept mapping: `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopConceptMapping.java`
  - OrganizationType enum (PROV/DEPT/TEAM/GOVT/INS/EDU/RELI/CRS/CG/BUS/OTHER/NULL): lines 39-50
  - `omopForOrganizationTypeCode()` switch: lines 107-147
  - Default for unknown type: 8844 (Other Place of Service): line 146
- fhir-to-omop-demo jq (Organization, 22 lines): `refs/refs/fhir-to-omop-demo/demo/translate/map/Organization.jq`
  - care_site row output: lines 11-22
  - care_site_id = `.id`: line 14
  - care_site_name = `.name`: line 15
  - place_of_service_concept_id = null: line 16
  - care_site_source_value = `.identifier[0].value` via `synthea_id`: lines 6-8, 18
- fhir-to-omop-demo jq (Location, 41 lines): `refs/refs/fhir-to-omop-demo/demo/translate/map/Location.jq`
  - SECOND care_site row from Location resource: lines 31-39
  - care_site_id from `managingOrganization` reference: line 10, 33
  - location_id = `.id` (Location.id): line 36
- fhir-x-omop Python: no dedicated care_site/Organization mapper
  - care_site_id referenced in visit_occurrence mapper: `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/visit_occurrence.py` line 36
  - Reverse: care_site_id → Organization reference: `refs/refs/fhir-x-omop/fhir_x_omop/to_fhir/encounter.py` line 81
- ETL-German-FHIR-Core (Java):
  - CareSite model: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/model/omop/CareSite.java` (56 lines)
  - CareSite CSV (487 rows, German FAB department codes): `refs/refs/ETL-German-FHIR-Core/src/main/resources/CARE_SITE.csv`
  - CSV loading in job listener: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/listeners/FhirToOmopJobListener.java` lines 398-432
  - CareSite repository (keyed by source_value): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/repository/CareSiteRepository.java` lines 15-34
  - DbMappings findCareSiteId map: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/DbMappings.java` line 48
  - Encounter → care_site_id lookup by FAB code: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/EncounterDepartmentCaseMapper.java` lines 601-612
- NACHC-fhir-to-omop (Java):
  - Dummy care_site creation (id=1, "Not Available"): `refs/refs/NACHC-fhir-to-omop/src/main/resources/sqlserver/omop/5.4/location/create-location-and-caresite-dummy-records.sql` lines 1-16
  - Loader class: `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/tools/build/impl/CreateLocationAndCareSiteDummyRecords.java` (22 lines)
  - CareSite DVO model: `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/omop/yaorma/dvo/CareSiteDvo.java`
- FhirToCdm (OHDSI, C#, 624 lines): `refs/refs/FhirToCdm/FhirToCdmMappings.cs`
  - No dedicated Organization/care_site mapper. Provider created from `Encounter.serviceProvider.Display` (lines 216-224). No care_site table population.
- OMOP CDM v5.4 care_site spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 Organization: https://hl7.org/fhir/R4/organization.html
- FHIR R4 Location: https://hl7.org/fhir/R4/location.html
- OMOP CDM docs care_site: https://ohdsi.github.io/CommonDataModel/cdm54.html#CARE_SITE
- THEMIS conventions for place_of_service: https://ohdsi.github.io/Themis/tag_place_of_service.html
