# ETL-German-FHIR-Core

## Project Information

- **Repository URL**: https://github.com/OHDSI/ETL-German-FHIR-Core
- **Organization**: OHDSI (Observational Health Data Sciences and Informatics)
- **License**: Not explicitly stated in repository (check GitHub for current license)
- **Wiki**: https://github.com/OHDSI/ETL-German-FHIR-Core/wiki

## Purpose/Description

ETL-German-FHIR-Core is a batch ETL (Extract, Transform, Load) process that transforms FHIR R4 resources conforming to German healthcare profiles (MII - Medizininformatik Initiative and MIRACUM) into OMOP Common Data Model (CDM) format. The project was developed in the context of the German Medical Informatics Initiative to enable secondary use of clinical data for research.

## Key Features

- **Batch Processing**: Spring Batch-based ETL with configurable chunk sizes and threading
- **Dual Data Source Support**: Can read FHIR resources from either:
  - FHIR Server (Blaze or HAPI FHIR)
  - FHIR-Gateway PostgreSQL database (direct JDBC access)
- **Load Modes**:
  - **Bulk Load**: Initial full data load with table truncation
  - **Incremental Load**: Subsequent updates without data loss
- **Single-Step Execution**: Ability to run ETL for individual resource types separately
- **In-Memory Caching**: Optional RAM-based dictionary lookup for better performance
- **Monitoring**: Prometheus metrics support with pushgateway integration
- **Tracing**: OpenTracing/Jaeger support for distributed tracing
- **Docker Deployment**: Full containerization with docker-compose

## FHIR Resources Supported

### Core German MII/MIRACUM Profiles

| FHIR Resource | German Profile Support |
|--------------|------------------------|
| Patient | MII Core Patient, German administrative gender extension |
| Encounter | MII Core Encounter (Einrichtungskontakt, Versorgungsstellenkontakt/Fachabteilungskontakt) |
| Condition | ICD-10-GM, ORPHA (Orphanet), SNOMED CT with diagnostic confidence |
| Procedure | OPS (German procedure codes), SNOMED CT, DICOM |
| Observation | LOINC, SNOMED CT, GECCO ECRF parameters |
| Medication | ATC codes (German drug classification) |
| MedicationAdministration | ATC, SNOMED CT, EDQM routes |
| MedicationStatement | ATC, SNOMED CT (optional, disabled by default) |
| Immunization | SNOMED CT vaccines, ATC codes (GECCO dataset) |
| DiagnosticReport | LOINC categories (GECCO dataset) |
| Consent | Resuscitation status (GECCO dataset) |

### Supported Code Systems

- **ICD-10-GM**: German modification of ICD-10 (dimdi/bfarm versions)
- **OPS**: German procedure classification (Operationen- und Prozedurenschluessel)
- **ATC**: Anatomical Therapeutic Chemical classification
- **LOINC**: Laboratory and clinical observations
- **SNOMED CT**: Clinical terminology
- **ORPHA**: Orphanet rare disease codes
- **UCUM**: Units of measurement
- **EDQM**: European Directorate for Quality of Medicines (drug routes)

### GECCO Dataset Support

The ETL includes support for GECCO (German Corona Consensus) dataset profiles:
- Biological sex observations
- SOFA scores
- Frailty scores
- Blood pressure measurements
- History of travel observations

## OMOP CDM Tables Mapped

### Clinical Data Tables

| OMOP Table | Source FHIR Resources |
|-----------|----------------------|
| person | Patient |
| death | Patient (deceased flag) |
| observation_period | Encounter |
| visit_occurrence | Encounter (Einrichtungskontakt) |
| visit_detail | Encounter (Fachabteilungskontakt/DepartmentCase) |
| condition_occurrence | Condition |
| procedure_occurrence | Procedure, Condition (when mapped to Procedure domain) |
| drug_exposure | Medication, MedicationAdministration, MedicationStatement, Immunization |
| device_exposure | Procedure (when containing device codes) |
| measurement | Observation (laboratory), Condition (when mapped to Measurement domain) |
| observation | Observation (non-laboratory), Consent, Condition (when mapped to Observation domain) |

### Health System Tables

| OMOP Table | Source |
|-----------|--------|
| location | Patient.address |
| care_site | Encounter.serviceProvider |

### Vocabulary/Mapping Tables

| OMOP Table | Usage |
|-----------|-------|
| concept | Standard vocabulary lookup |
| source_to_concept_map | Custom source-to-standard mappings |
| fact_relationship | Links between clinical facts |

## Technology Stack

- **Language**: Java 17
- **Framework**: Spring Boot 2.7.x, Spring Batch, Spring Cloud Task
- **Build Tool**: Gradle 7.4.1
- **FHIR Library**: HAPI FHIR 6.1.3 (R4)
- **Database**: PostgreSQL (both source FHIR-Gateway and target OMOP)
- **Caching**: Caffeine
- **Container**: Docker with distroless Java 17 base image
- **Monitoring**: Micrometer, Prometheus
- **Tracing**: OpenTracing, Jaeger
- **Testing**: JUnit 5, Spring Batch Test

## Architecture Details

### Processing Pipeline

