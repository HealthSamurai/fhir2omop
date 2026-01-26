# OMOPonFHIR v5.4 R4

## Project Information

- **Project Name:** OMOPonFHIR (OMOP v5.4 on FHIR R4)
- **URL:** https://github.com/omoponfhir/omoponfhir-main-v54-r4
- **Organization:** https://github.com/omoponfhir
- **Website:** https://omoponfhir.org
- **License:** Apache License 2.0

## Purpose and Description

OMOPonFHIR is an open-source FHIR server implementation built on top of the OMOP Common Data Model (CDM). It provides a bidirectional mapping layer between FHIR R4 resources and OMOP v5.4 database structures, enabling healthcare data interoperability through standardized FHIR APIs while using OMOP CDM as the underlying data store.

The project is developed by Georgia Tech Research Institute - CHAI (Center for Health Analytics and Informatics) and supported by the National Center for Advancing Translational Sciences (NCATS) through NIH grant UL1TR002378.

## Key Features

- **Bidirectional Mapping:** Read and write data between FHIR R4 and OMOP v5.4
- **Multi-Database Support:** PostgreSQL and Google BigQuery through SQLRender dialect configuration
- **Vocabulary Schema Separation:** Allows multiple instances to share a common vocabulary schema
- **HAPI FHIR Foundation:** Built on top of HAPI FHIR reference implementation
- **Authentication Support:** Bearer token and basic authentication mechanisms
- **SMART on FHIR:** OAuth2 authorization support
- **Read-Only Mode:** Configurable as read-only FHIR endpoint
- **Docker Deployment:** Containerized deployment option
- **Tomcat Deployment:** Traditional Java application server deployment
- **Test UI Overlay:** Includes HAPI FHIR test GUI for interaction

## FHIR R4 Resources Supported

### Clinical Resources
| FHIR Resource | OMOP Table(s) |
|--------------|---------------|
| Patient | person, f_person (extension table), location |
| Practitioner | provider, care_site |
| Organization | care_site, location |
| Encounter | visit_occurrence |
| Condition | condition_occurrence |
| Procedure | procedure_occurrence |
| Observation | observation, measurement (via f_observation_view) |
| Medication | concept (vocabulary_id = 'RxNorm') |
| MedicationRequest | drug_exposure (drug_type_concept_id = 38000177 "Prescription written") |
| MedicationStatement | drug_exposure |
| Immunization | drug_exposure |
| AllergyIntolerance | observation |
| Device | device_exposure |
| DeviceUseStatement | device_exposure |
| Specimen | specimen |
| DocumentReference | note |

### Terminology Resources
| FHIR Resource | OMOP Table(s) |
|--------------|---------------|
| CodeSystem | concept, vocabulary |
| ValueSet | concept |
| ConceptMap | concept_relationship |

### Infrastructure Resources
- Bundle (transaction/batch support)
- System-level operations

## OMOP CDM Version Supported

- **OMOP CDM v5.4**
- The project uses additional extension tables beyond standard OMOP CDM:
  - `f_person` - Additional patient data elements (name parts, SSN, marital status, active status)
  - `f_observation_view` - Combined view merging observation and measurement tables

## Technology Stack

- **Language:** Java (97.5%)
- **Build System:** Maven
- **Server Framework:** HAPI FHIR (reference implementation)
- **Application Server:** Apache Tomcat (JRE21)
- **Container Runtime:** Docker
- **Database Access:** JPA and SQLRender for cross-database compatibility
- **Supported Databases:**
  - PostgreSQL
  - Google BigQuery

## Architecture

### Modular Design

The project consists of three main submodules:

1. **omoponfhir-omopv5-sql** (branch: 5.4)
   - Database access layer using SQLRender
   - OMOP CDM entity mappings
   - URL: https://github.com/omoponfhir/omoponfhir-omopv5-sql.git

