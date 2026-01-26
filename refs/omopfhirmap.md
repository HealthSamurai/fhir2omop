# omopfhirmap

## Project Information

- **Name**: omopfhirmap
- **URL**: https://github.com/E-Health/omopfhirmap
- **Author**: Bell Raj Eapen (Cane Health)
- **License**: GNU General Public License v3.0 (GPLv3)

## Purpose/Description

omopfhirmap is a command-line tool for bidirectional mapping between OHDSI OMOP CDM (Common Data Model) and HL7 FHIR R4. It enables:

1. **OMOP to FHIR**: Export an ATLAS-defined cohort from an OMOP database to a FHIR collection bundle (JSON file)
2. **FHIR to OMOP**: Import a FHIR bundle into an existing OMOP CDM database, creating new records and ignoring duplicates

Unlike GT-FHIR2 (OMOP on FHIR project), omopfhirmap does NOT expose OMOP as FHIR endpoints - it operates as a batch conversion tool.

## Key Features

- Bidirectional mapping (OMOP <-> FHIR)
- Works with ATLAS cohort definitions
- Multi-threaded processing for performance
- Duplicate detection when importing to OMOP
- FHIR R4 support via HAPI FHIR library (v4.2.0)
- Spring Boot application with JPA database abstraction
- Supports PostgreSQL (primary) and H2 (testing)
- Configurable system identifiers for OMOP keys in FHIR resources

## Use Cases

- Export a cohort to FHIR-based analytics tools
- Incremental ETL: Load new FHIR resources into OMOP CDM databases

## FHIR Resources Supported

Currently implemented:
- **Patient** (fully mapped)

Planned/Stubbed (infrastructure exists but mapping not implemented):
- Observation
- MedicationStatement/MedicationRequest (from DrugExposure)
- DiagnosticReport/Observation (from Measurement)
- Procedure
- Encounter (from VisitOccurrence)

## OMOP Tables Mapped

| OMOP Table | FHIR Resource | Status |
|------------|---------------|--------|
| person | Patient | Implemented |
| cohort | (used for selection) | Implemented |
| observation | Observation | Stubbed |
| measurement | Observation | Stubbed |
| drug_exposure | MedicationStatement | Stubbed |
| procedure_occurrence | Procedure | Stubbed |
| visit_occurrence | Encounter | Stubbed |

### Patient/Person Mapping Details

**OMOP Person -> FHIR Patient**:
- `gender_concept_id` -> `gender` (8507=male, 8532=female)
- `year_of_birth`, `month_of_birth`, `day_of_birth` -> `birthDate`
- `provider_id` -> `generalPractitioner` (Reference)
- `care_site_id` -> `managingOrganization` (Reference)
- OMOP `person_id` added as FHIR Identifier

**FHIR Patient -> OMOP Person**:
- `gender` -> `gender_concept_id`
- `birthDate` -> `year_of_birth`, `month_of_birth`, `day_of_birth`
- `generalPractitioner` -> `provider_id`
- `managingOrganization` -> `care_site_id`
- FHIR `id` -> `person_source_value`

Note: Race and ethnicity mapping is TODO.

## Technology Stack

- **Language**: Java 13+
- **Framework**: Spring Boot 2.6.3
- **Build Tool**: Maven
- **FHIR Library**: HAPI FHIR 4.2.0 (R4)
- **Database**: PostgreSQL (production), H2 (testing)
- **ORM**: Spring Data JPA / Hibernate
- **Other**: Lombok

## How to Build

```bash
mvn clean install spring-boot:repackage
```

## CLI Commands

### General Usage

```bash
java -jar omopfhirmap-<version>.jar <function> <source> <destination> --spring.config.location=<properties-file>
```

### Available Functions

| Function | Description |
|----------|-------------|
| `help` | Display help information |
| `tofhirbundle` | Convert OMOP cohort to FHIR bundle |
| `tofhirserver` | Send to FHIR server (not implemented) |
| `toomop` | Import FHIR bundle to OMOP |

### Examples

**Show help:**
```bash
java -jar target/omopfhirmap-0.0.1.jar help
```

**Export OMOP cohort to FHIR bundle:**
```bash
java -jar target/omopfhirmap-0.0.1.jar tofhirbundle 2 test-fhir.json --spring.config.location=application.properties
```
This exports cohort ID 2 from ATLAS to `test-fhir.json`.

**Import FHIR bundle to OMOP:**
```bash
java -jar target/omopfhirmap-0.0.1.jar toomop test-fhir.json 3 --spring.config.location=application.properties
```
This imports the FHIR bundle and creates a new cohort with ID 3.

## Configuration (application.properties)

```properties
spring.main.banner-mode=off
logging.level.org.springframework=ERROR
logging.level.root=ERROR

spring.jpa.hibernate.ddl-auto=none

spring.datasource.initialization-mode=always
spring.datasource.platform=postgres
spring.datasource.url=jdbc:postgresql://localhost:5432/username_db?currentSchema=synpuf_results,synpuf5,ohdsi
spring.datasource.username=username
spring.datasource.password=secret

spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation=true

# Used for saving the OMOP identifier in FHIR resources
omopfhir.system.name=mySystem
omopfhir.caresite.name=myCareSite
```