```
FHIR Source (FHIR Server or FHIR-Gateway DB)
    |
    v
[Spring Batch Reader] - Paginated reading with configurable page size
    |
    v
[Processor] - Resource-specific transformation logic
    |          - Concept mapping via OMOP vocabularies
    |          - Reference resolution (Patient, Encounter)
    |
    v
[Writer] - Batch writes to OMOP CDM tables
    |
    v
[Post-Processing] - International study adjustments (optional SQL script)
```

### Key Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| BATCH_CHUNKSIZE | 5000 | Records processed per batch |
| BATCH_PAGINGSIZE | 200000 | Records read per page |
| BATCH_THROTTLELIMIT | 4 | Parallel processing threads |
| APP_BULKLOAD_ENABLED | false | Enable bulk load mode |
| APP_DICTIONARYLOADINRAM_ENABLED | true | Cache lookups in RAM |

### Hardware Requirements

- RAM: 24 GB
- CPU: 12 vCPU
- Storage: 1 TB

### Data Flow

1. **Patient Step**: Creates person, location, death records
2. **Encounter Main Step**: Creates visit_occurrence from institution contacts
3. **Department Case Step**: Creates visit_detail from department cases
4. **Clinical Steps** (can run in parallel or separately):
   - Observation -> measurement, observation
   - Condition -> condition_occurrence, procedure_occurrence, measurement, observation
   - Procedure -> procedure_occurrence, device_exposure
   - Medication -> drug_exposure (reference data)
   - MedicationAdministration -> drug_exposure
   - MedicationStatement -> drug_exposure (optional)
   - Immunization -> drug_exposure
   - DiagnosticReport -> measurement, observation
   - Consent -> observation

### Concept Mapping Strategy

The ETL uses vocabulary-based mapping:
- **ICD-10-GM** -> SNOMED CT via ICD10GM vocabulary
- **OPS** -> SNOMED CT via OPS vocabulary
- **ATC** -> RxNorm/RxNorm Extension via ATC vocabulary
- **LOINC** -> Standard LOINC concepts
- **ORPHA** -> SNOMED CT via custom mappings

Domain routing is determined by the standard concept's domain_id, allowing ICD-10 codes to map to Condition, Observation, Measurement, or Procedure tables as appropriate.

## Dependencies

- **Source**: MIRACUM FHIR-Gateway or compatible FHIR Server (Blaze/HAPI)
- **Target**: OHDSI OMOP CDM v5 database with standard vocabularies loaded
- Related repositories:
  - https://gitlab.miracum.org/miracum/etl/deployment (FHIR Gateway)
  - https://gitlab.miracum.org/miracum/etl/ohdsi-omop-v5 (OMOP DB)

## Authors

- Elisa Henke
- Yuan Peng
- MIRACUM Consortium

---

## Patient → OMOP Mapping Details