2. **omoponfhir-omopv5-r4-mapping** (branch: sqlRender)
   - FHIR R4 to OMOP v5.4 mapping logic
   - Resource transformation classes
   - URL: https://github.com/omoponfhir/omoponfhir-omopv5-r4-mapping.git

3. **omoponfhir-r4-server** (branch: sqlRender)
   - FHIR R4 server implementation
   - REST API providers
   - Authentication/authorization
   - URL: https://github.com/omoponfhir/omoponfhir-r4-server.git

### Data Flow

```
FHIR Client <-> FHIR R4 Server <-> Mapping Layer <-> SQL Layer <-> OMOP CDM Database
```

### Mapping Classes

Key mapping implementations:
- `OmopPatient.java` - Patient demographics
- `OmopCondition.java` - Diagnoses and conditions
- `OmopObservation.java` - Observations and measurements (largest mapping ~85KB)
- `OmopMedicationRequest.java` - Medication orders
- `OmopMedicationStatement.java` - Medication history
- `OmopEncounter.java` - Clinical encounters
- `OmopProcedure.java` - Medical procedures
- `OmopImmunization.java` - Vaccination records

## Deployment

### Prerequisites
- OMOP CDM v5.4 database (PostgreSQL or BigQuery)
- Java 21
- Maven 3.9+

### Build from Source

```bash
git clone --recurse https://github.com/omoponfhir/omoponfhir-main-v54-r4.git
cd omoponfhir-main-v54-r4/
mvn clean install
```

### Docker Deployment

```bash
docker build -t omoponfhir .
docker run --env-file env.list --name omoponfhir -p 8080:8080 -d omoponfhir:latest
```

### Tomcat Deployment

```bash
cp omoponfhir-r4-server/target/omoponfhir-r4-server.war <tomcat_directory>/webapps/
```

### Configuration (Environment Variables)

```bash
# Database Connection
export JDBC_URL="jdbc:postgresql://host:port/database"
export JDBC_USERNAME="username"
export JDBC_PASSWORD="password"
export JDBC_DATASOURCENAME="org.postgresql.ds.PGSimpleDataSource"
export JDBC_POOLSIZE=5

# Schema Configuration
export JDBC_DATA_SCHEMA="omopv54"
export JDBC_VOCABS_SCHEMA="vocab"

# Target Database (postgresql or bigquery)
export TARGETDATABASE="postgresql"

# BigQuery (if applicable)
export BIGQUERYDATASET="dataset_name"
export BIGQUERYPROJECT="project_name"

# Authentication
export AUTH_BEARER="token_value"
export AUTH_BASIC="username:password"

# Server Configuration
export FHIR_READONLY="False"
export SERVERBASE_URL="http://localhost:8080/fhir/"
export OMOPONFHIR_NAME="OMOP v5.4 on FHIR R4"

# SMART on FHIR (optional)
export SMART_INTROSPECTURL="server_url/smart/introspect"
export SMART_AUTHSERVERURL="server_url/smart/authorize"
export SMART_TOKENSERVERURL="server_url/smart/token"

# Local Code Mapping (optional)
export LOCAL_CODEMAPPING_FILE_PATH="/path/to/mapping/file"
export MEDICATION_TYPE="code"
```

### API Endpoints

- **FHIR Base URL:** `http://localhost:8080/fhir/`
- **Capability Statement:** `GET http://localhost:8080/fhir/metadata`
- **Test UI:** `http://localhost:8080/` (HAPI FHIR overlay)

## Database Setup

### New OMOP Database
Use the setup scripts from: https://github.com/omoponfhir/omopv5_4_setup

### Existing OMOP Database
Add extension tables following the setup guide starting at step 6.

### Vocabulary Schema (Optional)
To share vocabulary across multiple OMOPonFHIR instances:
- Create a separate vocabulary schema
- Set `JDBC_VOCABS_SCHEMA` to point to it
- All schemas must exist in the same database

## Related Projects

