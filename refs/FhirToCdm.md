# FhirToCdm

**Repository:** https://github.com/OHDSI/FhirToCdm

## Purpose

FhirToCdm is a console application that converts FHIR HL7 data to OMOP CDM format. It processes FHIR Bundle JSON files and outputs tab-delimited CSV files suitable for loading into an OMOP CDM database.

## Key Features

- Batch processing of FHIR JSON Bundle files
- Chunked output (default 10,000 records per chunk) for handling large datasets
- Vocabulary lookup against an existing OMOP vocabulary database (via ODBC)
- Support for multiple database backends for vocabulary (PostgreSQL, MySQL, MS SQL Server)
- Progress bar for monitoring conversion progress
- Outputs CSV files with headers, tab-delimited

## FHIR Resources Supported

| FHIR Resource | OMOP CDM Table |
|---------------|----------------|
| Patient | person, location |
| Encounter | visit_occurrence, provider |
| Condition | condition_occurrence |
| MedicationRequest | drug_exposure |
| Immunization | drug_exposure |
| Procedure | procedure_occurrence |
| AllergyIntolerance | observation |
| Observation | measurement |

### Mapping Details

**Patient to Person:**
- `Patient.birthDate` -> `year_of_birth`, `month_of_birth`, `day_of_birth`
- `Patient.gender` -> `gender_concept_id` (Male=8507, Female=8532)
- `Patient.address` -> location table (city, state, zip, country)
- US Core Race extension -> `race_concept_id`, `race_source_value`
- US Core Ethnicity extension -> `ethnicity_concept_id`, `ethnicity_source_value`

**Encounter to Visit Occurrence:**
- `Encounter.class.code` -> `visit_concept_id` (IMP=9201 inpatient, EMER=9203 emergency, default=9202 outpatient)
- `Encounter.period` -> `visit_start_date`, `visit_end_date`
- `Encounter.serviceProvider` -> provider table

**Condition to Condition Occurrence:**
- `Condition.code.coding` -> concept lookup via SNOMED vocabulary
- `Condition.onset` -> `condition_start_date`
- `Condition.abatement` -> `condition_end_date`

**MedicationRequest/Immunization to Drug Exposure:**
- `MedicationRequest.medication` -> concept lookup via RxNorm vocabulary
- `Immunization.vaccineCode` -> concept lookup via CVX vocabulary
- `MedicationRequest.dosageInstruction.text` -> `sig`

**Observation to Measurement:**
- `Observation.code.coding` -> concept lookup via LOINC vocabulary
- `Observation.value` (Quantity) -> `value_as_number`, `unit_source_value`
- `Observation.value` (CodeableConcept) -> `value_as_concept_id`
- `Observation.referenceRange` -> `range_low`, `range_high`

## Vocabulary Mapping

The tool supports the following FHIR code systems mapped to OMOP vocabularies:

| FHIR Code System | OMOP Vocabulary |
|------------------|-----------------|
| `http://snomed.info/sct` | SNOMED |
| `http://www.nlm.nih.gov/research/umls/rxnorm` | RxNorm |
| `http://hl7.org/fhir/sid/cvx` | CVX |
| `http://loinc.org` | LOINC |

Vocabulary lookups use SQL queries against the OMOP CONCEPT and CONCEPT_RELATIONSHIP tables to map source codes to standard concepts, including drug ingredient level mapping.

## OMOP CDM Versions Supported

- CDM v5.2 (V52)
- CDM v5.3 (V53) - default
- CDM v6 (V6)

## Technology/Language

- **Language:** C# (.NET Core 3.1)
- **Framework:** Console application
- **Key Dependencies:**
  - `Hl7.Fhir.R4` (v1.9.0) - FHIR R4 parsing
  - `org.ohdsi.cdm.framework.common` (v1.0.0) - OHDSI CDM framework
  - `System.Data.Odbc` - Database connectivity
  - `Npgsql` - PostgreSQL native driver
  - `CommandLineParser` - CLI argument parsing
  - `ShellProgressBar` - Progress display

## License

Apache License 2.0

## How to Use

### Command Line

```bash
FHIRtoCDM.exe -f <fhir_folder> -s <schema> -v "<odbc_connection_string>"
```

### Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `-f, --fhir` | Yes | - | FHIR files location (folder with .json files) |
| `-v, --vocabulary` | Yes | - | ODBC connection string to vocabulary database |
| `-s, --schema` | Yes | - | Vocabulary database schema |
| `-c, --cdm` | No | V53 | CDM version (V52, V53, V6) |
| `-r, --result` | No | CDM | Result folder name |
| `-u, --chunk` | No | 10000 | Chunk size (records per output file) |