**Source**: [`src/main/java/org/miracum/etl/fhirtoomop/mapper/PatientMapper.java`](https://github.com/OHDSI/ETL-German-FHIR-Core/blob/master/src/main/java/org/miracum/etl/fhirtoomop/mapper/PatientMapper.java)

**Model**: [`src/main/java/org/miracum/etl/fhirtoomop/model/omop/Person.java`](https://github.com/OHDSI/ETL-German-FHIR-Core/blob/master/src/main/java/org/miracum/etl/fhirtoomop/model/omop/Person.java)

### FHIR Patient → OMOP PERSON

| OMOP PERSON Field | FHIR Patient Source | Notes |
|-------------------|---------------------|-------|
| `person_id` | Auto-generated | Sequence-based ID |
| `person_source_value` | `Patient.identifier` (MR type) | Truncated to max length, prefix removed |
| `gender_concept_id` | `Patient.gender` | Mapped via SOURCE_TO_CONCEPT_MAP with vocabulary "Gender" |
| `gender_source_value` | `Patient.gender` | Raw value; supports German `gender-amtlich-de` extension for "other" |
| `year_of_birth` | `Patient.birthDate` | Extracted year; or calculated from age extension |
| `month_of_birth` | `Patient.birthDate` | Extracted month (null if calculated from age) |
| `day_of_birth` | `Patient.birthDate` | Extracted day (null if calculated from age) |
| `race_concept_id` | `Patient.extension[ethnicGroup]` | SNOMED-based ethnic group → race concept mapping |
| `race_source_value` | `Patient.extension[ethnicGroup].code` | Raw ethnic group code |
| `race_source_concept_id` | `Patient.extension[ethnicGroup]` | SNOMED concept ID |
| `ethnicity_concept_id` | `Patient.extension[ethnicGroup]` | Hispanic/Latino → 38003563; Mixed → 0; else → 0 |
| `ethnicity_source_value` | `Patient.extension[ethnicGroup].code` | For Hispanic or Mixed only |
| `location_id` | `Patient.address` | FK to LOCATION table (post-processed) |
| `fhir_logical_id` | `Patient.id` | Custom extension field for traceability |
| `fhir_identifier` | `Patient.identifier` (MR) | Custom extension field for traceability |

### FHIR Patient → OMOP LOCATION (via post-processing)

| OMOP LOCATION Field | FHIR Patient Source |
|---------------------|---------------------|
| `zip` | `Patient.address[0].postalCode` |
| `city` | `Patient.address[0].city` |
| `state` | `Patient.address[0].state` |
| `county` | (not mapped) |
| `country` | `Patient.address[0].country` |
| `address_1` | `Patient.address[0].line[]` |
| `address_2` | (not mapped) |

### FHIR Patient → OMOP DEATH (via post-processing)

| OMOP DEATH Field | FHIR Patient Source |
|------------------|---------------------|
| `person_id` | Resolved from Patient |
| `death_date` | `Patient.deceasedDateTime` (date part) |
| `death_datetime` | `Patient.deceasedDateTime` |
| `death_type_concept_id` | 32817 (EHR record status - Deceased) |
| `cause_concept_id` | (not mapped from Patient) |

### Gender Concept Mapping

| FHIR Gender | OMOP Concept ID | OMOP Concept Name |
|-------------|-----------------|-------------------|
| `male` | 8507 | MALE |
| `female` | 8532 | FEMALE |
| `other` | 8521 | OTHER (or via German extension) |
| `unknown` | 8551 | UNKNOWN |
| (missing) | 8551 | UNKNOWN |

### German-Specific Extensions Handled

- **Age Extension** (`mii-ex-alter`): Calculates birth year when birthDate is missing
  - Uses `age` (value) and `dateTimeOfDocumentation` sub-extensions
  - Supports age units: years (`a`), months (`mo`), days (`d`)
- **Ethnic Group Extension** (`ethnicGroup`): Maps to race/ethnicity concepts
- **Gender Amtlich DE Extension** (`gender-amtlich-de`): German administrative gender for "other"

### Notes

- Patient resources without birthDate (real or calculated) are skipped
- Supports both bulk load (full refresh) and incremental load (upsert/delete)
- Death records are only created when `deceasedDateTime` is present (boolean `deceased` is not sufficient)
- Location and Death are written to a post-processing table first, then resolved to OMOP tables

---

## Observation → OMOP Mapping Details

**Source**: [`src/main/java/org/miracum/etl/fhirtoomop/mapper/ObservationMapper.java`](https://github.com/OHDSI/ETL-German-FHIR-Core/blob/master/src/main/java/org/miracum/etl/fhirtoomop/mapper/ObservationMapper.java)

**Note**: FHIR Observation maps to **three different OMOP tables** based on the standard concept's domain:
- `measurement` table (domain = "Measurement")
- `observation` table (domain = "Observation")
- `procedure_occurrence` table (domain = "Procedure")

### Domain Routing Logic

The mapper uses LOINC standard domain lookup to determine the target OMOP table:

```java
switch (domain) {
  case OMOP_DOMAIN_PROCEDURE:   → procedure_occurrence
  case OMOP_DOMAIN_OBSERVATION: → observation
  case OMOP_DOMAIN_MEASUREMENT: → measurement
}
```

### FHIR Observation → OMOP MEASUREMENT

| OMOP MEASUREMENT Field | FHIR Observation Source | Notes |
|------------------------|-------------------------|-------|
| `person_id` | `Observation.subject` | Resolved via Patient reference |
| `visit_occurrence_id` | `Observation.encounter` | Resolved via Encounter reference |
| `measurement_concept_id` | `Observation.code` | LOINC → standard concept via vocabulary lookup |
| `measurement_source_concept_id` | `Observation.code` | Source LOINC concept ID |
| `measurement_source_value` | `Observation.code.coding[0].code` | Raw LOINC code |
| `measurement_date` | `Observation.effectiveDateTime` | Date part |
| `measurement_datetime` | `Observation.effectiveDateTime` | Full timestamp; fallbacks: `issued`, `effectivePeriod.start` |
| `measurement_type_concept_id` | `Observation.category` | Via SOURCE_TO_CONCEPT_MAP (vocabulary: "Observation Category") |
| `value_as_number` | `Observation.valueQuantity.value` | Numeric result |
| `value_as_concept_id` | `Observation.valueCodeableConcept` | Coded result → concept lookup |
| `value_source_value` | `Observation.valueQuantity.value` or `valueCodeableConcept.code` | Raw value |
| `unit_concept_id` | `Observation.valueQuantity.code` | UCUM → standard concept |
| `unit_source_value` | `Observation.valueQuantity.unit` | Raw unit string |
| `range_low` | `Observation.referenceRange[0].low.value` | Reference range lower bound |
| `range_high` | `Observation.referenceRange[0].high.value` | Reference range upper bound |
| `operator_concept_id` | `Observation.interpretation` | Via custom mapping (vocabulary: "Lab Interpretation") |
| `fhir_logical_id` | `Observation.id` | Custom extension for traceability |
| `fhir_identifier` | `Observation.identifier[0]` | Custom extension for traceability |

### FHIR Observation → OMOP OBSERVATION

| OMOP OBSERVATION Field | FHIR Observation Source | Notes |
|------------------------|-------------------------|-------|
| `person_id` | `Observation.subject` | Resolved via Patient reference |
| `visit_occurrence_id` | `Observation.encounter` | Resolved via Encounter reference |
| `observation_concept_id` | `Observation.code` | LOINC → standard concept via vocabulary lookup |
| `observation_source_concept_id` | `Observation.code` | Source LOINC concept ID |
| `observation_source_value` | `Observation.code.coding[0].code` | Raw LOINC code |
| `observation_date` | `Observation.effectiveDateTime` | Date part |
| `observation_datetime` | `Observation.effectiveDateTime` | Full timestamp |
| `observation_type_concept_id` | `Observation.category` | Via SOURCE_TO_CONCEPT_MAP |
| `value_as_number` | `Observation.valueQuantity.value` | Numeric result |
| `value_as_concept_id` | `Observation.valueCodeableConcept` | Coded result → concept lookup |
| `value_as_string` | `Observation.valueCodeableConcept.code` | Coded value as string |
| `unit_concept_id` | `Observation.valueQuantity.code` | UCUM → standard concept |
| `unit_source_value` | `Observation.valueQuantity.unit` | Raw unit string |
| `qualifier_concept_id` | `Observation.interpretation` | Via custom mapping |
| `qualifier_source_value` | `Observation.interpretation.code` | Raw interpretation code |
| `fhir_logical_id` | `Observation.id` | Custom extension for traceability |
| `fhir_identifier` | `Observation.identifier[0]` | Custom extension for traceability |

### FHIR Observation → OMOP PROCEDURE_OCCURRENCE (when domain = Procedure)

| OMOP PROCEDURE_OCCURRENCE Field | FHIR Observation Source | Notes |
|---------------------------------|-------------------------|-------|
| `person_id` | `Observation.subject` | Resolved via Patient reference |
| `visit_occurrence_id` | `Observation.encounter` | Resolved via Encounter reference |
| `procedure_concept_id` | `Observation.code` | Standard concept |
| `procedure_source_concept_id` | `Observation.code` | Source concept |
| `procedure_source_value` | `Observation.code.coding[0].code` | Raw code |
| `procedure_date` | `Observation.effectiveDateTime` | Date part |
| `procedure_datetime` | `Observation.effectiveDateTime` | Full timestamp |
| `procedure_type_concept_id` | `Observation.category` | Via SOURCE_TO_CONCEPT_MAP |
| `modifier_concept_id` | `Observation.valueCodeableConcept` | Value as modifier |
| `modifier_source_value` | `Observation.valueQuantity.value` or `valueCodeableConcept` | Raw value |
| `fhir_logical_id` | `Observation.id` | Custom extension |
| `fhir_identifier` | `Observation.identifier[0]` | Custom extension |

### Special Handling: GECCO Blood Pressure

Blood pressure observations (LOINC codes in `FHIR_RESOURCE_GECCO_OBSERVATION_BLOOD_PRESSURE_CODES`) are decomposed into component measurements:

| Component LOINC | Description | Target |
|-----------------|-------------|--------|
| Component codes | Systolic/Diastolic | Individual measurement records |
| `component.valueQuantity.value` | BP value | `measurement.value_as_number` |
| `component.valueQuantity.unit` | mmHg | `measurement.unit_source_value` |

### Special Handling: GECCO SOFA Score

SOFA score observations (LOINC codes in `FHIR_RESOURCE_GECCO_OBSERVATION_SOFA_CODES`) create:
1. **Total score** measurement from `Observation.valueInteger`
2. **Component scores** from each `Observation.component`

### Special Handling: History of Travel

History of travel observations (LOINC `82752-7`, `91560-3`, etc.) extract:
- Travel start/end dates
- City, country, state from components
- Creates location post-processing records

### Acceptable Status Values

Only observations with these statuses are processed:
- `final`
- `amended`
- `corrected`
- `preliminary`

### Category → Type Concept Mapping

Category codes are mapped via SOURCE_TO_CONCEPT_MAP with vocabulary `"Observation Category"`:

| Category Code | Typical Mapping |
|---------------|-----------------|
| `laboratory` | 32856 (Lab) |
| `vital-signs` | 32817 (EHR) |
| `survey` | 32817 (EHR) |

### Notes

- Observations without `effectiveDateTime` are skipped (except history-of-travel)
- Observations without valid LOINC codes are skipped
- Both `valueQuantity` and `valueCodeableConcept` values are supported
- Reference ranges only apply to `measurement` table
- Interpretation codes map to `qualifier_concept_id` (observation) or `operator_concept_id` (measurement)
- Supports bulk load (with delete) and incremental load modes

---

## Encounter → OMOP VISIT_OCCURRENCE Mapping

**Source**: [`src/main/java/org/miracum/etl/fhirtoomop/mapper/EncounterInstitutionContactMapper.java`](https://github.com/OHDSI/ETL-German-FHIR-Core/blob/main/src/main/java/org/miracum/etl/fhirtoomop/mapper/EncounterInstitutionContactMapper.java)

### FHIR Encounter → OMOP VISIT_OCCURRENCE

| OMOP VISIT_OCCURRENCE Field | FHIR Encounter Source | Logic |
|-----------------------------|----------------------|-------|
| `person_id` | `Encounter.subject` | Resolved from Patient reference |
| `visit_concept_id` | `Encounter.class` | Via vocabulary lookup with "station"/"stationaer" → INPATIENT |
| `visit_start_date` | `Encounter.period.start` | Date portion |
| `visit_start_datetime` | `Encounter.period.start` | Full datetime |
| `visit_end_date` | `Encounter.period.end` | Date portion (defaults to now if missing) |
| `visit_end_datetime` | `Encounter.period.end` | Full datetime |
| `visit_type_concept_id` | `Encounter.status` | Via `SOURCE_VOCABULARY_ID_VISIT_STATUS` lookup |
| `visit_source_value` | `Encounter.identifier` | Truncated to MAX_SOURCE_VALUE_LENGTH |
| `fhir_logical_id` | `Encounter.id` | For incremental updates |
| `fhir_identifier` | `Encounter.identifier[VN]` | For duplicate detection |

### Visit Type Concept Logic

```java
// From status
if (visitStatus.equals("UNKNOWN") && endDateTime == null) {
    return CONCEPT_STILL_PATIENT;  // Still in visit
}
var visitTypeConceptId = findOmopConcepts.getCustomConcepts(
    visitStatus, SOURCE_VOCABULARY_ID_VISIT_STATUS, dbMappings);
// Default to EHR if no match
return CONCEPT_EHR;  // 32817
```

### Visit Concept (Class) Logic

```java
var visitType = encounterClass.getCode();
if (visitType.equalsIgnoreCase("station") || visitType.equalsIgnoreCase("stationaer")) {
    return CONCEPT_INPATIENT;  // German hospital terminology
}
// Otherwise lookup via SOURCE_VOCABULARY_ID_VISIT_TYPE
return sourceToConceptMap.getTargetConceptId();
```

### Additional Records Created

The mapper also creates post-process records for:

1. **Observation Period**: `observation_period` table updated based on visit dates
2. **Admission Occasion**: From `hospitalization.admitSource`
3. **Admission Reason**: From `reasonCode`
4. **Discharge Reason**: From `hospitalization.dischargeDisposition`
5. **Diagnosis Rank**: From `diagnosis[].rank` (primary=1, secondary=other)
6. **Diagnosis Use**: From `diagnosis[].use`

### Acceptable Status Values

Only encounters with these statuses are processed:
- `finished`
- `in-progress`
- `arrived`
- `triaged`
- (configurable via `FHIR_RESOURCE_ENCOUNTER_ACCEPTABLE_STATUS_LIST`)

### Notes

- Supports both bulk load and incremental load modes
- Deletes existing records on incremental update before re-inserting
- Missing end date: Set to current datetime
- "Still patient" detection: status=UNKNOWN and no end date
- German-specific: "station"/"stationaer" codes map to INPATIENT
- Creates linked records for admission/discharge reasons

---

## Condition → OMOP Mapping (Domain-Based Routing)

**Source**: [`src/main/java/org/miracum/etl/fhirtoomop/mapper/ConditionMapper.java`](https://github.com/OHDSI/ETL-German-FHIR-Core/blob/main/src/main/java/org/miracum/etl/fhirtoomop/mapper/ConditionMapper.java)

**Note**: This is the most comprehensive Condition mapping implementation (1655 lines), supporting domain-based routing to multiple OMOP tables.

### Domain-Based Routing

FHIR Condition resources are routed to different OMOP tables based on the SNOMED/ICD code domain:

| Concept Domain | OMOP Target Table |
|----------------|-------------------|
| Condition | condition_occurrence |
| Observation | observation |
| Procedure | procedure_occurrence |
| Measurement | measurement |

### FHIR Condition → OMOP CONDITION_OCCURRENCE

| OMOP CONDITION_OCCURRENCE Field | FHIR Condition Source | Logic |
|---------------------------------|----------------------|-------|
| `person_id` | `Condition.subject` | Resolved from Patient reference |
| `condition_concept_id` | `Condition.code` | Via vocabulary lookup (ICD-10-GM, SNOMED) |
| `condition_source_concept_id` | `Condition.code` | Source concept from vocabulary |
| `condition_source_value` | `Condition.code.coding[0].code` | Raw code; truncated to MAX_SOURCE_VALUE_LENGTH |
| `condition_start_date` | `Condition.onset[x]`, `recordedDate` | With fallback chain |
| `condition_start_datetime` | Same as above | Full datetime |
| `condition_end_date` | `Condition.abatement[x]` | If available |
| `condition_end_datetime` | Same as above | Full datetime |
| `condition_type_concept_id` | `Condition.category` | Via SOURCE_TO_CONCEPT_MAP |
| `condition_status_concept_id` | `Condition.clinicalStatus` | Via vocabulary lookup |
| `visit_occurrence_id` | `Condition.encounter` | Resolved from Encounter reference |
| `fhir_logical_id` | `Condition.id` | For incremental updates |
| `fhir_identifier` | `Condition.identifier[0]` | For duplicate detection |

### Category → Type Concept Mapping

| FHIR Category Code | OMOP Type Concept | Description |
|-------------------|-------------------|-------------|
| `encounter-diagnosis` | 32817 | EHR |
| `problem-list-item` | 32817 | EHR |
| (via SOURCE_TO_CONCEPT_MAP) | Vocabulary-based | Custom mappings |

### Supported Vocabulary Systems

| FHIR Code System | OMOP Vocabulary | Notes |
|------------------|-----------------|-------|
| `http://fhir.de/CodeSystem/dimdi/icd-10-gm` | ICD10GM | German ICD-10 |
| `http://fhir.de/CodeSystem/bfarm/icd-10-gm` | ICD10GM | German ICD-10 (BfArM) |
| `http://snomed.info/sct` | SNOMED | SNOMED CT |
| `http://www.orpha.net` | Orphanet | Rare diseases |

### Special Handling

1. **ICD-10 Diagnostic Certainty**: Extracted from German ICD-10-GM extensions
   - Maps to `condition_status_concept_id`

2. **Body Site**: Extracted and stored in post-process records

3. **Severity/Stage**: Handled via separate observation records

4. **Multiple Codings**: All codings in `Condition.code` are processed

### Acceptable Status Values

Only conditions with these clinical statuses are processed:
- `active`
- `recurrence`
- `relapse`
- `inactive`
- `remission`
- `resolved`

### Notes

- Supports both bulk load and incremental load modes
- Domain routing based on OHDSI vocabulary's `domain_id`
- Creates linked records for body site, severity, stage
- ICD-10-GM specific handling for German hospital data
- Deletes existing records on incremental update before re-inserting

---

## Procedure → OMOP Mapping (Domain-Based Routing)

**Source**: [`src/main/java/org/miracum/etl/fhirtoomop/mapper/ProcedureMapper.java`](https://github.com/OHDSI/ETL-German-FHIR-Core/blob/main/src/main/java/org/miracum/etl/fhirtoomop/mapper/ProcedureMapper.java)

### Domain-Based Routing

FHIR Procedure resources are routed to different OMOP tables based on the OPS/SNOMED code domain:

| Concept Domain | OMOP Target Table |
|----------------|-------------------|
| Procedure | procedure_occurrence |
| Drug | drug_exposure |
| Observation | observation |
| Measurement | measurement |

### FHIR Procedure → OMOP PROCEDURE_OCCURRENCE

| OMOP PROCEDURE_OCCURRENCE Field | FHIR Procedure Source | Logic |
|---------------------------------|----------------------|-------|
| `person_id` | `Procedure.subject` | Resolved from Patient reference |
| `procedure_concept_id` | `Procedure.code` | Via vocabulary lookup (OPS, SNOMED, DICOM) |
| `procedure_source_concept_id` | `Procedure.code` | Source concept from vocabulary |
| `procedure_source_value` | `Procedure.code.coding[0].code` | Raw code |
| `procedure_date` | `Procedure.performedDateTime` or `Period.start` | Start date |
| `procedure_datetime` | Same | Full datetime |
| `procedure_end_date` | `Procedure.performedPeriod.end` | End date |
| `procedure_end_datetime` | Same | Full datetime |
| `procedure_type_concept_id` | (default) | `CONCEPT_EHR` (32817) |
| `visit_occurrence_id` | `Procedure.encounter` | Resolved from Encounter reference |
| `fhir_logical_id` | `Procedure.id` | For incremental updates |
| `fhir_identifier` | `Procedure.identifier[0]` | For duplicate detection |

### Device Exposure from Procedure

Creates `device_exposure` records from `Procedure.usedCode`.

### Supported Vocabulary Systems

| FHIR Code System | OMOP Vocabulary |
|------------------|-----------------|
| OPS (German) | OPS |
| SNOMED CT | SNOMED |
| DICOM | DICOM |

### Acceptable Status Values

- `completed`
- `in-progress`
- `on-hold`

### Notes

- Domain routing based on OHDSI vocabulary's `domain_id`
- Creates linked `device_exposure` records for `usedCode`
- Supports both bulk load and incremental load modes
- OPS-specific handling for German hospital procedure codes

---

## MedicationStatement → OMOP DRUG_EXPOSURE Mapping

**Source**: [`src/main/java/org/miracum/etl/fhirtoomop/mapper/MedicationStatementMapper.java`](https://github.com/OHDSI/ETL-German-FHIR-Core/blob/main/src/main/java/org/miracum/etl/fhirtoomop/mapper/MedicationStatementMapper.java)

**Note**: Also supports `MedicationAdministration` via separate mapper.

### FHIR MedicationStatement → OMOP DRUG_EXPOSURE

| OMOP DRUG_EXPOSURE Field | FHIR MedicationStatement Source | Logic |
|--------------------------|--------------------------------|-------|
| `person_id` | `MedicationStatement.subject` | Resolved from Patient reference |
| `drug_concept_id` | `MedicationStatement.medicationReference` or `medicationCodeableConcept` | Via ATC vocabulary lookup |
| `drug_source_concept_id` | Same | Source concept from vocabulary |
| `drug_source_value` | `MedicationStatement.medication.coding[0].code` | ATC code |
| `drug_exposure_start_date` | `MedicationStatement.effectiveDateTime` or `effectivePeriod.start` or `dateAsserted` | Start date |
| `drug_exposure_start_datetime` | Same | Full datetime |
| `drug_exposure_end_date` | `MedicationStatement.effectivePeriod.end` | End date |
| `drug_exposure_end_datetime` | Same | Full datetime |
| `drug_type_concept_id` | (default) | `CONCEPT_CLAIM` (hardcoded) |
| `quantity` | `MedicationStatement.dosage[].doseAndRate[].doseQuantity.value` | Dose quantity |
| `visit_occurrence_id` | `MedicationStatement.context` | Resolved from Encounter reference |
| `fhir_logical_id` | `MedicationStatement.id` | For incremental updates |
| `fhir_identifier` | `MedicationStatement.identifier[0]` | For duplicate detection |

### Domain-Based Routing

Based on the OMOP concept domain:

| Concept Domain | OMOP Target Table |
|----------------|-------------------|
| Drug | drug_exposure |
| Observation | observation |

### Dosage Extraction

```java
private List<BigDecimal> getDosage(MedicationStatement srcMedicationStatement, String medicationStatementId) {
    List<BigDecimal> dosageList = new ArrayList<>();
    for (Dosage dosage : srcMedicationStatement.getDosage()) {
        for (DosageDoseAndRateComponent doseAndRate : dosage.getDoseAndRate()) {
            if (doseAndRate.hasDoseQuantity()) {
                Quantity doseQuantity = doseAndRate.getDoseQuantity();
                dosageList.add(doseQuantity.getValue());
            } else if (doseAndRate.hasDoseRange()) {
                Range doseRange = doseAndRate.getDoseRange();
                // Calculate midpoint of range
                dosageList.add(doseRange.getHigh().getValue()
                    .add(doseRange.getLow().getValue())
                    .divide(BigDecimal.valueOf(2)));
            }
        }
    }
    return dosageList;
}
```

### Date Extraction Priority

1. `effectiveDateTimeType` - Use directly
2. `effectivePeriod.start/end` - Use period bounds
3. `dateAsserted` - Fallback if no effective date

### Acceptable Status Values

- `active`
- `completed`
- `intended`
- `stopped`
- `on-hold`
- (configurable via `FHIR_RESOURCE_MEDICATION_STATEMENT_ACCEPTABLE_STATUS_LIST`)

### Notes

- **ATC vocabulary**: Primary vocabulary for German medication codes
- **Domain routing**: Routes Drug domain to drug_exposure, Observation to observation
- **Dosage calculation**: Supports both quantity and range (midpoint calculation)
- **Multiple dosages**: Creates separate records per dosage entry
- **Bulk/incremental**: Supports both load modes
- **Related resources**: References Medication resources via `medicationReference`

---

## Immunization → OMOP DRUG_EXPOSURE Mapping

**Source**: [`src/main/java/org/miracum/etl/fhirtoomop/mapper/ImmunizationMapper.java`](https://github.com/OHDSI/ETL-German-FHIR-Core/blob/main/src/main/java/org/miracum/etl/fhirtoomop/mapper/ImmunizationMapper.java)

### FHIR Immunization → OMOP DRUG_EXPOSURE

| OMOP DRUG_EXPOSURE Field | FHIR Immunization Source | Logic |
|--------------------------|-------------------------|-------|
| `person_id` | `Immunization.patient` | Resolved from Patient reference |
| `drug_concept_id` | `Immunization.vaccineCode` | Via ATC/SNOMED vocabulary lookup |
| `drug_source_concept_id` | Same | Source concept from vocabulary |
| `drug_source_value` | `Immunization.vaccineCode.coding[0].code` | Raw code |
| `drug_exposure_start_date` | `Immunization.occurrenceDateTime` or `occurrenceString` | Start date |
| `drug_exposure_start_datetime` | Same | Full datetime |
| `drug_exposure_end_date` | Same | Same as start (single event) |
| `drug_exposure_end_datetime` | Same | Same as start |
| `drug_type_concept_id` | (default) | `CONCEPT_EHR` (32817) |
| `quantity` | `Immunization.doseQuantity.value` | Dose quantity |
| `visit_occurrence_id` | `Immunization.encounter` | Resolved from Encounter reference |
| `fhir_logical_id` | `Immunization.id` | For incremental updates |
| `fhir_identifier` | `Immunization.identifier[0]` | For duplicate detection |

### Domain-Based Routing

Based on the OMOP concept domain:

| Concept Domain | OMOP Target Table |
|----------------|-------------------|
| Drug | drug_exposure |
| Observation | observation |

### Supported Vocabulary Systems

```java
private final List<String> listOfImmunizationVocabularyId =
    Arrays.asList(VOCABULARY_ATC, VOCABULARY_SNOMED);
```

- ATC (Anatomical Therapeutic Chemical)
- SNOMED CT

### Acceptable Status Values

- `completed`
- `entered-in-error`
- `not-done`
- (configurable via `FHIR_RESOURCE_ACCEPTABLE_EVENT_STATUS_LIST`)

### Notes

- **ATC/SNOMED vocabularies**: Primary vocabularies for German immunization codes
- **Domain routing**: Routes Drug domain to drug_exposure, Observation to observation
- **Single-day event**: Start and end dates are the same
- **Bulk/incremental**: Supports both load modes
- **Dose quantity**: Mapped directly from `doseQuantity`

---

## AllergyIntolerance → OMOP Mapping

**Note**: ETL-German-FHIR-Core does **NOT** currently implement AllergyIntolerance mapping.

### Not Implemented

No `AllergyIntoleranceMapper.java` exists in the codebase. The project focuses on:
- Patient → Person
- Observation → Observation/Measurement
- Encounter → VisitOccurrence
- Condition → ConditionOccurrence
- Procedure → ProcedureOccurrence
- MedicationStatement → DrugExposure
- Immunization → DrugExposure

### Expected Implementation Pattern

If AllergyIntolerance mapping were added, it would follow the existing mapper pattern:

```java
// Expected pattern (not implemented)
@Mapper
public class AllergyIntoleranceMapper {
    // Map to OMOP observation table
    // observation_concept_id from allergy code
    // value_as_concept_id from reaction manifestation
    // observation_date from onset
}
```

### Target Table

Per OHDSI conventions, AllergyIntolerance would map to:
- **observation** table (allergies are clinical findings, not drug administrations)

---

## DiagnosticReport → OMOP Mapping (Domain-Based Routing)

**Source**: [`src/main/java/org/miracum/etl/fhirtoomop/mapper/DiagnosticReportMapper.java`](https://github.com/OHDSI/ETL-German-FHIR-Core/blob/main/src/main/java/org/miracum/etl/fhirtoomop/mapper/DiagnosticReportMapper.java)

### Domain-Based Routing

DiagnosticReport maps to different OMOP tables based on the LOINC code's domain:

| OMOP Domain | Target Table |
|-------------|--------------|
| Observation | observation |
| Measurement | measurement |
| Procedure | procedure_occurrence |

### FHIR DiagnosticReport → OMOP (Common Fields)

| OMOP Field | FHIR DiagnosticReport Source | Logic |
|------------|------------------------------|-------|
| `person_id` | `DiagnosticReport.subject` | Resolved from Patient reference |
| `visit_occurrence_id` | `DiagnosticReport.encounter` | Resolved from Encounter reference |
| `*_concept_id` | `DiagnosticReport.code` (LOINC) | Via vocabulary lookup |
| `*_source_concept_id` | `DiagnosticReport.conclusionCode` (SNOMED) | Via vocabulary lookup |
| `*_source_value` | `DiagnosticReport.conclusionCode.coding[0].code` | Raw SNOMED code |
| `*_date` | `DiagnosticReport.effectiveDateTime` | Date component |
| `*_datetime` | Same | Full timestamp |
| `*_type_concept_id` | `DiagnosticReport.category` (LOINC) | Via custom mapping |
| `fhir_logical_id` | `DiagnosticReport.id` | For incremental updates |
| `fhir_identifier` | `DiagnosticReport.identifier[0]` | For duplicate detection |

### Observation Target Mapping

```java
var diagnosticReportObservation = OmopObservation.builder()
    .personId(personId)
    .visitOccurrenceId(visitOccId)
    .observationTypeConceptId(categoryCodingConcept.getTargetConceptId())
    .observationConceptId(loincCodingConcept.getConceptId())
    .observationSourceConceptId(snomedConcept.getConceptId())
    .observationSourceValue(snomedCoding.getCode())
    .valueAsString(snomedCoding.getCode())
    .observationDate(diagnosticReportOnset.getStartDateTime().toLocalDate())
    .observationDatetime(diagnosticReportOnset.getStartDateTime())
    .fhirIdentifier(diagnosticReportSourceIdentifier)
    .fhirLogicalId(diagnosticReportLogicId)
    .build();
```

### Measurement Target Mapping

```java
var diagnosticReportMeasurement = Measurement.builder()
    .personId(personId)
    .visitOccurrenceId(visitOccId)
    .measurementTypeConceptId(categoryCodingConcept.getTargetConceptId())
    .measurementConceptId(loincCodingConcept.getConceptId())
    .measurementSourceConceptId(snomedConcept.getConceptId())
    .measurementSourceValue(snomedCoding.getCode())
    .valueSourceValue(snomedCoding.getCode())
    .measurementDate(diagnosticReportOnset.getStartDateTime().toLocalDate())
    .measurementDatetime(diagnosticReportOnset.getStartDateTime())
    .fhirIdentifier(diagnosticReportSourceIdentifier)
    .fhirLogicalId(diagnosticReportLogicId)
    .build();
```

### Procedure Target Mapping

```java
var diagnosticReportProcedure = ProcedureOccurrence.builder()
    .personId(personId)
    .visitOccurrenceId(visitOccId)
    .procedureTypeConceptId(categoryCodingConcept.getTargetConceptId())
    .procedureConceptId(loincCodingConcept.getConceptId())
    .procedureSourceConceptId(snomedConcept.getConceptId())
    .procedureSourceValue(snomedCoding.getCode())
    .procedureDate(diagnosticReportOnset.getStartDateTime().toLocalDate())
    .procedureDatetime(diagnosticReportOnset.getStartDateTime())
    .fhirIdentifier(diagnosticReportSourceIdentifier)
    .fhirLogicalId(diagnosticReportLogicId)
    .build();
```

### Acceptable Status Values

- `final`
- `amended`
- `corrected`
- (configurable via `FHIR_RESOURCE_DIAGNOSTIC_REPORT_ACCEPTABLE_STATUS_LIST`)

### Vocabulary Systems

- **Code**: LOINC (primary vocabulary for DiagnosticReport.code)
- **Conclusion**: SNOMED CT (for DiagnosticReport.conclusionCode)
- **Category**: LOINC (for DiagnosticReport.category)

### Interpretation Mapping

SNOMED post-coordinated expressions with interpretation codes (e.g., `118247008:{363713009=373068000}`) are parsed and mapped to:
- `qualifier_concept_id` / `qualifier_source_value` (for observations)
- `operator_concept_id` (for measurements)
- `modifier_concept_id` / `modifier_source_value` (for procedures)

### Notes

- **Domain-based routing**: LOINC code domain determines target table
- **SNOMED conclusions**: Each conclusion code creates a separate record
- **Bulk/incremental**: Supports both load modes
- **Complex SNOMED**: Handles post-coordinated SNOMED expressions
- **Multiple conclusions**: Multiple conclusion codes create multiple OMOP records