- **GT-FHIR:** Original project (FHIR DSTU2, predecessor)
- **OMOPonFHIR Organization:** https://github.com/omoponfhir (27 repositories)
- **HAPI FHIR:** https://hapifhir.io
- **OHDSI OMOP CDM:** https://github.com/OHDSI/CommonDataModel

## Mapping Details

### Key Mapping Rules

1. **Patient/Person:**
   - OMOP `person` table maps to FHIR `Patient`
   - Extended attributes stored in `f_person` table
   - Gender concepts mapped to FHIR AdministrativeGender

2. **Condition:**
   - `condition_occurrence` maps to FHIR `Condition`
   - `condition_type_concept_id` maps to FHIR category
   - Status hardcoded to "confirmed" (OMOP lacks this field)

3. **Observation/Measurement:**
   - Combined view `f_observation_view` merges both OMOP tables
   - Observation IDs from `observation` table are negated to avoid conflicts
   - Blood pressure handled as combined observation
   - Status hardcoded to "final"

4. **Medications:**
   - Drug type concept determines FHIR resource type:
     - 38000177 (Prescription written) -> MedicationRequest
     - 38000176/38000175 (Dispensed) -> MedicationDispense
     - 38000179/43542356-58 (Administered) -> MedicationAdministration

5. **Procedure:**
   - `procedure_occurrence` maps to FHIR `Procedure`
   - Status hardcoded to "in-progress"

---

## Patient ↔ OMOP PERSON Mapping Details (Code Level)