## Architecture

The application follows a layered architecture:

1. **Models** (`models/`): JPA entities mapping to OMOP CDM tables
2. **Repositories** (`repositories/`): Spring Data JPA repositories
3. **Services** (`services/`): Business logic layer
4. **Fetchers** (`fetchers/`): Multi-threaded data retrieval from OMOP
5. **Mappers** (`mapping/`): Bidirectional FHIR <-> OMOP conversion
6. **Utils** (`utils/`): FHIR bundle processing, file handling

## Limitations

- Only Patient/Person mapping is fully implemented
- Race and ethnicity mapping not yet implemented
- `tofhirserver` function not implemented
- Designed for batch processing, not real-time API

## Related Projects

- [pyomop](https://github.com/dermatologist/pyomop) - Python package for OMOP CDM
- [omopcdm-dot-net](https://github.com/dermatologist/omopcdm-dot-net) - .NET library for OMOP CDM
- [gocdm](https://github.com/E-Health/gocdm) - Go library for OMOP CDM
- [csv-fhir-mapper](https://github.com/E-Health/goscar-export) - CSV to FHIR mapper

---

## Patient ↔ OMOP PERSON Mapping Details (Code Level)

**Source**: [`src/main/java/com/canehealth/omopfhirmap/mapping/PatientMapper.java`](https://github.com/E-Health/omopfhirmap/blob/main/src/main/java/com/canehealth/omopfhirmap/mapping/PatientMapper.java)

**Note**: This project provides **bidirectional mapping** in the same mapper class.

### OMOP PERSON → FHIR Patient (`mapOmopToFhir()`)

| FHIR Patient Field | OMOP PERSON Source | Logic |
|--------------------|-------------------|-------|
| `identifier[]` | `person_id` | Added as identifier with configurable system |
| `gender` | `gender_concept_id` | 8532→FEMALE, 8507→MALE, else→UNKNOWN |
| `birthDate` | `year_of_birth`, `month_of_birth`, `day_of_birth` | Combined via Calendar (defaults to 1 if null) |
| `generalPractitioner[]` | `provider_id` | Reference to Practitioner (if not null/0) |
| `managingOrganization` | `care_site_id` | Reference to Organization (if not null/0) |

### FHIR Patient → OMOP PERSON (`mapFhirToOmop()`)

| OMOP PERSON Field | FHIR Patient Source | Logic |
|-------------------|---------------------|-------|
| `person_source_value` | `Patient.id` | Direct assignment |
| `year_of_birth` | `Patient.birthDate` | `Calendar.get(Calendar.YEAR)` |
| `month_of_birth` | `Patient.birthDate` | `Calendar.get(Calendar.MONTH) + 1` |
| `day_of_birth` | `Patient.birthDate` | `Calendar.get(Calendar.DAY_OF_MONTH)` |
| `gender_concept_id` | `Patient.gender` | FEMALE→8532, MALE→8507, else→0 |
| `provider_id` | `Patient.generalPractitioner[0]` | Extracted from Reference |
| `care_site_id` | `Patient.managingOrganization` | Extracted from Reference |
| `race_concept_id` | (not mapped) | Set to 0 |
| `ethnicity_concept_id` | (not mapped) | Set to 0 |

### Gender Concept Mapping

```java
// OmopConstants.java
public static Integer OMOP_MALE = 8507;
public static Integer OMOP_FEMALE = 8532;
```

| OMOP Concept ID | FHIR Gender | Direction |
|-----------------|-------------|-----------|
| 8507 | `male` | ↔ |
| 8532 | `female` | ↔ |
| other | `unknown` | OMOP→FHIR |
| (any other) | 0 | FHIR→OMOP |

### Duplicate Detection

When importing FHIR to OMOP, the mapper checks for existing records:
```java
List<Person> persons = personService.listByPersonAndPeriod(
    Integer.parseInt(myId), today, today);
if (persons.isEmpty()) {
    // Create new record
} else {
    // Skip (return null)
}
```

### Identifier System

The OMOP `person_id` is stored in FHIR as an identifier using a configurable system:
```properties
omopfhir.system.name=mySystem
```

When importing, only patients with matching identifier system are processed.

### Notes

- **FHIR Version**: R4 (via HAPI FHIR 4.2.0)
- **Race/Ethnicity**: Not mapped (TODO in code comments)
- **Duplicate handling**: Existing records are skipped during import
- **Reference parsing**: Provider/Organization IDs extracted by string manipulation
- **Date defaults**: Month/day default to 1 when null in OMOP
- Only first `generalPractitioner` reference is used

---

## Observation → OMOP Mapping Details

**Status**: **NOT IMPLEMENTED** (infrastructure only)

**Model Source**: [`src/main/java/com/canehealth/omopfhirmap/models/Observation.java`](https://github.com/E-Health/omopfhirmap/blob/main/src/main/java/com/canehealth/omopfhirmap/models/Observation.java)

**Measurement Model Source**: [`src/main/java/com/canehealth/omopfhirmap/models/Measurement.java`](https://github.com/E-Health/omopfhirmap/blob/main/src/main/java/com/canehealth/omopfhirmap/models/Measurement.java)

### Current State

The project has JPA entity models for OMOP `observation` and `measurement` tables, along with fetcher and service classes for retrieving data, but **no actual bidirectional mapping logic** has been implemented yet.

### OMOP OBSERVATION Entity Fields (JPA Model)

| Entity Field | Column Name | Type | Notes |
|--------------|-------------|------|-------|
| `observationId` | `observation_id` | Integer | PK |
| `personId` | `person_id` | Integer | Required |
| `observationConceptId` | `observation_concept_id` | Integer | Required |
| `observationDate` | `observation_date` | Date | Required |
| `observationTime` | `observation_time` | String | Optional |
| `observationTypeConceptId` | `observation_type_concept_id` | Integer | Required |
| `valueAsNumber` | `value_as_number` | Float | Optional |
| `valueAsString` | `value_as_string` | String | Optional |
| `valueAsConceptId` | `value_as_concept_id` | Integer | Optional |
| `qualifierConceptId` | `qualifier_concept_id` | Integer | Optional |
| `unitConceptId` | `unit_concept_id` | Integer | Optional |
| `providerId` | `provider_id` | Integer | Optional |
| `visitOccurrenceId` | `visit_occurrence_id` | Integer | Optional |
| `observationSourceValue` | `observation_source_value` | String | Optional |
| `observationSourceConceptId` | `observation_source_concept_id` | Integer | Optional |
| `unitSourceValue` | `unit_source_value` | String | Optional |
| `qualifierSourceValue` | `qualifier_source_value` | String | Optional |

### Infrastructure Present

The following components exist for future implementation:

1. **ObservationFetcher**: Retrieves OMOP observation records by person ID and date range
2. **ObservationService**: JPA service layer for observation table
3. **ObservationRepository**: Spring Data JPA repository
4. **MeasurementFetcher/Service/Repository**: Similar infrastructure for measurement table

### Example Fetcher Code

```java
@Component
public class ObservationFetcher extends BaseFetcher<Observation>{
    @Autowired
    ObservationService observationService;

    @Override
    public void run() {
        for(Cohort cohort: this.cohorts){
            this.omopStep = this.observationService.listByPersonAndPeriod(
                cohort.getSubjectId(),
                cohort.getCohortStartDate(),
                cohort.getCohortEndDate());
            this.omopResources.addAll(this.omopStep);
        }
    }
}
```

### Notes

- **To be implemented**: Observation mapping is marked as "Stubbed" in project documentation
- Would follow similar pattern to `PatientMapper` when implemented
- Both `observation` and `measurement` OMOP tables would map to FHIR `Observation` resource
- Category-based routing (lab vs vitals vs other) would be needed
- No mapper class like `PatientMapper` exists for observations yet

---

## Encounter → OMOP VISIT_OCCURRENCE Mapping

**Status**: **NOT IMPLEMENTED** (infrastructure only)

### Current State

The project has JPA entity models and fetcher classes for OMOP `visit_occurrence` table, but **no actual bidirectional mapping logic** has been implemented yet for Encounter ↔ VisitOccurrence.

### Infrastructure Present

1. **VisitOccurrence Entity**: `src/main/java/com/canehealth/omopfhirmap/models/VisitOccurrence.java`
2. **VisitOccurrenceService**: `src/main/java/com/canehealth/omopfhirmap/services/VisitOccurrenceService.java`
3. **VisitOccurrenceRepository**: `src/main/java/com/canehealth/omopfhirmap/repositories/VisitOccurrenceRepository.java`
4. **VisitOccurrenceFetcher**: `src/main/java/com/canehealth/omopfhirmap/fetchers/VisitOccurrenceFetcher.java`

### Notes

- **To be implemented**: Encounter mapping is marked as "Stubbed" in project documentation
- Would follow similar pattern to `PatientMapper` when implemented
- No mapper class like `PatientMapper` exists for encounters yet
- Only Patient/Person mapping is currently functional

---

## Condition → OMOP CONDITION_OCCURRENCE Mapping

**Status**: **NOT IMPLEMENTED** (infrastructure only)

### Current State

The project has JPA entity models for OMOP `condition_occurrence` table, but **no actual bidirectional mapping logic** has been implemented yet for Condition ↔ ConditionOccurrence.

### Infrastructure Expected

Based on the project's architecture, when implemented it would include:

1. **ConditionOccurrence Entity**: JPA entity mapping to `condition_occurrence` table
2. **ConditionOccurrenceService**: JPA service layer
3. **ConditionOccurrenceRepository**: Spring Data JPA repository
4. **ConditionOccurrenceFetcher**: Multi-threaded data retrieval
5. **ConditionMapper**: Bidirectional FHIR ↔ OMOP conversion

### Notes

- **To be implemented**: Condition mapping is not currently functional
- Would follow similar pattern to `PatientMapper` when implemented
- No mapper class exists for conditions yet
- Only Patient/Person mapping is currently functional in this project
