# OMOP Common Data Model - Repository Index

Repository: `CommonDataModel/` (submodule from https://github.com/OHDSI/CommonDataModel)

## CDM Versions

| Version | Status | Notes |
|---------|--------|-------|
| v5.3    | Supported | Stable |
| v5.4    | **Current** | Recommended |
| v6.0    | Not fully supported | datetime fields mandatory - not recommended |

## Repository Structure

```
CommonDataModel/
├── inst/
│   ├── csv/                    # Table and field definitions (source of truth)
│   │   ├── OMOP_CDMv5.4_Table_Level.csv
│   │   ├── OMOP_CDMv5.4_Field_Level.csv
│   │   └── ...
│   └── ddl/                    # Generated DDL scripts
│       ├── 5.3/
│       └── 5.4/
│           ├── postgresql/
│           ├── sql_server/
│           ├── oracle/
│           └── ... (15 dialects)
├── R/                          # R package functions
├── rmd/                        # Documentation source (RMarkdown)
├── docs/                       # Generated documentation
├── extras/                     # Helper scripts
└── tests/                      # Unit tests
```

## Supported SQL Dialects

bigquery, duckdb, hive, impala, netezza, oracle, pdw, postgresql, redshift, snowflake, spark, sql_server, sqlite, sqlite_extended, synapse

## CDM Tables by Schema

### CDM Schema (Clinical Data)

#### Person & Demographics
| Table | Required | Description |
|-------|----------|-------------|
| **person** | Yes | Central identity - demographics, birth date, gender, race, ethnicity |
| **observation_period** | Yes | Time spans when clinical events are recorded |
| **death** | No | Death events with cause |

#### Clinical Events
| Table | Required | Description |
|-------|----------|-------------|
| **visit_occurrence** | No | Healthcare encounters (inpatient, outpatient, ER, etc.) |
| **visit_detail** | No | Sub-visits within a visit (transfers, units) |
| **condition_occurrence** | No | Diagnoses, signs, symptoms |
| **drug_exposure** | No | Medications prescribed, dispensed, administered |
| **procedure_occurrence** | No | Medical procedures performed |
| **device_exposure** | No | Medical devices used |
| **measurement** | No | Lab tests, vitals, quantitative observations |
| **observation** | No | Other clinical facts (social, lifestyle, history) |
| **note** | No | Free-text clinical notes |
| **note_nlp** | No | NLP-extracted terms from notes |
| **specimen** | No | Biological samples |

#### Derived Tables (Eras)
| Table | Required | Description |
|-------|----------|-------------|
| **drug_era** | No | Continuous drug exposure spans |
| **dose_era** | No | Constant dose exposure periods |
| **condition_era** | No | Continuous condition spans |

#### Episode Tables
| Table | Required | Description |
|-------|----------|-------------|
| **episode** | No | Higher-level clinical abstractions (e.g., cancer treatment) |
| **episode_event** | No | Links episodes to clinical events |

#### Health System
| Table | Required | Description |
|-------|----------|-------------|
| **location** | No | Physical addresses |
| **care_site** | No | Healthcare facilities |
| **provider** | No | Healthcare providers |
| **payer_plan_period** | No | Insurance enrollment periods |
| **cost** | No | Cost information for clinical events |

#### Metadata
| Table | Required | Description |
|-------|----------|-------------|
| **metadata** | No | Dataset metadata |
| **cdm_source** | No | Source database and ETL info |
| **fact_relationship** | No | Relationships between facts |

### Vocabulary Schema (Reference Tables)

| Table | Description |
|-------|-------------|
| **concept** | All standardized concepts (SNOMED, LOINC, RxNorm, etc.) |
| **vocabulary** | List of source vocabularies |
| **domain** | Clinical domains (Condition, Drug, Procedure, etc.) |
| **concept_class** | Semantic categories within vocabularies |
| **concept_relationship** | Relationships between concepts |
| **relationship** | Types of relationships |
| **concept_synonym** | Alternative names/translations |
| **concept_ancestor** | Hierarchical relationships |
| **source_to_concept_map** | Custom source code mappings |
| **drug_strength** | Drug ingredient amounts |

### Results Schema

| Table | Description |
|-------|-------------|
| **cohort** | Defined patient cohorts |
| **cohort_definition** | Cohort logic definitions |

## Key CSV Files (Source of Truth)

### Table Level (`OMOP_CDMv5.4_Table_Level.csv`)
Columns: `cdmTableName`, `schema`, `isRequired`, `tableDescription`, `userGuidance`, `etlConventions`

### Field Level (`OMOP_CDMv5.4_Field_Level.csv`)
Columns: `cdmTableName`, `cdmFieldName`, `isRequired`, `cdmDatatype`, `userGuidance`, `etlConventions`, `isPrimaryKey`, `isForeignKey`, `fkTableName`, `fkFieldName`, `fkDomain`

## Common Data Types

| Type | Description |
|------|-------------|
| `integer` | Whole numbers (IDs, counts) |
| `bigint` | Large integers |
| `float` | Decimal numbers |
| `varchar(n)` | Variable-length strings |
| `date` | Date only |
| `datetime` | Date and time |

## Key Concepts

### Concept IDs
- Every clinical fact references `concept_id` from the vocabulary
- `*_concept_id` = Standard concept (for analysis)
- `*_source_concept_id` = Original source vocabulary concept
- `*_source_value` = Raw value from source data

### Type Concepts
- `*_type_concept_id` fields indicate data provenance
- Examples: EHR, Claims, Registry, Patient-reported

### Visit Types
| Concept ID | Name |
|------------|------|
| 9201 | Inpatient Visit |
| 9202 | Outpatient Visit |
| 9203 | Emergency Room Visit |
| 262 | ER + Inpatient |
| 581476 | Home Visit |
| 5083 | Telehealth |

## Using the R Package

```r
# Install
install.packages("devtools")
devtools::install_github("OHDSI/CommonDataModel")

# List supported versions
CommonDataModel::listSupportedVersions()

# Generate DDL files
CommonDataModel::buildRelease(
  cdmVersions = "5.4",
  targetDialects = "postgresql",
  outputfolder = "/path/to/output"
)

# Execute DDL directly
CommonDataModel::executeDdl(
  connectionDetails = cd,
  cdmVersion = "5.4",
  cdmDatabaseSchema = "my_schema"
)
```

## Documentation Links

- Online docs: https://ohdsi.github.io/CommonDataModel/
- CDM v5.4 spec: https://ohdsi.github.io/CommonDataModel/cdm54.html
- Book of OHDSI: https://ohdsi.github.io/TheBookOfOhdsi/
- THEMIS conventions: https://ohdsi.github.io/Themis/
- Athena vocabulary search: https://athena.ohdsi.org/

## Related Tools

- **WhiteRabbit**: Scan source data for ETL preparation
- **Rabbit-in-a-Hat**: Design ETL mappings
- **Usagi**: Map source codes to standard concepts
- **ATLAS**: Web-based cohort builder and analytics
- **HADES**: R packages for analytics