**Source**: [`omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java`](https://github.com/omoponfhir/omoponfhir-omopv5-r4-mapping/blob/sqlRender/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java)

**Note**: This project provides **bidirectional mapping** supporting US Core Patient profile.

### OMOP FPerson → FHIR US Core Patient (`constructFHIR()`)

| FHIR Patient Field | OMOP FPerson Source | Logic |
|--------------------|---------------------|-------|
| `id` | `fhirId` (mapped from person_id) | Via `IdMapping.getFHIRfromOMOP()` |
| `identifier[]` | `person_source_value` | Parsed with `^` delimiter (vocabId^code or vocabId^type^value) |
| `identifier[]` | `ssn` | System: `http://hl7.org/fhir/sid/us-ssn` |
| `name[].family` | `family_name` | FPerson extension field |
| `name[].given[]` | `given_name1`, `given_name2` | FPerson extension fields |
| `birthDate` | `birth_datetime` or `year/month/day_of_birth` | Prefers datetime; falls back to components |
| `gender` | `gender_concept_id` → Concept.name | Lowercase lookup via `AdministrativeGender.fromCode()` |
| `address[].use` | (hardcoded) | `AddressUse.HOME` |
| `address[].line[]` | `location.address1`, `location.address2` | Via Location entity |
| `address[].city` | `location.city` | Via Location entity |
| `address[].state` | `location.state` | Via Location entity |
| `address[].postalCode` | `location.zip` | Via Location entity |
| `generalPractitioner[]` | `provider_id` | Reference to Practitioner with provider name |
| `managingOrganization` | `care_site_id` | Reference to Organization with care site name |
| `active` | `active` | FPerson extension (0=false, else=true) |
| `maritalStatus` | `marital_status` | FPerson extension, V3MaritalStatus coding |
| `telecom[]` | `contact_point1/2/3` | Format: `system:use:value` |
| `extension[us-core-race]` | `race_concept_id` or `race_source_value` | Via code map lookup |
| `extension[us-core-ethnicity]` | `ethnicity_concept_id` or `ethnicity_source_value` | Via code map lookup |

### FHIR US Core Patient → OMOP FPerson (`constructOmop()`)

| OMOP FPerson Field | FHIR Patient Source | Logic |
|-------------------|---------------------|-------|
| `person_source_value` | `Patient.identifier[]` | First identifier with value, formatted as `vocabId^value` |
| `ssn` | `Patient.identifier[]` (SSN) | Extracted if source value starts with "SS^" |
| `family_name` | `Patient.name[0].family` | First name |
| `given_name1` | `Patient.name[0].given[0]` | First given name |
| `given_name2` | `Patient.name[0].given[1]` | Second given name (if present) |
| `prefix_name` | `Patient.name[0].prefix[0]` | First prefix |
| `suffix_name` | `Patient.name[0].suffix[0]` | First suffix |
| `year_of_birth` | `Patient.birthDate` | `Calendar.get(YEAR)` |
| `month_of_birth` | `Patient.birthDate` | `Calendar.get(MONTH) + 1` |
| `day_of_birth` | `Patient.birthDate` | `Calendar.get(DAY_OF_MONTH)` |
| `gender_concept_id` | `Patient.gender` | Via `OmopConceptMapping.omopForAdministrativeGenderCode()` |
| `location_id` | `Patient.address[0]` | Via `AddressUtil.searchAndUpdate()` |
| `provider_id` | `Patient.generalPractitioner[0]` | Searches/creates Provider entity |
| `active` | `Patient.active` | 1 if true, 0 if false |
| `marital_status` | `Patient.maritalStatus` | First coding code |
| `contact_point1/2/3` | `Patient.telecom[]` | Format: `system:use:value` |
| `race_concept_id` | `Patient.extension[us-core-race]` | Via code map lookup; default 8552 |
| `race_source_value` | `Patient.extension[us-core-race]` | Category display |
| `ethnicity_concept_id` | `Patient.extension[us-core-ethnicity]` | Via code map lookup; default 0 |
| `ethnicity_source_value` | `Patient.extension[us-core-ethnicity]` | Category display |

### Birth Date Defaults (OMOP → FHIR)

When `birth_datetime` is null, components are used with defaults:

| Component | Default |
|-----------|---------|
| `year_of_birth` | 1970 |
| `month_of_birth` | 6 |
| `day_of_birth` | 15 (if month also null), else 1 |

### Gender Concept Mapping

Uses `AdministrativeGender.fromCode()` with lowercase concept name:

| OMOP Concept Name | FHIR Gender |
|-------------------|-------------|
| `MALE` | `male` |
| `FEMALE` | `female` |
| (other) | `other` |

### FPerson Extension Table

The project uses an extended `f_person` table (beyond standard OMOP `person`):

| Field | Description |
|-------|-------------|
| `family_name` | Patient family name |
| `given_name1` | First given name |
| `given_name2` | Second given name |
| `prefix_name` | Name prefix |
| `suffix_name` | Name suffix |
| `ssn` | Social Security Number |
| `marital_status` | Marital status code |
| `active` | Active flag (0/1) |
| `contact_point1/2/3` | Contact information (phone, email) |

### Identifier Parsing

The `person_source_value` field supports structured identifiers:

```
Format: VocabularyId^Code (for system identifiers)
Format: VocabularyId^Type^Value (for type-based identifiers)
Format: Value (plain identifier without system)
```

### Notes

- **US Core Profile**: Generates resources matching `us-core-patient` profile
- **ID Mapping**: Uses `IdMapping` utility to convert between FHIR and OMOP IDs
- **Address State**: Converts long state names to two-letter codes via `TwoLetterStateMap`
- **Duplicate Detection**: Searches by `person_source_value` before creating new records
- **Race/Ethnicity**: Uses vocabulary-based code mapping for US Core extensions
- **Contact Points**: Limited to 3 telecom entries (stored in FPerson extension fields)

---

## Observation ↔ OMOP Mapping Details (Code Level)

**Source**: [`omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopObservation.java`](https://github.com/omoponfhir/omoponfhir-omopv5-r4-mapping/blob/sqlRender/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopObservation.java)

**Note**: Uses `f_observation_view` that merges both OMOP `observation` and `measurement` tables.

### FObservationView → FHIR Observation (`constructFHIR()`)

| FHIR Observation Field | OMOP FObservationView Source | Logic |
|------------------------|------------------------------|-------|
| `id` | `fhirId` (mapped from observation_id or measurement_id) | Via ID mapping |
| `status` | (hardcoded) | `ObservationStatus.FINAL` |
| `code.coding[]` | `observation_concept` | System from vocabulary, code from concept_code |
| `subject` | `f_person.id` | Reference to Patient with display name |
| `encounter` | `visit_occurrence_id` | Reference to Encounter |
| `effectiveDateTime` | `observation_date`, `observation_datetime` | Combined date/time |
| `valueQuantity` | `value_as_number`, `unit_concept` | Numeric with unit |
| `valueString` | `value_as_string` | Text result |
| `valueCodeableConcept` | `value_as_concept` | Coded result |
| `valueRatio` | `value_as_string` | Parsed from "numerator:denominator" format |
| `referenceRange[].low` | `range_low`, `unit_concept` | Reference range with unit |
| `referenceRange[].high` | `range_high`, `unit_concept` | Reference range with unit |
| `category[]` | `observation_type_concept_id` | Mapped to FHIR categories (see below) |

### Blood Pressure Handling

Systolic and diastolic blood pressures are stored separately in OMOP but combined in FHIR:

```java
public static final long SYSTOLIC_CONCEPT_ID = 3004249L;
public static final long DIASTOLIC_CONCEPT_ID = 3012888L;
public static final String BP_SYSTOLIC_DIASTOLIC_CODE = "55284-4";
public static final String BP_SYSTOLIC_DIASTOLIC_DISPLAY = "Blood pressure systolic & diastolic";
```

When systolic is detected:
1. Code set to combined BP code `55284-4`
2. Systolic added as first `component[]`
3. Diastolic fetched by matching person, date, and concept ID
4. Diastolic added as second `component[]`

### Type Concept → Category Mapping

| OMOP Type Concept ID | FHIR Category Code | Description |
|---------------------|-------------------|-------------|
| `44818701`, `38000280`, `38000281` | `exam` | Physical examination |
| `44818702`, `44791245`, `38000277`, `38000278` | `laboratory` | Lab result |
| `45905771` | `survey` | Survey/questionnaire |

### Value Type Priority

Values are determined in this order:
1. **valueQuantity**: If `value_as_number` present and no string/concept value
2. **valueRatio**: If `value_as_string` contains ":" with parseable numbers
3. **valueString**: If `value_as_string` present but not ratio
4. **valueCodeableConcept**: If `value_as_concept` present with valid concept
5. **valueString (fallback)**: Use `value_source_value`

### Unit Handling

```java
// Priority for units:
// 1. unit_concept if present and not 0
// 2. unit_source_value if present
// 3. Look up unit_source_value in UCUM vocabulary
if (unitConcept == null || unitConcept.getId() == 0L) {
    unitSource = fObservationView.getUnitSourceValue();
    if (unitSource != null && !unitSource.isEmpty()) {
        unitConcept = CodeableConceptUtil.getOmopConceptWithOmopVacabIdAndCode(
            conceptService, "UCUM", unitSource);
    }
}
```

### FObservationView Structure

A database view that merges `measurement` and `observation` tables:

| Field | Source Table(s) | Notes |
|-------|-----------------|-------|
| `id` | measurement_id or -observation_id | Observation IDs are negated |
| `observation_concept` | measurement_concept_id or observation_concept_id | FK to concept |
| `observation_type_concept` | *_type_concept_id | FK to concept |
| `observation_date` | *_date | DATE |
| `observation_datetime` | *_datetime | TIMESTAMP |
| `value_as_number` | value_as_number | DOUBLE |
| `value_as_string` | value_as_string | VARCHAR |
| `value_as_concept` | value_as_concept_id | FK to concept |
| `unit_concept` | unit_concept_id | FK to concept |
| `range_low` | range_low | DOUBLE (measurement only) |
| `range_high` | range_high | DOUBLE (measurement only) |
| `f_person` | person_id | FK to f_person |
| `visit_occurrence` | visit_occurrence_id | FK to visit_occurrence |

### ID Collision Avoidance

Observation IDs from the `observation` table are negated to avoid collisions with `measurement` table IDs:

```sql
-- In f_observation_view
SELECT measurement_id AS id, ... FROM measurement
UNION ALL
SELECT -observation_id AS id, ... FROM observation
```

### Notes

- **Bidirectional**: Also supports FHIR → OMOP (via `constructOmop()`)
- **Status**: Always set to "final" (OMOP has no status field)
- **Blood pressure combination**: Automatic systolic/diastolic component pairing
- **Diastolic filtering**: Diastolic BP records filtered out from main query (combined with systolic)
- **Unit fallback**: UCUM vocabulary lookup if unit_concept is empty
- **Ratio parsing**: Supports "numerator:denominator" string format

---

## Encounter ↔ OMOP Mapping Details (Code Level)

**Source**: [`omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopEncounter.java`](https://github.com/omoponfhir/omoponfhir-omopv5-r4-mapping/blob/sqlRender/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopEncounter.java)

### OMOP VISIT_OCCURRENCE → FHIR Encounter (`constructFHIR()`)

| FHIR Encounter Field | OMOP VISIT_OCCURRENCE Source | Logic |
|----------------------|------------------------------|-------|
| `id` | `visit_occurrence_id` | Via ID mapping |
| `status` | (hardcoded) | `EncounterStatus.FINISHED` |
| `class` | `visit_concept.concept_name` | String matching to V3ActCode |
| `subject` | `f_person.id` | Reference to Patient with display name |
| `period.start` | `visit_start_date`, `visit_start_datetime` | Combined date/time |
| `period.end` | `visit_end_date`, `visit_end_datetime` | Combined date/time |
| `serviceProvider` | `care_site` | Reference to Organization |
| `participant[].individual` | `provider` | Reference to Practitioner |
| `diagnosis[].condition` | `condition_occurrence` | References from linked conditions |

### Visit Concept → Encounter Class Mapping

```java
String visitString = visitOccurrence.getVisitConcept().getConceptName().toLowerCase();
if (visitString.contains("inpatient")) {
    coding.setCode(V3ActCode.IMP.toCode());    // "IMP"
} else if (visitString.contains("outpatient") || visitString.contains("ambulatory") || visitString.contains("office")) {
    coding.setCode(V3ActCode.AMB.toCode());    // "AMB"
} else if (visitString.contains("home")) {
    coding.setCode(V3ActCode.HH.toCode());     // "HH"
} else if (visitString.contains("emergency")) {
    coding.setCode(V3ActCode.EMER.toCode());   // "EMER"
} else if (visitString.contains("field")) {
    coding.setCode(V3ActCode.FLD.toCode());    // "FLD"
} else if (visitString.contains("daytime")) {
    coding.setCode(V3ActCode.SS.toCode());     // "SS"
} else if (visitString.contains("virtual")) {
    coding.setCode(V3ActCode.VR.toCode());     // "VR"
}
```

### FHIR Encounter → OMOP VISIT_OCCURRENCE (`constructOmop()`)

| OMOP VISIT_OCCURRENCE Field | FHIR Encounter Source | Logic |
|-----------------------------|----------------------|-------|
| `person_id` | `Encounter.subject` | Resolved from Patient reference |
| `visit_concept_id` | `Encounter.class` | Via `OmopConceptMapping.omopForEncounterClassCode()` |
| `visit_start_date` | `Encounter.period.start` | Date portion |
| `visit_start_datetime` | `Encounter.period.start` | Full datetime |
| `visit_end_date` | `Encounter.period.end` | Date portion |
| `visit_end_datetime` | `Encounter.period.end` | Full datetime |
| `visit_type_concept_id` | (hardcoded) | `44818518` (Visit derived from EHR) |
| `provider_id` | `Encounter.participant[0].individual` | From Practitioner reference |
| `care_site_id` | `Encounter.serviceProvider` | From Organization reference |
| `visit_source_value` | `Encounter.id` | FHIR resource ID |

### Encounter Class → Visit Concept Mapping

Via `OmopConceptMapping.omopForEncounterClassCode()`:

| FHIR Class Code | OMOP Visit Concept ID | Description |
|-----------------|----------------------|-------------|
| `IMP` | 9201 | Inpatient Visit |
| `AMB` | 9202 | Outpatient Visit |
| `EMER` | 9203 | Emergency Room Visit |

### Notes

- **Status**: Always set to "finished" (OMOP has no status field)
- **Visit Type**: Hardcoded to `44818518` (Visit derived from EHR)
- **Diagnoses**: Retrieved from `condition_occurrence` table linked to visit
- **Provider**: Only first participant is processed
- **Care Site**: From `serviceProvider` Organization reference
- **Source Value**: FHIR ID stored for duplicate detection

---

## Condition ↔ OMOP CONDITION_OCCURRENCE Mapping Details (Code Level)

**Source**: [`omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopCondition.java`](https://github.com/omoponfhir/omoponfhir-omopv5-r4-mapping/blob/sqlRender/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopCondition.java)

### OMOP CONDITION_OCCURRENCE → FHIR Condition (`constructFHIR()`)

| FHIR Condition Field | OMOP CONDITION_OCCURRENCE Source | Logic |
|----------------------|----------------------------------|-------|
| `id` | `condition_occurrence_id` | Via ID mapping |
| `subject` | `f_person.id` | Reference to Patient with display name |
| `code` | `condition_concept` | Via `CodeableConceptUtil.createFromConcept()` |
| `onsetDateTime` | `condition_start_date` | Direct mapping |
| `abatementDateTime` | `condition_end_date` | Direct mapping |
| `category[]` | `condition_type_concept_id` | Via `OmopConceptMapping.fhirForConditionTypeConcept()` |
| `asserter` | `provider` | Reference to Practitioner with display name |
| `encounter` | `visit_occurrence` | Reference to Encounter |

### FHIR Condition → OMOP CONDITION_OCCURRENCE (`constructOmop()`)

| OMOP CONDITION_OCCURRENCE Field | FHIR Condition Source | Logic |
|---------------------------------|----------------------|-------|
| `person_id` | `Condition.subject` | Resolved from Patient reference |
| `condition_concept_id` | `Condition.code` | Via vocabulary lookup |
| `condition_start_date` | `Condition.onsetDateTime` | Direct mapping |
| `condition_start_datetime` | `Condition.onsetDateTime` | Direct mapping |
| `condition_end_date` | `Condition.abatementDateTime` | Direct mapping |
| `condition_end_datetime` | `Condition.abatementDateTime` | Direct mapping |
| `condition_type_concept_id` | `Condition.category` | Via `OmopConceptMapping` |
| `provider_id` | `Condition.asserter` | From Practitioner reference |
| `visit_occurrence_id` | `Condition.encounter` | From Encounter reference |
| `condition_source_value` | `Condition.code.text` | Or coding code |

### Type Concept → Category Mapping

Via `OmopConceptMapping.fhirForConditionTypeConcept()`:

| Condition Type | FHIR Category Code |
|----------------|-------------------|
| (various type concepts) | `problem-list-item` (default) |
| Mapped via code map | `encounter-diagnosis` |

### Notes

- **Status**: Hardcoded to "confirmed" (OMOP has no status field)
- **Verification Status**: Not mapped (OMOP lacks this concept)
- **Severity/Stage**: Not supported in mapping
- **Bidirectional**: Full support for both OMOP→FHIR and FHIR→OMOP
- **Category**: Uses vocabulary-based mapping with problem-list-item as default
