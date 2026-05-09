# Administrative Resources → OMOP Mapping

FHIR administrative resources (`Practitioner`, `PractitionerRole`, `Organization`, `Location`) map to OMOP's provider infrastructure tables. These are reference targets -- clinical event tables (visit_occurrence, condition_occurrence, etc.) carry foreign keys to `provider`, `care_site`, and `location`.

## Source FHIR Resources → OMOP Tables

| FHIR Resource | OMOP Table | Notes |
|---|---|---|
| `Practitioner` | `provider` | Individual healthcare provider |
| `PractitionerRole` | `provider` | Provider with specialty/role context (enriches Practitioner's row) |
| `Organization` | `care_site` | Healthcare facility or department |
| `Location` | `location` | Physical address (also used by Patient, also produces care_site rows in some implementations) |

## Mapping Strategy

1. **Practitioner → provider.** Core mapping: `Practitioner.name` → `provider_name`, `Practitioner.identifier` → `provider_source_value`. Specialty comes from `PractitionerRole.specialty` (not on Practitioner itself). NPI (`http://hl7.org/fhir/sid/us-npi`) is the standard identifier for US providers.

2. **PractitionerRole → provider enrichment.** PractitionerRole carries specialty and organization context. If PractitionerRole is the reference source (rather than Practitioner directly), extract the Practitioner reference for the provider record and use `specialty` → `specialty_concept_id`.

3. **Organization → care_site.** `Organization.name` → `care_site_name`. `Organization.type` → `place_of_service_concept_id` (requires vocabulary mapping via OrganizationType codes or CMS Place of Service). `Organization.address` → linked `location` row via `care_site.location_id`.

4. **Location → location.** Shared table -- also populated by Patient.address. `Location.address` → `address_1`, `address_2`, `city`, `state`, `zip`, `county`. `Location.position` → `latitude`, `longitude`.

5. **Processing order.** Admin resources must be processed before clinical resources so that `provider_id`, `care_site_id`, and `location_id` foreign keys can be resolved. Recommended order: Location → Organization (care_site) → Practitioner/PractitionerRole (provider) → clinical resources.

## Per-Table Docs

- [provider](./provider.md) -- Practitioner/PractitionerRole → provider
- [care_site](./care_site.md) -- Organization → care_site

## Reference Implementations

- **fhir-omop-ig** (HL7, FSH) -- Normative IG logical models. `refs/refs/fhir-omop-ig/input/fsh/Provider.fsh` (20 lines): defines all 13 provider fields. `refs/refs/fhir-omop-ig/input/fsh/CareSite.fsh` (13 lines): defines all 6 care_site fields. No FML mapping for admin resources yet. Status: active ballot, draft.

- **omoponfhir-v54** (Georgia Tech, Java) -- Bidirectional. Most complete admin resource handling.
  - `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPractitioner.java` (396 lines): name formatting, NPI extraction, gender mapping, address → care_site creation, deduplication by providerSourceValue.
  - `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopOrganization.java` (279 lines): Organization ↔ care_site bidirectional mapping, identifier-based deduplication, address → location resolution, OrganizationType → concept mapping via `OmopConceptMapping` enum (12 codes).
  - `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopConceptMapping.java` (250 lines): enum-based concept mappings for gender (lines 30-34), OrganizationType (lines 39-50), and methods `omopForAdministrativeGenderCode()` (lines 86-105), `omopForOrganizationTypeCode()` (lines 107-147).
  - Status: stale (2022), but most feature-complete admin mapper.

- **fhir-to-omop-demo** (jq) -- FHIR → OMOP one-way.
  - `refs/refs/fhir-to-omop-demo/demo/translate/map/Practitioner.jq` (54 lines): provider row with NPI, gender_concept_id. Also creates person row (unusual).
  - `refs/refs/fhir-to-omop-demo/demo/translate/map/PractitionerRole.jq` (80 lines): specialty extraction, merge-based approach where PractitionerRole enriches provider row. care_site_id from location_ids[0].
  - `refs/refs/fhir-to-omop-demo/demo/translate/map/Organization.jq` (22 lines): minimal care_site output. `care_site_id = .id`, `care_site_name = .name`, place_of_service = null.
  - `refs/refs/fhir-to-omop-demo/demo/translate/map/Location.jq` (41 lines): creates BOTH a location row AND a care_site row (with location_id) from the Location resource. care_site_id comes from `managingOrganization`.
  - Status: maintained, good reference for Synthea bundles.

- **fhir-x-omop** (Python) -- Bidirectional with partial coverage.
  - `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/provider.py` (38 lines): Practitioner → provider. Name formatting ("given family"), NPI extraction by system, gender source (uppercased), year_of_birth, specialty fallback to qualification.
  - No dedicated Organization → care_site mapper. care_site_id is referenced indirectly in `to_omop/visit_occurrence.py` line 36 (from `Encounter.serviceProvider.reference`) and `to_fhir/encounter.py` line 81 (reverse: care_site_id → Organization reference).
  - Status: early WIP, no care_site population.

- **ETL-German-FHIR-Core** (OHDSI, Java) -- FHIR → OMOP for German MII profiles.
  - No dedicated Organization mapper or Practitioner mapper. Organization-to-care_site mapping is handled via a static CSV file pre-loaded at job startup.
  - `refs/refs/ETL-German-FHIR-Core/src/main/resources/CARE_SITE.csv` (487 rows): pre-defined German FAB department codes mapped to specialty concept IDs.
  - `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/listeners/FhirToOmopJobListener.java` lines 398-432: loads CSV into care_site table at job startup.
  - `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/EncounterDepartmentCaseMapper.java` (706 lines): resolves care_site_id from Encounter.serviceType FAB code via `DbMappings.findCareSiteId` (lines 601-612).
  - `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/model/omop/CareSite.java` (56 lines): JPA entity model.
  - `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/repository/CareSiteRepository.java` (34 lines): repository with `careSitesMap()` keyed by source_value.
  - Status: maintained, German-specific.

- **FhirToCdm** (OHDSI, C#) -- No dedicated admin resource mappers.
  - `refs/refs/FhirToCdm/FhirToCdmMappings.cs` (624 lines): creates Provider from `Encounter.serviceProvider.Display` (lines 216-224) during visit_occurrence creation. No care_site table population. No Organization processing.
  - Status: low activity, minimal admin coverage.

- **NACHC-fhir-to-omop** (Java) -- No Organization or Practitioner mappers.
  - `refs/refs/NACHC-fhir-to-omop/src/main/resources/sqlserver/omop/5.4/location/create-location-and-caresite-dummy-records.sql` (50 lines): creates a single dummy care_site (id=1, name="Not Available"), dummy provider (id=1), and dummy location (id=1). All references default to these fixed IDs.
  - `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/tools/build/impl/CreateLocationAndCareSiteDummyRecords.java` (22 lines): Java loader for the SQL.
  - Status: active, but admin resources are not mapped from FHIR data.

## Status in This Project

Not yet implemented. No admin resource mappers exist in `src/mapper/`. The existing clinical mappers (`patient.ts`, `encounter.ts`, `condition.ts`, `observation.ts`, `medication.ts`, `medication-statement.ts`, `allergy-intolerance.ts`) resolve `provider_id` and `care_site_id` via stub IDs or deferred reference resolution. Implementing `provider` and `care_site` mappers would enable proper foreign key resolution from:

- `person.care_site_id` (from `Patient.managingOrganization`)
- `person.provider_id` (from `Patient.generalPractitioner`)
- `visit_occurrence.care_site_id` (from `Encounter.serviceProvider`)
- `visit_occurrence.provider_id` (from `Encounter.participant[].individual`)
- `condition_occurrence.provider_id` (from `Condition.recorder` / `Condition.asserter`)
- `observation.provider_id` (from `Observation.performer[]`)
- `drug_exposure.provider_id` (from `MedicationRequest.requester`)