### ODBC Connection String Templates

**PostgreSQL:**
```
Driver={PostgreSQL UNICODE};Server={server};Port=5432;Database={database};Uid={username};Pwd={password};sslmode=require;UseDeclareFetch=1;
```

**MySQL:**
```
DRIVER={MySQL ODBC 8.0 UNICODE Driver};SERVER={server};DATABASE={database};USER={username};PASSWORD={password};OPTION=3;
```

**MS SQL Server:**
```
Driver={SQL Server Native Client 11.0};Server={server};Database={database};Uid={username};Pwd={password};
```

### Example

```bash
FHIRtoCDM.exe -f E:\output\fhir -s dbo -v "Driver={SQL Server Native Client 11.0};Server=your_server;Database=db_name;Uid=user;Pwd=pswd;"
```

### Output

Results are saved in the application folder under a `Result` subfolder (default: `CDM`). Output consists of:
- One CSV file per chunk per CDM table
- Tab-delimited format with headers
- Files for: person, location, provider, visit_occurrence, condition_occurrence, drug_exposure, procedure_occurrence, observation, measurement, etc.

### Prerequisites

1. An OMOP vocabulary database with standard CONCEPT, CONCEPT_RELATIONSHIP, and CONCEPT_ANCESTOR tables
2. FHIR R4 Bundle files in JSON format (one patient per file)
3. .NET Core 3.1 runtime or the pre-built executable

## Architecture

The tool uses a chunked processing approach:
1. Loads vocabulary lookups from database into memory
2. Processes FHIR JSON files sequentially
3. Builds CDM entities using `CdmPersonBuilder`
4. Outputs CSV files in chunks for efficient database loading

The mapping logic is centralized in `FhirToCdmMappings.cs` which handles the transformation from FHIR resources to OMOP CDM entities.

---

## Patient → OMOP Mapping Details

