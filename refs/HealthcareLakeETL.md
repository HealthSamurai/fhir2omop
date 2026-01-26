# HealthcareLakeETL

## Project Information

- **Project Name**: HealthcareLakeETL
- **Repository URL**: https://github.com/spe-uob/2020-HealthcareLakeETL
- **Organization**: University of Bristol (Software Product Engineering course project)
- **Related Project**: [HealthcareLake](https://github.com/spe-uob/HealthcareLake)

## Purpose/Description

PySpark-based ETL jobs for transforming FHIR data to OMOP CDM, designed to run on AWS Glue. The project transforms patient-level FHIR data into population-level OMOP CDM format for use with OHDSI analytics tools.

The mapping follows the HL7 CDMH (Common Data Model Harmonization) specification: https://build.fhir.org/ig/HL7/cdmh/profiles.html#omop-to-fhir-mappings

## Key Features

- **PySpark Transformations**: Scalable data processing
- **AWS Glue Compatible**: Designed for cloud ETL pipelines
- **Jupyter Notebook Support**: Local development environment
- **Terraform Infrastructure**: AWS resource provisioning
- **Unit Tests**: Test coverage for mappings

## OMOP Tables Supported

Based on the mapping modules:

| OMOP Table | Source | Mapping File |
|------------|--------|--------------|
| Person | FHIR Patient | `mappings/patient.py` |
| Visit_Occurrence | FHIR Encounter | `mappings/visit_occurrence.py` |
| Observation | FHIR Observation | `mappings/observation.py` |
| Measurement | FHIR Observation | `mappings/measurement.py` |
| Procedure_Occurrence | FHIR Procedure | `mappings/procedure_occurrence.py` |
| Device_Exposure | FHIR Device | `mappings/device_exposure.py` |

## Directory Structure

```
HealthcareLakeETL/
├── data/                    # Sample data
├── mappings/               # PySpark transformation modules
│   ├── patient.py          # Patient → Person
│   ├── visit_occurrence.py # Encounter → Visit_Occurrence
│   ├── observation.py      # Observation → Observation
│   ├── measurement.py      # Observation → Measurement
│   ├── procedure_occurrence.py
│   └── device_exposure.py
├── notebooks/              # Jupyter notebooks for development
├── tests/                  # Unit tests
├── main.py                 # Entry point
├── main.tf                 # Terraform configuration
├── variables.tf            # Terraform variables
├── outputs.tf              # Terraform outputs
└── requirements.txt        # Python dependencies
```

## Technology Stack

- **Language**: Python 3.7
- **Processing**: Apache Spark (PySpark)
- **Cloud Platform**: AWS Glue
- **Infrastructure**: Terraform
- **Development**: Jupyter Notebooks, Anaconda

## Local Development Setup

```bash
# Create conda environment
conda create --name etl python=3.7
conda activate etl

# Install Jupyter kernel
pip install --user ipykernel
python -m ipykernel install --user --name=etl

# Install PySpark
pip install pyspark

# Start Jupyter
jupyter notebook
```

## Usage

```python
from pyspark.sql import SparkSession

# Create Spark session
spark = SparkSession.builder.appName('etl').getOrCreate()

# Read FHIR data
df = spark.read.parquet('data/catalog.parquet')

# Apply transformations from mappings module
```

## AWS Deployment

Uses Terraform for AWS infrastructure provisioning. The pipeline is designed to run as AWS Glue jobs for scalable cloud processing.

## License

MIT License (based on repository structure)

## Notes

- Academic project from University of Bristol Software Engineering course
- Designed for HealthcareLake data platform integration
- Local development via Jupyter notebooks, production via AWS Glue
- Uses HL7 CDMH mapping specifications as reference

---

## Patient → OMOP Mapping Details

**Source**: [`mappings/patient.py`](https://github.com/spe-uob/2020-HealthcareLakeETL/blob/main/mappings/patient.py)

### FHIR Patient → OMOP PERSON (PySpark)

| OMOP PERSON Field | FHIR Patient Source | PySpark Function |
|-------------------|---------------------|------------------|
| `person_id` | `Patient.identifier` | `withColumnRenamed("identifier", "person_id")` |
| `gender_concept_id` | `Patient.gender` | `withColumnRenamed("gender", "gender_concept_id")` |
| `year_of_birth` | `Patient.birthDate` | `year(patients['birthDate'])` |
| `month_of_birth` | `Patient.birthDate` | `month(patients['birthDate'])` |
| `day_of_birth` | `Patient.birthDate` | `dayofmonth(patients['birthDate'])` |
| `birth_datetime` | `Patient.birthDate` | `withColumnRenamed("birthDate", "birth_datetime")` |

### Code Implementation

```python
from pyspark.sql.functions import dayofmonth, month, year

def map_patient(df):
    """Patient->Person (FHIR->OMOP)"""
    patients = df.filter(df['resourceType'] == 'Patient')
    persons = patients.select(['id', 'gender', 'birthDate'])

    stage_persons = persons\
        .withColumn("year_of_birth", year(persons['birthDate']))\
        .withColumn("month_of_birth", month(persons['birthDate']))\
        .withColumn("day_of_birth", dayofmonth(persons['birthDate']))\
        .withColumnRenamed("birthDate", "birth_datetime")

    patient_dataframe = stage_persons\
        .withColumnRenamed("identifier", "person_id")\
        .withColumnRenamed("gender", "gender_concept_id")

    return patient_dataframe
```

### Fields NOT Mapped

The basic implementation does not map:
- `race_concept_id` / `race_source_value`
- `ethnicity_concept_id` / `ethnicity_source_value`
- `location_id`
- `provider_id`
- `care_site_id`
- `person_source_value`
- `gender_source_value`

### Notes

- **Minimal implementation**: Only basic fields are mapped
- **No concept translation**: `gender` value is passed directly (should be mapped to concept IDs 8507/8532)
- **Identifier handling**: Uses `identifier` column directly (may need extraction from FHIR identifier array)
- **Date parsing**: Uses PySpark date functions for birth date components
- Designed for Parquet input format from HealthcareLake data platform

---

## Observation → OMOP Mapping Details

**Source**: [`mappings/observation.py`](https://github.com/spe-uob/2020-HealthcareLakeETL/blob/main/mappings/observation.py), [`mappings/measurement.py`](https://github.com/spe-uob/2020-HealthcareLakeETL/blob/main/mappings/measurement.py)

### Domain Routing

FHIR Observation is split between two OMOP tables based on value type:

| Condition | OMOP Destination |
|-----------|------------------|
| `valueCodeableConcept` is NOT NULL | `observation` table |
| `valueCodeableConcept` is NULL (has `valueQuantity`) | `measurement` table |

This approach routes coded values (yes/no, positive/negative) to OMOP `observation` and numeric values to OMOP `measurement`.

### FHIR Observation → OMOP OBSERVATION (`observation.py`)

| OMOP OBSERVATION Field | FHIR Observation Source | PySpark Transform |
|------------------------|-------------------------|-------------------|
| `observation_id` | `Observation.id` | `withColumnRenamed("id", "observation_id")` |
| `person_id` | `Observation.subject.reference` | Extracted from reference |
| `observation_concept_id` | `Observation.code.coding[0].code` | Code extracted from coding array |
| `observation_date` | `Observation.effectiveDateTime` | Split on 'T', take date part |
| `observation_datetime` | `Observation.effectiveDateTime` | Direct rename |
| `observation_type_concept_id` | `Observation.category[0].coding[0].code` | Category code extracted |
| `value_as_string` | `Observation.valueCodeableConcept.text` | Text value from CodeableConcept |
| `visit_occurrence_id` | `Observation.encounter.reference` | Extracted from reference |
| `provider_id` | `Observation.performer` | Direct rename |

### FHIR Observation → OMOP MEASUREMENT (`measurement.py`)

| OMOP MEASUREMENT Field | FHIR Observation Source | PySpark Transform |
|------------------------|-------------------------|-------------------|
| `measurement_id` | `Observation.id` | `withColumnRenamed("id", "measurement_id")` |
| `person_id` | `Observation.subject.reference` | Extracted from reference |
| `measurement_concept_id` | `Observation.code.coding[0].code` | Code extracted from coding array |
| `measurement_date` | `Observation.effectiveDateTime` | Split on 'T', take date part |
| `measurement_datetime` | `Observation.effectiveDateTime` | Direct rename |
| `measurement_type_concept_id` | `Observation.category[0].coding[0].code` | Category code extracted |
| `value_as_number` | `Observation.valueQuantity.value` | Coalesce double/long |
| `unit_source_value` | `Observation.valueQuantity.unit` | Direct extraction |
| `visit_occurrence_id` | `Observation.encounter.reference` | Extracted from reference |
| `provider_id` | `Observation.performer` | Direct rename |

### Blood Pressure Handling

Blood pressure with components is handled specially in `measurement.py`:

```python
# Extract diastolic from component[0], systolic from component[1]
Measurement = Measurement.withColumn(
    "distolic", Measurement.component.getItem(0).valueQuantity.value)
Measurement = Measurement.withColumn(
    "systolic", Measurement.component.getItem(1).valueQuantity.value)

# Combine into array if diastolic > 0
Measurement = Measurement.withColumn(
    "value_as_num_combine",
    F.when(F.col("distolic") > 0, F.array("systolic", "distolic")))

# Use combined array or single value
Measurement = Measurement.withColumn(
    "value_as_number",
    F.coalesce(Measurement.value_as_num_combine, Measurement.value_as_number))
```

**Note**: This stores BP as an array `[systolic, diastolic]` in `value_as_number`, which is non-standard for OMOP CDM (normally requires two separate measurement rows).

### Code Implementation

**observation.py**:
```python
def map_observation(df):
    filtered = df.filter(df['resourceType'] == 'Observation')
    # Route to observation table if valueCodeableConcept exists
    Observation = filtered.filter(filtered.valueCodeableConcept.isNotNull())
    Observation = Observation.select(['id', 'subject', 'code', 'performer',
                                      'encounter', 'meta', 'effectiveDateTime',
                                      'valueCodeableConcept', 'category'])

    split_dates = F.split(Observation["effectiveDateTime"], 'T')

    Observation = Observation.withColumnRenamed("id", "observation_id")\
        .withColumn("observation_type_concept_id",
                   Observation.category.coding.getItem(0).code.getItem(0))\
        .withColumn("observation_date", split_dates.getItem(0))\
        .withColumn("person_id", Observation.subject.reference)\
        .withColumn("value_as_string", Observation.valueCodeableConcept.text)\
        # ... additional transformations

    return Observation
```

**measurement.py**:
```python
def map_measurement(df):
    filtered = df.filter(df['resourceType'] == 'Observation')
    # Route to measurement table if valueCodeableConcept is NULL
    Measurement = filtered.filter(filtered.valueCodeableConcept.isNull())
    Measurement = Measurement.select(['id', 'subject', 'code', 'performer',
                                      'encounter', 'meta', 'category',
                                      'valueQuantity', 'effectiveDateTime',
                                      'Extension.valueCodeableConcept', 'component'])

    val_as_num = F.coalesce(F.col("value_as_number.double"),
                            F.col("value_as_number.long"))
    # ... additional transformations

    return Measurement
```

### Fields NOT Mapped

- `observation_source_value` / `measurement_source_value`
- `observation_source_concept_id` / `measurement_source_concept_id`
- `value_as_concept_id` (for observation table)
- `unit_concept_id` (only unit_source_value is captured)
- `qualifier_concept_id` / `qualifier_source_value`
- `range_low` / `range_high`
- `visit_detail_id`

### Notes

- **Value-based routing**: Uses presence of `valueCodeableConcept` to determine destination table
- **No concept translation**: Codes passed directly without vocabulary lookup
- **Simplified type mapping**: Category code used directly as type_concept_id
- **BP handling quirk**: Stores blood pressure as array (non-standard)
- **Date parsing**: String split on 'T' for date extraction
- Designed for PySpark/AWS Glue execution environment

---

## Encounter → OMOP VISIT_OCCURRENCE Mapping

**Source**: [`mappings/visit_occurrence.py`](https://github.com/spe-uob/2020-HealthcareLakeETL/blob/main/mappings/visit_occurrence.py)

### FHIR Encounter → OMOP VISIT_OCCURRENCE

| OMOP VISIT_OCCURRENCE Field | FHIR Encounter Source | PySpark Transform |
|-----------------------------|----------------------|-------------------|
| `visit_occurrence_id` | `Encounter.id` | `withColumnRenamed("id", "visit_occurrence_id")` |
| `person_id` | `Encounter.subject` | `withColumnRenamed("subject", "person_id")` |
| `visit_concept_id` | `Encounter.type` | `withColumnRenamed("type", "visit_concept_id")` |
| `visit_start_date` | `Encounter.period.start` | Split on 'T', take date part |
| `visit_start_datetime` | `Encounter.period.start` | Split on 'T', take time part |
| `visit_end_date` | `Encounter.period.end` | Split on 'T', take date part |
| `visit_end_datetime` | `Encounter.period.end` | Split on 'T', take time part |
| `admitted_from_concept_id` | `Encounter.hospitalization.admitSource` | `withColumnRenamed("admitSource", ...)` |
| `care_site_id` | `Encounter.location` | `withColumnRenamed("location", "care_site_id")` |
| `provider_id` | `Encounter.provider` | `withColumnRenamed("provider", "provider_id")` |
| `visit_type_concept_id` | `Encounter.extension.valueCodeableConcept` | Via extension |

### Code Implementation

```python
def map_visit_occurrence(df):
    """VISIT_OCCURRENCE -> VISIT_OCCURRENCE (FHIR -> OMOP)"""
    # Filter By Encounter Resource type
    filtered = df.filter(df['resourceType'] == 'Encounter')
    Encounter = filtered.select(['id', 'subject', 'type', 'location', 'provider',
                                 'hospitalization.admitSource', 'period',
                                 'extension.valueCodeableConcept'])

    # Splits the date and time
    split_start = split(Encounter['period.start'], 'T')
    split_end = split(Encounter['period.end'], 'T')

    visit_date_time = Encounter\
        .withColumn("visit_start_date", split_start.getItem(0))\
        .withColumn("visit_start_datetime", split_start.getItem(1))\
        .withColumn("visit_end_date", split_end.getItem(0))\
        .withColumn("visit_end_datetime", split_end.getItem(1))

    dropped = visit_date_time.drop("period")

    visit_occurrence = dropped\
        .withColumnRenamed("id", "visit_occurrence_id")\
        .withColumnRenamed("admitSource", "admitted_from_concept_id")\
        .withColumnRenamed("subject", "person_id")\
        .withColumnRenamed("type", "visit_concept_id")\
        .withColumnRenamed("location", "care_site_id")\
        .withColumnRenamed("provider", "provider_id")\
        .withColumnRenamed("valueCodeableConcept", "visit_type_concept_id")

    return visit_occurrence
```

### Fields NOT Mapped

- `discharged_to_concept_id` - Commented out in code
- `visit_source_value`
- `visit_source_concept_id`
- `discharged_to_source_value`
- `admitted_from_source_value`
- `preceding_visit_occurrence_id`

### Notes

- **Minimal implementation**: Basic field mapping without concept translation
- **No concept lookup**: Values passed directly without vocabulary translation
- **Date parsing**: Simple string split on 'T' for date/time separation
- **Extension usage**: Visit type from custom extension
- **Location mapping**: FHIR Location mapped to care_site_id (may need adjustment)
- Designed for PySpark/AWS Glue execution environment

---

## Condition → OMOP CONDITION_OCCURRENCE Mapping

**Status**: **NOT IMPLEMENTED** (no condition mapping file found in repository)

### Current State

The project does not include a `condition_occurrence.py` mapping file. The mappings directory contains:
- `person.py` - Patient → Person
- `observation.py` - Observation → Observation
- `measurement.py` - Observation → Measurement
- `visit_occurrence.py` - Encounter → Visit_Occurrence

### Expected Implementation

If implemented, would follow the same pattern as other mappings:

| OMOP CONDITION_OCCURRENCE Field | FHIR Condition Source | Expected PySpark Transform |
|---------------------------------|----------------------|----------------------------|
| `condition_occurrence_id` | `Condition.id` | `withColumnRenamed("id", ...)` |
| `person_id` | `Condition.subject.reference` | Extract from reference |
| `condition_concept_id` | `Condition.code.coding[0].code` | Extract from coding array |
| `condition_start_date` | `Condition.onsetDateTime` | Split on 'T' |
| `condition_end_date` | `Condition.abatementDateTime` | Split on 'T' |
| `condition_type_concept_id` | `Condition.category[0].coding[0].code` | Extract from category |
| `visit_occurrence_id` | `Condition.encounter.reference` | Extract from reference |

### Notes

- **Not yet implemented**: No condition mapping exists in the codebase
- Would follow PySpark/AWS Glue patterns of other mappers
- Would likely use simple field renaming without vocabulary lookup
- Designed for batch processing of FHIR bundles
