# FHIR-OMOP Development Sandbox (fhir-reasoning-omop-ri)

## Project Information

- **Project Name**: FHIR-OMOP Development Sandbox
- **Repository URL**: https://github.com/HL7/fhir-reasoning-omop-ri
- **Organization**: HL7 International
- **Purpose**: Reference implementation for testing OMOP↔FHIR transformations with focus on Digital Quality Measures (dQM)

## Purpose/Description

A unified development environment for digital quality measure evaluations. Provides infrastructure for:

1. Translating Synthea patients into OMOP CDM using ETL-Synthea
2. Leveraging FHIR clinical reasoning module via CQF Ruler
3. Viewing CDM patient cohorts using Atlas UI
4. Interacting with OMOP through a FHIR server via OMOPonFHIR
5. Populating FHIR servers with vocabularies, patients using HAPI FHIR CLI

## Key Features

- **Docker Compose Stack**: Complete development environment
- **Synthea→OMOP ETL**: Automated synthetic patient loading
- **CQF Ruler Integration**: FHIR clinical quality language execution
- **Atlas UI**: OHDSI cohort exploration
- **OMOPonFHIR Server**: Bidirectional OMOP↔FHIR access
- **Vocabulary Loading**: Scripts for LOINC, SNOMED-CT, ICD-10

## Architecture

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| Atlas UI | localhost/atlas | OHDSI cohort exploration |
| CQF Ruler | localhost:8081 | FHIR clinical reasoning server |
| WebAPI | localhost:8080 | OHDSI WebAPI |
| OMOPonFHIR | localhost:8082 | FHIR R4 server on OMOP |
| Synthea DB | localhost:54320 | PostgreSQL for CDM data |
| WebAPI DB | localhost:54321 | PostgreSQL for WebAPI |

### Data Flow

```
Synthea CSV → ETL-Synthea → OMOP CDM (Postgres) → OMOPonFHIR → FHIR R4
                                ↓
                            Atlas UI
```

## Prerequisites

- Athena account (vocabulary downloads)
- UMLS account (CPT vocabulary expansion)
- Docker with 6+ CPUs and 16GB RAM recommended
- Several hours for vocabulary loading

## Directory Structure

```
fhir-reasoning-omop-ri/
├── atlas/                    # Atlas UI configuration
├── cqf-ruler/               # CQF Ruler server + vocabulary loading
├── docs/                    # Documentation
├── etl-synthea_cdm/         # Synthea→OMOP ETL scripts
│   ├── synthea/             # Place Synthea CSV output here
│   └── vocabulary/          # Place Athena vocabularies here
├── webapi/                  # OHDSI WebAPI configuration
│   ├── connectCDM/          # Scripts to connect CDM to Atlas
│   ├── cohort-initialize/   # Default cohort definitions loader
│   └── removeCDM/           # Scripts to remove CDM from Atlas
└── docker-compose.yml       # Main orchestration file
```

## Setup Steps

1. **Vocabularies**: Download from Athena, expand CPT with UMLS API key
2. **Start Stack**: `docker compose build && docker compose up`
3. **Load Synthea Data**: Place CSV in `etl-synthea_cdm/synthea/`, run ETL
4. **Connect CDM to Atlas**: Run `webapi/connectCDM/docker_add_cdm.sh`
5. **Load Cohort Definitions**: From OHDSI Phenotype Library
6. **Load CQF-Ruler Vocabularies**: Via HAPI FHIR CLI
7. **Upload FHIR Patients**: Use `cqf-ruler/fhir-uploader` script

## Technology Stack

- **Databases**: PostgreSQL
- **FHIR Server**: CQF Ruler (HAPI-based), OMOPonFHIR
- **ETL**: ETL-Synthea (R-based)
- **UI**: OHDSI Atlas
- **Orchestration**: Docker Compose
- **OMOP Version**: CDM v5.4
- **FHIR Version**: R4