**Source**: [`FhirToCdmMappings.cs`](https://github.com/OHDSI/FhirToCdm/blob/main/FhirToCdmMappings.cs) - `CreatePersonAndLocations()` method (lines 20-169)

### FHIR Patient → OMOP PERSON

| OMOP PERSON Field | FHIR Patient Source | Code Logic |
|-------------------|---------------------|------------|
| `person_source_value` | `Patient.id` | Direct assignment |
| `gender_source_value` | `Patient.gender` | `patient.Gender.ToString()` |
| `gender_concept_id` | `Patient.gender` | "Male"→8507, "Female"→8532, else→0 |
| `year_of_birth` | `Patient.birthDate` | `DateTime.Parse(patient.BirthDate).Year` |
| `month_of_birth` | `Patient.birthDate` | `DateTime.Parse(patient.BirthDate).Month` |
| `day_of_birth` | `Patient.birthDate` | `DateTime.Parse(patient.BirthDate).Day` |
| `race_source_value` | US Core Race extension | `item.Extension[0].Value.Display` |
| `race_concept_id` | US Core Race extension | See race mapping table below |
| `ethnicity_source_value` | US Core Ethnicity extension | `item.Extension[0].Value.Display` |
| `ethnicity_concept_id` | US Core Ethnicity extension | See ethnicity mapping table below |

### FHIR Patient → OMOP LOCATION

| OMOP LOCATION Field | FHIR Patient Source |
|---------------------|---------------------|
| `city` | `Patient.address[].city` |
| `state` | `Patient.address[].state` |
| `zip` | `Patient.address[].postalCode` |
| `country` | `Patient.address[].country` |
| `address_1` | (commented out in code) `Patient.address[].line[0]` |
| `address_2` | (commented out in code) `Patient.address[].line[1]` |

### Gender Concept Mapping

```csharp
switch (person.GenderSourceValue)
{
    case "Male":
        person.GenderConceptId = 8507;
        break;
    case "Female":
        person.GenderConceptId = 8532;
        break;
    default:
        person.GenderConceptId = 0;
        break;
}
```

### Race Concept Mapping

| Race Source Value | OMOP Concept ID | OMOP Concept Name |
|-------------------|-----------------|-------------------|
| `ASIAN` | 8515 | Asian |
| `BLACK` | 8516 | Black |
| `WHITE` | 8527 | White |
| `OTHER` | 8522 | Other Race |
| `HISPANIC` | 0 | (mapped to ethnicity instead) |
| (default) | 0 | No matching concept |

### Ethnicity Concept Mapping

| Ethnicity Source Value | OMOP Concept ID | OMOP Concept Name |
|------------------------|-----------------|-------------------|
| `CENTRAL_AMERICAN` | 38003563 | Hispanic or Latino |
| `DOMINICAN` | 38003563 | Hispanic or Latino |
| `MEXICAN` | 38003563 | Hispanic or Latino |
| `PUERTO_RICAN` | 38003563 | Hispanic or Latino |
| `SOUTH_AMERICAN` | 38003563 | Hispanic or Latino |
| (default) | 0 | No matching concept |

### US Core Extensions Used

The code looks for these US Core extension URLs:
- **Race**: `http://hl7.org/fhir/StructureDefinition/us-core-race`
- **Ethnicity**: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity`

### Code Example

```csharp
var person = new omop.Person
{
    GenderSourceValue = patient.Gender.ToString(),
    PersonSourceValue = patient.Id,
    YearOfBirth = DateTime.Parse(patient.BirthDate).Year,
    MonthOfBirth = DateTime.Parse(patient.BirthDate).Month,
    DayOfBirth = DateTime.Parse(patient.BirthDate).Day,
    EthnicityConceptId = 0
};

// Extension handling for race/ethnicity
foreach (var item in patient.Extension)
{
    if (item.Url == "http://hl7.org/fhir/StructureDefinition/us-core-race")
    {
        person.RaceSourceValue = ((Coding)item.Extension[0].Value).Display;
    }
    else if (item.Url == "...us-core-ethnicity")
    {
        person.EthnicitySourceValue = ((Coding)item.Extension[0].Value).Display;
    }
}
```

### Notes

- Birth datetime is not mapped (only date components)
- Death is checked via extensions but not fully implemented (line 44-47 is empty)
- GeneralPractitioner reference is detected but not mapped (line 65-68 is empty)
- Location address lines are commented out in code
- Multiple addresses per patient create multiple Location records
- Extension values can be in `item.Value` or `item.Extension[0].Value`

---

## Observation → OMOP Mapping Details

**Source**: [`FhirToCdmMappings.cs`](https://github.com/OHDSI/FhirToCdm/blob/main/FhirToCdmMappings.cs) - `CreateMeasurement()` method (lines 482-558)

**Note**: All FHIR Observations are mapped to OMOP **MEASUREMENT** table (not OBSERVATION table). AllergyIntolerance resources are mapped to OMOP OBSERVATION table separately.

### FHIR Observation → OMOP MEASUREMENT

| OMOP MEASUREMENT Field | FHIR Observation Source | Code Logic |
|------------------------|-------------------------|------------|
| `person_id` | `Observation.subject` | Via `GetPersonId1()` reference lookup |
| `measurement_concept_id` | `Observation.code.coding[]` | Vocabulary lookup via LOINC |
| `measurement_source_concept_id` | `Observation.code.coding[]` | From vocabulary lookup result |
| `measurement_type_concept_id` | (hardcoded) | `32817` (EHR) |
| `measurement_date` | `Observation.effectiveDateTime` | `DateTime.Parse()` |
| `visit_occurrence_id` | `Observation.encounter` | Via `GetVisitOccurrence()` reference lookup |
| `visit_detail_id` | `Observation.encounter` | Same as `visit_occurrence_id` |
| `value_as_number` | `Observation.valueQuantity.value` | `quantity.Value` |
| `value_source_value` | `Observation.valueQuantity.value` or `valueCodeableConcept.display` | String representation |
| `value_as_concept_id` | `Observation.valueCodeableConcept` | Vocabulary lookup on coded value |
| `unit_source_value` | `Observation.valueQuantity.unit` | `quantity.Unit` |
| `unit_concept_id` | `Observation.valueQuantity.unit` | Vocabulary lookup via "Unit" vocabulary |
| `range_low` | `Observation.referenceRange[0].low.value` | Direct assignment |
| `range_high` | `Observation.referenceRange[0].high.value` | Direct assignment |

### Value Type Handling

```csharp
if (observation.Value != null)
{
    var quantity = observation.Value as Quantity;
    if (quantity != null)
    {
        // Numeric value with unit
        m.UnitSourceValue = quantity.Unit;
        var unit = LookupCode(m.UnitSourceValue, "Unit");
        if (unit.Any() && unit[0].ConceptId.HasValue)
            m.UnitConceptId = unit[0].ConceptId.Value;
        m.ValueAsNumber = quantity.Value;
        m.ValueSourceValue = m.ValueAsNumber.ToString();
    }
    else
    {
        // Coded value
        var cc = observation.Value as CodeableConcept;
        if (cc != null && cc.Coding.Count > 0)
        {
            m.ValueSourceValue = cc.Coding[0].Display;
            var conceptId = LookupCode(cc.Coding[0]);
            if (conceptId.Any() && conceptId[0].ConceptId.HasValue)
                m.ValueAsConceptId = conceptId[0].ConceptId.Value;
        }
        else
        {
            // String fallback
            m.ValueSourceValue = observation.Value.ToString();
        }
    }
}
```

### Reference Range Handling

```csharp
if (observation.ReferenceRange != null && observation.ReferenceRange.Count > 0)
{
    if (observation.ReferenceRange[0].Low != null)
        m.RangeLow = observation.ReferenceRange[0].Low.Value;

    if (observation.ReferenceRange[0].High != null)
        m.RangeHigh = observation.ReferenceRange[0].High.Value;
}
```

### Vocabulary Lookup for Observation Codes

The code system mapping for Observation codes:

| FHIR Code System | OMOP Vocabulary | Typical Use |
|------------------|-----------------|-------------|
| `http://loinc.org` | LOINC | Lab observations, vitals |
| `http://snomed.info/sct` | SNOMED | Clinical observations |

```csharp
private List<LookupValue> LookupCode(Coding code)
{
    switch (code.System)
    {
        case "http://loinc.org":
            vocabularyName = "Loinc";
            break;
        // ... other systems
    }
    return LookupCode(code.Code, vocabularyName);
}
```

### AllergyIntolerance → OMOP OBSERVATION

AllergyIntolerance resources are mapped to the **OBSERVATION** table (not Measurement):

| OMOP OBSERVATION Field | FHIR AllergyIntolerance Source | Code Logic |
|------------------------|--------------------------------|------------|
| `person_id` | `AllergyIntolerance.patient` | Via reference lookup |
| `observation_concept_id` | `AllergyIntolerance.code.coding[]` | Vocabulary lookup |
| `observation_source_concept_id` | `AllergyIntolerance.code.coding[]` | From vocabulary result |
| `observation_type_concept_id` | (hardcoded) | `32817` (EHR) |
| `observation_date` | `AllergyIntolerance.recordedDate` | `DateTime.Parse()` |

### Notes

- **No domain routing**: All FHIR Observation resources go to MEASUREMENT regardless of category
- **No Observation table from Observation resource**: OMOP OBSERVATION is only used for AllergyIntolerance
- **Type concept hardcoded**: Always `32817` (EHR) for measurement_type_concept_id
- Only first reference range is used (`referenceRange[0]`)
- First coding in code array is used for concept lookup
- Visit reference resolution requires Encounter to be processed first
- No component handling - multi-component observations (like blood pressure) are not decomposed

---

## Encounter → OMOP VISIT_OCCURRENCE Mapping

**Source**: [`FhirToCdmMappings.cs`](https://github.com/OHDSI/FhirToCdm/blob/main/FhirToCdmMappings.cs) - `CreateVisitOccurenceAndProvider()`

### FHIR Encounter → OMOP VISIT_OCCURRENCE

| OMOP VISIT_OCCURRENCE Field | FHIR Encounter Source | C# Logic |
|-----------------------------|----------------------|----------|
| `PersonId` | `Encounter.Subject` | Via `GetPersonId1()` |
| `ConceptId` | `Encounter.Class.Code` | Visit type mapping (see below) |
| `StartDate` | `Encounter.Period.Start` | `DateTime.Parse()` |
| `EndDate` | `Encounter.Period.End` | `DateTime.Parse()` |
| `TypeConceptId` | (hardcoded) | `32817` (EHR) |
| `SourceValue` | `Encounter.Class.Code` | Class code string |
| `ProviderId` | `Encounter.ServiceProvider` | Provider entity created |

### Visit Concept Mapping

```csharp
var conceptId = 9202;  // Default: Outpatient Visit

if (encounter.Class.Code.ToUpper() == "IMP")
    conceptId = 9201;  // Inpatient Visit
else if (encounter.Class.Code.ToUpper() == "EMER")
    conceptId = 9203;  // Emergency Room Visit
```

| FHIR Class Code | OMOP Concept ID | Visit Type |
|-----------------|-----------------|------------|
| `IMP` | 9201 | Inpatient Visit |
| `EMER` | 9203 | Emergency Room Visit |
| (other) | 9202 | Outpatient Visit (default) |

### Provider Handling

```csharp
Provider provider = null;
if (encounter.ServiceProvider != null) {
    provider = new Provider {
        Id = Entity.GetId(encounter.ServiceProvider.Display),
        Name = encounter.ServiceProvider.Display,
        SourceValue = encounter.ServiceProvider.Display
    };
}
```

### Return Structure

Returns tuple containing:
1. `KeyValuePair<string, VisitOccurrence>` - Encounter ID to VisitOccurrence mapping
2. `Provider` - Associated provider (may be null)

```csharp
yield return new Tuple<KeyValuePair<string, VisitOccurrence>, Provider>(
    new KeyValuePair<string, VisitOccurrence>(encounter.Id, vo), provider);
```

### Notes

- **Simple class mapping**: Only IMP, EMER, and default (outpatient) supported
- **Type concept hardcoded**: Always `32817` (EHR)
- **Provider from ServiceProvider**: Not from participant
- **Source value**: Class code stored for reference
- **Comments indicate future work**: `care_site_id`, `admitting_source_concept_id`, `discharge_to_concept_id`, `preceding_visit_occurence` noted but not implemented

---

## Condition → OMOP CONDITION_OCCURRENCE Mapping

**Source**: [`FhirToCdmMappings.cs`](https://github.com/OHDSI/FhirToCdm/blob/main/FhirToCdmMappings.cs) - `CreateConditionOccurrence()`

### FHIR Condition → OMOP CONDITION_OCCURRENCE

| OMOP CONDITION_OCCURRENCE Field | FHIR Condition Source | C# Logic |
|---------------------------------|----------------------|----------|
| `PersonId` | `Condition.Subject` | Via `GetPersonId1()` |
| `ConceptId` | `Condition.Code.Coding[]` | Via `LookupCode()` |
| `SourceConceptId` | `Condition.Code.Coding[]` | From lookup result |
| `SourceValue` | `Condition.Code.Coding[].Code` | Direct |
| `StartDate` | `Condition.Onset` | `DateTime.Parse()` |
| `EndDate` | `Condition.Abatement` | `DateTime.Parse()` (if present) |
| `TypeConceptId` | (hardcoded) | `32817` (EHR) |
| `VisitOccurrenceId` | `Condition.Encounter` | Via visit lookup |
| `VisitDetailId` | `Condition.Encounter` | Same as visit |

### Implementation Code

```csharp
public IEnumerable<omop.ConditionOccurrence> CreateConditionOccurrence(
    Bundle fhir, Dictionary<string, long> personIds, Dictionary<string, VisitOccurrence> visits)
{
    foreach (var item in fhir.Entry.Where(e => e.Resource.TypeName == "Condition"))
    {
        var condition = (Condition)item.Resource;

        foreach (var code in condition.Code.Coding)
        {
            var date = DateTime.Parse(((FhirDateTime)condition.Onset).Value);
            var personId = GetPersonId1(condition.Subject, personIds);
            if (!personId.HasValue) continue;

            var co = new ConditionOccurrence(new Entity())
            {
                PersonId = personId.Value,
                TypeConceptId = 32817,
                StartDate = date,
                SourceValue = code.Code
            };

            if (condition.Abatement != null)
            {
                co.EndDate = DateTime.Parse(((FhirDateTime)condition.Abatement).Value);
            }

            var result = LookupCode(code);
            if (result.Any())
                SetConceptId(co, result[0]);

            // Domain-based type concept (though currently just sets 32817)
            if (co.Domain == "Drug")
                co.TypeConceptId = 32817;
            else if (co.Domain == "Observation")
                co.TypeConceptId = 32817;

            var vo = GetVisitOccurrence(condition.Encounter, visits);
            co.VisitOccurrenceId = vo.Id;
            co.VisitDetailId = vo.Id;

            if (!co.EndDate.HasValue)
                co.EndDate = vo.EndDate;

            yield return co;
        }
    }
}
```

### Domain Detection

Comments indicate intent for domain-based routing:
```csharp
//provider_id Condition.asserter us-core-condition
//visit_occurrence_id Condition.encounter us-core-condition
//condition_status_concept_id Condition.clinicalStatus us-core-condition
//stop_reason Condition.Extension(abatement-reason) us-core-condition
```

### Notes

- **Multiple codings**: Each coding in `Condition.Code` creates a separate record
- **Type concept hardcoded**: Always `32817` (EHR)
- **End date fallback**: Uses visit end date if condition abatement not provided
- **Domain detection**: Checks domain but currently doesn't route to different tables
- **Visit link**: Both `visit_occurrence_id` and `visit_detail_id` set from encounter
- **No provider mapping**: `asserter` not mapped
- **No status mapping**: `clinicalStatus` not mapped
- **No stop reason**: Extension-based stop reason not implemented
