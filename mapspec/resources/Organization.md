# Organization → OMOP Mapping

FHIR `Organization` represents a healthcare facility, department, or other formally recognized group (hospitals, clinics, payers, departments, teams). It maps to OMOP CDM v5.4 `care_site`.

## Source FHIR Resource → OMOP Table

| FHIR Resource | OMOP Table | Notes |
|---|---|---|
| `Organization` | `care_site` | Healthcare facility or department |

Note: FHIR `Location` can also contribute care_site rows in some implementations (notably fhir-to-omop-demo).

## Mapping Strategy

- `Organization.name` → `care_site_name`.
- `Organization.type` → `place_of_service_concept_id` (requires vocabulary mapping via OrganizationType codes or CMS Place of Service).
- `Organization.address` → linked `location` row via `care_site.location_id`.
- `Organization.identifier[0].value` → `care_site_source_value` for traceability and deduplication.
- `Organization.partOf` creates a tree hierarchy in FHIR. OMOP `care_site` is a flat table -- there is no `parent_care_site_id` column. The hierarchy is typically flattened: each Organization in the tree becomes its own care_site row, with no parent linkage preserved.
- Processing order: Location → Organization (care_site) → Practitioner/PractitionerRole → clinical resources.

## Reference Implementations

- **omoponfhir-v54** (Georgia Tech, Java) -- Bidirectional. Most complete Organization handling.
  - `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopOrganization.java` (279 lines): Organization ↔ care_site bidirectional mapping, identifier-based deduplication, address → location resolution, OrganizationType → concept mapping via `OmopConceptMapping` enum (12 codes).
  - `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopConceptMapping.java` (250 lines): `omopForOrganizationTypeCode()` method (lines 107-147).
  - Status: stale (2022), but most feature-complete admin mapper.

- **fhir-to-omop-demo** (jq) -- FHIR → OMOP one-way.
  - `refs/refs/fhir-to-omop-demo/demo/translate/map/Organization.jq` (22 lines): minimal care_site output. `care_site_id = .id`, `care_site_name = .name`, `place_of_service_concept_id = null`.
  - Status: maintained, good reference for Synthea bundles.

- **ETL-German-FHIR-Core** (OHDSI, Java) -- CSV-based, does NOT process Organization resources directly.
  - No dedicated Organization mapper. Care sites are pre-loaded from a static CSV file at job startup.
  - `refs/refs/ETL-German-FHIR-Core/src/main/resources/CARE_SITE.csv` (487 rows): pre-defined German FAB department codes mapped to specialty concept IDs.
  - `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/listeners/FhirToOmopJobListener.java` lines 398-432: loads CSV into care_site table at job startup.
  - Status: maintained, German-specific.

## Status in This Project

Not yet implemented. No `care_site` mapper exists in `src/mapper/`. Implementing this mapper would enable proper foreign key resolution from `person.care_site_id`, `visit_occurrence.care_site_id`, `provider.care_site_id`, and `visit_detail.care_site_id`.