## Use Cases

- Testing Digital Quality Measures (dQM)
- FHIR-based clinical reasoning development
- OMOP↔FHIR transformation testing
- Cohort definition development
- Vocabulary integration testing

## License

Not explicitly specified in repository.

## Notes

- LOINC 2.7.3 requires file structure modifications for HAPI FHIR CLI compatibility
- Cohort definitions sourced from OHDSI Phenotype Library
- WebAPI database separate from Synthea CDM database
- Requires significant resources and setup time

---

## Patient Mapping Details

**Note**: This is an **infrastructure/integration project** that orchestrates existing tools. It does not implement its own Patient mapping.

### Mapping Pipeline

Patient data flows through two transformation layers:

1. **Synthea CSV → OMOP CDM** (via ETL-Synthea R package)
2. **OMOP CDM → FHIR R4** (via OMOPonFHIR)

### ETL-Synthea Component

**Source**: `etl-synthea_cdm/a.R`

Uses OHDSI/ETL-Synthea R package for Synthea→OMOP transformation:

```r
devtools::install_github("OHDSI/ETL-Synthea", upgrade="always")
library(ETLSyntheaBuilder)

# Create OMOP CDM tables
ETLSyntheaBuilder::CreateCDMTables(connectionDetails = cd, cdmSchema = cdmSchema, cdmVersion = cdmVersion)

# Load Synthea CSV files
ETLSyntheaBuilder::LoadSyntheaTables(connectionDetails = cd, syntheaSchema = syntheaSchema, syntheaFileLoc = syntheaFileLoc)

# Transform to OMOP CDM events
ETLSyntheaBuilder::LoadEventTables(connectionDetails = cd, cdmSchema = cdmSchema, syntheaSchema = syntheaSchema, ...)
```

### Synthea Patient → OMOP PERSON (via ETL-Synthea)

ETL-Synthea maps Synthea's `patients.csv` to OMOP `person` table:

| Synthea patients.csv | OMOP PERSON Field |
|----------------------|-------------------|
| `Id` | `person_source_value` |
| `BIRTHDATE` | `year_of_birth`, `month_of_birth`, `day_of_birth` |
| `GENDER` | `gender_concept_id` (M→8507, F→8532) |
| `RACE` | `race_concept_id` |
| `ETHNICITY` | `ethnicity_concept_id` |

See full ETL-Synthea mapping: https://github.com/OHDSI/ETL-Synthea

### OMOPonFHIR Component

For OMOP→FHIR direction, this project uses OMOPonFHIR (port 8082).

See: [omoponfhir-v54-r4.md](./omoponfhir-v54-r4.md) for detailed OMOP→FHIR Patient mapping.

### Configuration

```r
cdmSchema      <- "cdm_synthea"
cdmVersion     <- "5.4"
syntheaVersion <- "2.7.0"
syntheaSchema  <- "native"
```

### Additional Tables

Creates OMOPonFHIR extension tables via:
```r
source("R/CreateOMOPonFHIRTables.r")
CreateOMOPonFHIRTables(connectionDetails = cd, cdmSchema = cdmSchema, ...)
```

These include `f_person` for extended FHIR Patient fields (name, contact, etc.).

---

## Observation → OMOP Mapping Details

**Note**: This is an **infrastructure/integration project** that orchestrates existing tools. It does not implement its own Observation mapping but provides SQL views for OMOPonFHIR integration.

### f_observation_view DDL

**Source**: [`etl-synthea_cdm/additional_sql/omoponfhir_v5.4_f_observation_ddl.sql`](https://github.com/HL7/fhir-reasoning-omop-ri/blob/main/etl-synthea_cdm/additional_sql/omoponfhir_v5.4_f_observation_ddl.sql)

Creates a unified view that combines OMOP `measurement` and `observation` tables for OMOPonFHIR's FHIR Observation resource:

```sql
CREATE VIEW f_observation_view (
    observation_id, person_id, observation_concept_id, observation_date,
    observation_datetime, observation_time, observation_type_concept_id,
    observation_operator_concept_id, value_as_number, value_as_string,
    value_as_concept_id, qualifier_concept_id, unit_concept_id,
    range_low, range_high, provider_id, visit_occurrence_id, visit_detail_id,
    observation_source_value, observation_source_concept_id, unit_source_value,
    qualifier_source_value, unit_source_concept_id, value_source_value,
    observation_event_id, obs_event_field_concept_id
) AS
SELECT
    measurement.measurement_id AS observation_id,
    -- ... measurement fields aliased to observation names
FROM measurement
UNION ALL
SELECT
    observation.observation_id AS observation_id,
    -- ... observation fields
FROM observation;
```

### Field Mapping from MEASUREMENT to Unified View

| measurement Column | f_observation_view Column |
|--------------------|---------------------------|
| `measurement_id` | `observation_id` |
| `measurement_concept_id` | `observation_concept_id` |
| `measurement_date` | `observation_date` |
| `measurement_datetime` | `observation_datetime` |
| `measurement_time` | `observation_time` |
| `measurement_type_concept_id` | `observation_type_concept_id` |
| `operator_concept_id` | `observation_operator_concept_id` |
| `measurement_source_value` | `observation_source_value` |
| `measurement_source_concept_id` | `observation_source_concept_id` |
| `measurement_event_id` | `observation_event_id` |
| `meas_event_field_concept_id` | `obs_event_field_concept_id` |

### Fields Set to NULL for MEASUREMENT Records

When sourcing from measurement table:
- `value_as_string` → NULL
- `qualifier_concept_id` → NULL
- `qualifier_source_value` → NULL
- `unit_source_concept_id` → NULL

### Fields Set to NULL for OBSERVATION Records

When sourcing from observation table:
- `observation_time` → NULL
- `observation_operator_concept_id` → NULL
- `range_low` → NULL
- `range_high` → NULL
- `unit_source_concept_id` → NULL

### Mapping Pipeline

Observation data flows through two transformation layers:

1. **Synthea CSV → OMOP CDM** (via ETL-Synthea R package)
   - Synthea `observations.csv` → OMOP `observation` table
   - Synthea measurements → OMOP `measurement` table

2. **OMOP CDM → FHIR R4** (via OMOPonFHIR + f_observation_view)
   - OMOPonFHIR reads from `f_observation_view`
   - Returns unified FHIR Observation resources

### ETL-Synthea Observation Mapping

ETL-Synthea handles Synthea→OMOP transformation. Key mappings:

| Synthea observations.csv | OMOP Table | Notes |
|--------------------------|------------|-------|
| Vital signs | `measurement` | BP, heart rate, etc. |
| Lab results | `measurement` | Numeric lab values |
| Social history | `observation` | Smoking, alcohol |
| Other observations | `observation` | Survey responses |

See full ETL-Synthea mapping: https://github.com/OHDSI/ETL-Synthea

### OMOPonFHIR Component

For OMOP→FHIR Observation direction, this project uses OMOPonFHIR (port 8082).

See: [omoponfhir-v54-r4.md](./omoponfhir-v54-r4.md) for detailed OMOP→FHIR Observation mapping.

### Notes

- **Infrastructure project**: Does not implement mapping logic directly
- **Unified view**: Combines measurement + observation for simpler FHIR mapping
- **ETL-Synthea**: Handles Synthea→OMOP; see OHDSI documentation
- **OMOPonFHIR**: Handles OMOP→FHIR; see omoponfhir-v54-r4.md

---

## Encounter → OMOP VISIT_OCCURRENCE Mapping

**Note**: This is an **infrastructure/integration project** that orchestrates existing tools. It does not implement its own Encounter mapping.

### Mapping Pipeline

Encounter data flows through two transformation layers:

1. **Synthea CSV → OMOP CDM** (via ETL-Synthea R package)
   - Synthea `encounters.csv` → OMOP `visit_occurrence` table

2. **OMOP CDM → FHIR R4** (via OMOPonFHIR)
   - OMOP `visit_occurrence` → FHIR Encounter

### ETL-Synthea Encounter Mapping

ETL-Synthea handles Synthea→OMOP transformation for visits:

| Synthea encounters.csv | OMOP VISIT_OCCURRENCE Field |
|-----------------------|----------------------------|
| `Id` | `visit_source_value` |
| `START` | `visit_start_date`, `visit_start_datetime` |
| `STOP` | `visit_end_date`, `visit_end_datetime` |
| `PATIENT` | `person_id` (via patient lookup) |
| `ENCOUNTERCLASS` | `visit_concept_id` (via mapping) |
| `PROVIDER` | `provider_id` |
| `ORGANIZATION` | `care_site_id` |

### Visit Concept Mapping (ETL-Synthea)

| Synthea ENCOUNTERCLASS | OMOP visit_concept_id |
|------------------------|----------------------|
| `wellness` | 9202 (Outpatient Visit) |
| `outpatient` | 9202 (Outpatient Visit) |
| `inpatient` | 9201 (Inpatient Visit) |
| `emergency` | 9203 (Emergency Room Visit) |
| `urgentcare` | 9203 (Emergency Room Visit) |
| `ambulatory` | 9202 (Outpatient Visit) |

See full ETL-Synthea mapping: https://github.com/OHDSI/ETL-Synthea

### OMOPonFHIR Component

For OMOP→FHIR Encounter direction, this project uses OMOPonFHIR (port 8082).

See: [omoponfhir-v54-r4.md](./omoponfhir-v54-r4.md) for detailed OMOP→FHIR Encounter mapping.

### Notes

- **Infrastructure project**: Does not implement mapping logic directly
- **ETL-Synthea**: Handles Synthea→OMOP; see OHDSI documentation
- **OMOPonFHIR**: Handles OMOP→FHIR; see omoponfhir-v54-r4.md

---

## Condition → OMOP CONDITION_OCCURRENCE Mapping

**Note**: This is an **infrastructure/integration project** that orchestrates existing tools. It does not implement its own Condition mapping.

### Mapping Pipeline

Condition data flows through two transformation layers:

1. **Synthea CSV → OMOP CDM** (via ETL-Synthea R package)
   - Synthea `conditions.csv` → OMOP `condition_occurrence` table

2. **OMOP CDM → FHIR R4** (via OMOPonFHIR)
   - OMOP `condition_occurrence` → FHIR Condition

### ETL-Synthea Condition Mapping

ETL-Synthea handles Synthea→OMOP transformation for conditions:

| Synthea conditions.csv | OMOP CONDITION_OCCURRENCE Field |
|-----------------------|--------------------------------|
| `PATIENT` | `person_id` (via patient lookup) |
| `ENCOUNTER` | `visit_occurrence_id` (via encounter lookup) |
| `CODE` | `condition_source_value` |
| `CODE` | `condition_concept_id` (via SNOMED lookup) |
| `START` | `condition_start_date`, `condition_start_datetime` |
| `STOP` | `condition_end_date`, `condition_end_datetime` |
| (derived) | `condition_type_concept_id` = 32020 (EHR encounter diagnosis) |

See full ETL-Synthea mapping: https://github.com/OHDSI/ETL-Synthea

### OMOPonFHIR Component

For OMOP→FHIR Condition direction, this project uses OMOPonFHIR (port 8082).

See: [omoponfhir-v54-r4.md](./omoponfhir-v54-r4.md) for detailed OMOP→FHIR Condition mapping.

### Notes

- **Infrastructure project**: Does not implement mapping logic directly
- **ETL-Synthea**: Handles Synthea→OMOP; see OHDSI documentation
- **OMOPonFHIR**: Handles OMOP→FHIR; see omoponfhir-v54-r4.md

---

## Procedure → OMOP PROCEDURE_OCCURRENCE Mapping

**Note**: This is an **infrastructure/integration project** that orchestrates existing tools. It does not implement its own Procedure mapping.

### Mapping Pipeline

Procedure data flows through two transformation layers:

1. **Synthea CSV → OMOP CDM** (via ETL-Synthea R package)
   - Synthea `procedures.csv` → OMOP `procedure_occurrence` table

2. **OMOP CDM → FHIR R4** (via OMOPonFHIR)
   - OMOP `procedure_occurrence` → FHIR Procedure

### ETL-Synthea Procedure Mapping

ETL-Synthea handles Synthea→OMOP transformation for procedures:

| Synthea procedures.csv | OMOP PROCEDURE_OCCURRENCE Field |
|-----------------------|--------------------------------|
| `PATIENT` | `person_id` (via patient lookup) |
| `ENCOUNTER` | `visit_occurrence_id` (via encounter lookup) |
| `CODE` | `procedure_source_value` |
| `CODE` | `procedure_concept_id` (via SNOMED lookup) |
| `DATE` | `procedure_date`, `procedure_datetime` |
| (derived) | `procedure_type_concept_id` = 38000275 (EHR order) |

See full ETL-Synthea mapping: https://github.com/OHDSI/ETL-Synthea

### OMOPonFHIR Component

For OMOP→FHIR Procedure direction, this project uses OMOPonFHIR (port 8082).

See: [omoponfhir-v54-r4.md](./omoponfhir-v54-r4.md) for detailed OMOP→FHIR Procedure mapping.

### Notes

- **Infrastructure project**: Does not implement mapping logic directly
- **ETL-Synthea**: Handles Synthea→OMOP; see OHDSI documentation
- **OMOPonFHIR**: Handles OMOP→FHIR; see omoponfhir-v54-r4.md for Procedure details

---

## MedicationStatement → OMOP DRUG_EXPOSURE Mapping

**Note**: This is an **infrastructure/integration project** that orchestrates existing tools. It does not implement its own MedicationStatement mapping.

### Mapping Pipeline

Medication data flows through two transformation layers:

1. **Synthea CSV → OMOP CDM** (via ETL-Synthea R package)
   - Synthea `medications.csv` → OMOP `drug_exposure` table

2. **OMOP CDM → FHIR R4** (via OMOPonFHIR)
   - OMOP `drug_exposure` → FHIR MedicationStatement

### ETL-Synthea Medication Mapping

ETL-Synthea handles Synthea→OMOP transformation for medications:

| Synthea medications.csv | OMOP DRUG_EXPOSURE Field |
|------------------------|--------------------------|
| `PATIENT` | `person_id` (via patient lookup) |
| `ENCOUNTER` | `visit_occurrence_id` (via encounter lookup) |
| `CODE` | `drug_source_value` |
| `CODE` | `drug_concept_id` (via RxNorm lookup) |
| `START` | `drug_exposure_start_date`, `drug_exposure_start_datetime` |
| `STOP` | `drug_exposure_end_date`, `drug_exposure_end_datetime` |
| (derived) | `drug_type_concept_id` = 38000177 (Prescription written) |

See full ETL-Synthea mapping: https://github.com/OHDSI/ETL-Synthea

### OMOPonFHIR Component

For OMOP→FHIR MedicationStatement direction, this project uses OMOPonFHIR (port 8082).

See: [omoponfhir-v54-r4.md](./omoponfhir-v54-r4.md) for detailed OMOP→FHIR MedicationStatement mapping.

### Notes

- **Infrastructure project**: Does not implement mapping logic directly
- **ETL-Synthea**: Handles Synthea→OMOP; see OHDSI documentation
- **OMOPonFHIR**: Handles OMOP→FHIR; see omoponfhir-v54-r4.md for MedicationStatement details
