# MENDS-on-FHIR

## Project Information

- **Project Name**: MENDS-on-FHIR
- **Repository URL**: https://github.com/CU-DBMI/mends-on-fhir
- **Organization**: CU-DBMI (University of Colorado Department of Biomedical Informatics)
- **Related Publication**: [JAMIA Open publication](https://academic.oup.com/jamiaopen/article/7/2/ooae045/7685048)

## Purpose/Description

MENDS-on-FHIR is a specialized pipeline developed for the **Multi-State EHR-Based Network for Disease Surveillance (MENDS)** project, a CDC-funded pilot for electronic health record (EHR)-based chronic disease surveillance coordinated by the National Association of Chronic Disease Directors (NACDD).

The project converts OMOP CDM V5.3 data into HL7 FHIR R4/US Core compliant resources that can populate a FHIR server using the FHIR Bulk Data API for chronic disease surveillance purposes.

**Note**: This repository is a limited/demo version of the production transformation rules. The project maintainers state it is not intended for community contributions to build a more complete OMOP-FHIR transformation.

## Key Features

1. **OMOP to FHIR Transformation**: Converts OMOP V5.3 CDM data to FHIR R4 resources
2. **US Core Compliance**: Generates resources compliant with US Core Implementation Guide (v4.0.0)
3. **Bulk FHIR Support**: Designed to work with FHIR Bulk Data API
4. **PHI Control**: Supports PHI/non-PHI modes (dates can be anonymized to "2030-01-01")
5. **Docker-based Pipeline**: Complete containerized workflow for conversion, validation, and loading
6. **FHIR Validation**: Integrates HL7 FHIR Validator for structural and vocabulary compliance
7. **Multiple Database Support**: Extract tool supports PostgreSQL, BigQuery, SQL Server, MySQL

## Architecture

### Pipeline Components

1. **OMOP JSON Extraction** (Python/SQLAlchemy)
   - Extracts data from OMOP database as NDJSON files
   - Supports multiple database backends (PostgreSQL, BigQuery, SQL Server)

2. **Whistle Transformation Engine** (Golang)
   - JSON-to-JSON transformation using domain-specific language
   - Fork of Google Healthcare Data Harmonization project
   - Repository: https://github.com/CU-DBMI/healthcare-data-harmonization

3. **FHIR Validation** (Java)
   - Uses HL7 FHIR Validator
   - Validates against FHIR R4.01 and US Core 4.0

4. **HAPI FHIR Server**
   - Vanilla HAPI FHIR server for loading and serving resources

5. **Load Service**
   - POSTs FHIR Bundle resources to HAPI server

### Data Flow

```
OMOP Database -> Python Extraction -> OMOP JSON -> Whistle Transformation -> FHIR Bundles -> Validation -> HAPI FHIR Server
```

## FHIR Resources Generated

| FHIR Resource | Source OMOP Table | US Core Profile |
|---------------|-------------------|-----------------|
| Patient | Person | us-core-patient |
| Encounter | Visit_Occurrence | us-core-encounter |
| Condition | Condition_Occurrence | us-core-condition |
| Observation (Labs) | Measurement | us-core-observation-lab |
| Observation (Vitals) | Measurement | us-core-vital-signs, us-core-bmi, us-core-body-height, us-core-body-weight, us-core-body-temperature |
| Medication | Drug_Exposure | us-core-medication |
| MedicationRequest | Drug_Exposure (type=32833) | us-core-medicationrequest |
| MedicationAdministration | Drug_Exposure (type=32818) | (Core R4) |
| MedicationDispense | Drug_Exposure (type=32825) | (Core R4) |
| Immunization | Drug_Exposure (CVX codes) | us-core-immunization |
| Coverage | Payer_Plan_Period | (Core R4) |
| Basic | Metadata | (Core R4) |

## OMOP Tables Used as Source

| OMOP Table | Description |
|------------|-------------|
| Person | Patient demographics |
| Visit_Occurrence | Encounter/visit data |
| Condition_Occurrence | Diagnoses and conditions |
| Measurement | Lab results and vital signs |
| Drug_Exposure | Medications, immunizations, dispensing |
| Payer_Plan_Period | Insurance/coverage information |
| Observation | Smoking status and other observations |
| CDM_Source | Metadata about the OMOP instance |

## Technology Stack

- **Transformation Language**: Whistle (domain-specific JSON-to-JSON language written in Golang)
- **Data Extraction**: Python 3 with SQLAlchemy, Pandas
- **Database Connectors**: psycopg2 (PostgreSQL), google-cloud-bigquery, pyodbc (SQL Server)
- **Container Orchestration**: Docker Compose
- **FHIR Server**: HAPI FHIR
- **Validation**: HL7 FHIR Validator (Java)
- **Target FHIR Version**: FHIR R4 (4.0.1)
- **Target IG**: US Core 4.0.0

## Concept Maps

The project includes terminology mapping files for:
- Person race (OMOP to US Core OMB/detailed race)
- Person ethnicity
- Person gender/birthsex
- Visit type to Encounter class and type
- Condition type to category
- Payer concept to Coverage type
- Smoking observation values

## Configuration

Key environment variables (docker-compose/.env):
- `CONVERT_INPUT`: Directory with OMOP JSON extracts
- `CONVERT_MAPPING_FUNCTIONS`: Directory of Whistle transformation functions
- `CONVERT_MAPPING_CONCEPT_MAPS`: Directory of terminology concept maps
- `CONVERT_MAIN`: Entry point Whistle file
- `VALIDATE_IG`: Implementation Guide for validation (e.g., hl7.fhir.us.core#4.0.0)

## Running the Pipeline

```bash
# 1. Attach demo data submodule
docker-compose/bin/omop-fhir-data-update.sh

# 2. Build Docker images
docker-compose/bin/all-build-no-cache.sh

# 3. Run OMOP to FHIR conversion
docker-compose/bin/convert-up.sh

# 4. Validate FHIR resources
docker-compose/bin/validate-up.sh

# 5. Launch HAPI FHIR server
docker-compose/bin/hapi-up.sh

# 6. Load resources into HAPI
docker-compose/bin/load-up.sh
```

## Related Repositories

- **Healthcare Data Harmonization (Whistle)**: https://github.com/CU-DBMI/healthcare-data-harmonization
- **Sample OMOP Data**: https://github.com/CU-DBMI/omop-fhir-data

## License

No explicit license file found in the repository.

## Notes

- The demo uses synthetic data from Synthea with less complete vocabulary mappings than production EHR data
- Supports OMOP CDM Version 5.3.1
- PHI handling: dates can be masked for non-PHI output
- The project focuses on a limited set of OMOP tables relevant to chronic disease surveillance (MENDS project)

---

## OMOP PERSON → FHIR Patient Mapping Details

**Source**: [`whistle-mappings/mends-compass/whistle-functions/Person_Patient.wstl`](https://github.com/CU-DBMI/mends-on-fhir/blob/main/whistle-mappings/mends-compass/whistle-functions/Person_Patient.wstl)

**Note**: This project maps **OMOP → FHIR** (reverse direction) using the Whistle transformation language.

### OMOP PERSON → FHIR Patient (Whistle)

| FHIR Patient Field | OMOP PERSON Source | Whistle Logic |
|--------------------|-------------------|---------------|
| `id` | `person_id` | Direct assignment |
| `meta.profile[]` | (static) | `"http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"` |
| `language` | (static) | `"en-US"` |
| `extension[].us-core-race` | `race_concept_id` | Via `USCore_Race()` function |
| `extension[].us-core-ethnicity` | `ethnicity_concept_id` | Via `USCore_Ethnicity()` function |
| `extension[].us-core-birthsex` | `gender_concept_id` | Via `USCore_Birthsex()` function |
| `identifier[]` | `person_id` | MR type identifier with "MENDS ID" system |
| `name[0].family` | (static) | `"MENDS"` (de-identified) |
| `name[0].given[0]` | (static) | `"NONAME"` (de-identified) |
| `gender` | `gender_concept_id` | Via `CodeMapDefault()` lookup |
| `birthDate` | `year_of_birth`, `month_of_birth`, `day_of_birth` | Joined as `"Y-M-D"` (or `"2030-01-01"` if no PHI) |
| `deceasedDateTime` | `death_date` | Direct (or `"2030-01-01"` if no PHI) |
| `address[]` | `state`, `zip` | Via `Address()` function |
| `generalPractitioner[]` | `provider_id` | Reference to Practitioner |

### US Core Extensions

#### Race Extension
```javascript
def USCore_Race(race_concept_id) {
   url : "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race";
   // OMB category sub-extension
   extension[]: { url: "ombCategory", valueCoding: <mapped from concept_id> }
   // Detailed race sub-extensions
   extension[]: { url: "detailed", valueCoding: <mapped from concept_id> }
   // Text sub-extension
   extension[]: { url: "text", valueString: <display> }
}
```

#### Ethnicity Extension
```javascript
def USCore_Ethnicity(ethnicity_concept_id) {
   url : "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity";
   extension[0].valueCoding : <mapped from ethnicity_concept_id>
   extension[0].url : "ombCategory";
   extension[1].valueString : <display>
   extension[1].url : "text";
}
```

#### Birthsex Extension
```javascript
def USCore_Birthsex(gender_concept_id) {
   url : "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex";
   valueCode : CodeMapDefault(gender_concept_id, "Person.birthsex.conceptid");
}
```

### Identifier Structure

```javascript
def Person_Identifier(person_id) {
   use: "secondary";
   type.coding[0].system: "http://terminology.hl7.org/CodeSystem/v2-0203";
   type.coding[0].code: "MR";
   type.coding[0].display: "Medical record number";
   type.text: "MENDS ID";
   system: Code_System("HDC");  // Health Data Compass
   value: person_id;
}
```

### PHI Handling

The mapping supports two modes based on `context.config.output.phi`:

| Mode | Birth Date | Death Date |
|------|------------|------------|
| `phi = "yes"` | Actual: `"Y-M-D"` format | Actual `death_date` |
| `phi = "no"` | Masked: `"2030-01-01"` | Masked: `"2030-01-01"` |

### Concept Mapping Files

Race, ethnicity, and gender are mapped via concept map files:
- `Person.gender.conceptid` → FHIR gender code
- `Person.birthsex.conceptid` → US Core birthsex code
- `Person.race-concept-id--Patient.x.uscore-omb` → OMB race category
- `Person.race-concept-id--Patient.x.uscore-detailed` → Detailed race codes
- `Person.ethnicity.conceptid` → OMB ethnicity category

### Notes

- **De-identified names**: Names are hardcoded as "MENDS NONAME" for privacy
- **US Core compliant**: Generates resources matching `us-core-patient` profile
- **Address limited**: Only state and zip are mapped from OMOP Location
- **Provider reference**: `generalPractitioner` populated if `provider_id` exists
- **No location_id mapping**: Address fields come from denormalized Person view, not Location table join

---

## OMOP MEASUREMENT → FHIR Observation Mapping Details

**Source**: [`whistle-mappings/synthea/whistle-functions/Measurement_Observation.wstl`](https://github.com/CU-DBMI/mends-on-fhir/blob/main/whistle-mappings/synthea/whistle-functions/Measurement_Observation.wstl)

**Note**: This project maps **OMOP → FHIR** using Whistle. OMOP `measurement` table maps to FHIR `Observation` with sophisticated vital signs profile routing.

### OMOP MEASUREMENT → FHIR Observation (Whistle)

| FHIR Observation Field | OMOP MEASUREMENT Source | Whistle Logic |
|------------------------|-------------------------|---------------|
| `resourceType` | (static) | `"Observation"` |
| `id` | `measurement_id` | Direct assignment |
| `meta.profile[]` | `measurement_concept_id` | Profile-specific URL based on concept routing |
| `language` | (static) | `"en-US"` |
| `identifier[0].use` | (static) | `"secondary"` |
| `identifier[0].system` | (static) | `Code_System("HDC")` |
| `identifier[0].value` | `measurement_id` | Direct assignment |
| `status` | (static) | `"final"` |
| `category[]` | `measurement_concept_id` | `"vital-signs"` or `"laboratory"` based on routing |
| `code` | `measurement_concept_id/code/name` | Via `Measurement_Code()` function |
| `subject` | `person_id` | Reference to `Patient/{person_id}` |
| `encounter` | `visit_occurrence_id` | Reference to `Encounter/{visit_occurrence_id}` |
| `effectiveDateTime` | `measurement_datetime`/`measurement_date` | PHI-controlled |
| `issued` | `measurement_datetime`/`measurement_date` | Same as effectiveDateTime |
| `performer[0]` | `provider_id` | Reference to `Practitioner/{provider_id}` |
| `valueQuantity` | `value_as_number` + unit | Numeric result with unit conversion |
| `valueCodeableConcept` | `value_as_concept_id` | Coded result |
| `valueString` | `value_source_value` | Fallback for text values |
| `referenceRange[0].low.value` | `range_low` | Reference range (converted) |
| `referenceRange[0].high.value` | `range_high` | Reference range (converted) |
| `dataAbsentReason` | (when value missing) | `"unknown"` |

### Profile Routing by Measurement Concept ID

| Concept ID(s) | Profile | LOINC Code | Description |
|---------------|---------|------------|-------------|
| `3038553` | `us-core-bmi` | `39156-5` | Body mass index |
| `3019171`, `3036277` | `us-core-body-height` | `8302-2` | Body height |
| `3004249`, `4152194`, `4353843` | `us-core-vital-signs` | `8480-6` | Systolic blood pressure |
| `3012888`, `4154790`, `4354253` | `us-core-vital-signs` | `8462-4` | Diastolic blood pressure |
| `3013762`, `3023166`, `3025315`, `3026600` | `us-core-body-weight` | `29463-7` | Body weight |
| `3020891` | `us-core-body-temperature` | `8310-5` | Body temperature |
| (all others) | `us-core-observation-lab` | (from OMOP) | Laboratory results |

### Category Assignment

```javascript
if (profile_type.type = "VS") {
  category[]: CodeableConcept("vital-signs", "Vital Signs")
}
if (profile_type.type = "LAB") {
  category[]: CodeableConcept("laboratory", "Laboratory")
}
```

### Unit Conversion Logic

The mapping includes unit conversion for vitals:

| Vital Sign | Input Units | Output Unit | Conversion |
|------------|-------------|-------------|------------|
| BMI | (none) | `kg/m2` | No conversion |
| Height | inches | `[in_i]` | No conversion |
| Blood Pressure | mmHg | `mm[Hg]` | No conversion |
| Weight | kg, lb, oz | `kg` | Converts lb→kg, oz→kg |
| Temperature | Cel, F | `Cel` | Converts F→Cel (cutoff: >50 = F) |

### Value Priority

Values are selected in this priority order:
1. `value_as_concept_id` → `valueCodeableConcept`
2. `value_as_number` → `valueQuantity`
3. `value_source_value` → `valueString`
4. (none) → `dataAbsentReason: "unknown"`

**Exception**: BMI, height, weight, temperature profiles only allow `valueQuantity`

### Code Field Structure

```javascript
def Measurement_Code(profile_type, m) {
  // Standard code (LOINC)
  coding[]: Coding(profile_type.codesystem, profile_type.codecode, profile_type.codedisplay)

  // Source code (if different from standard)
  if (m.measurement_concept_code ~= m.measurement_source_concept_code) {
    coding[]: Coding(m.measurement_source_vocabulary_id,
                     m.measurement_source_concept_code,
                     m.measurement_source_concept_name)
  }
  text: m.measurement_source_value
}
```

### PHI Handling

| Mode | effectiveDateTime |
|------|-------------------|
| `phi = "yes"` | Actual measurement datetime |
| `phi = "no"` | Masked: `"2030-01-01"` |

### Smoking Observations

Separate Whistle files handle smoking observations:
- `Observation_Smoking.wstl` - For positive smoking status
- `Observation_NotSmoking.wstl` - For negative smoking status

These map from OMOP `observation` table (not `measurement`).

### Notes

- **Concept-based routing**: Profile selection based on OMOP concept IDs
- **Unit normalization**: Weights converted to kg, temperatures to Celsius
- **Intelligent unit detection**: Temperature unit guessed from value if missing
- **Source concept preservation**: Both standard and source codes included
- **No blood pressure combination**: Systolic/diastolic as separate Observations (not combined BP)
- **Data absent handling**: Returns `dataAbsentReason` when no value available

---

## OMOP VISIT_OCCURRENCE → FHIR Encounter Mapping

**Source**: [`whistle-mappings/synthea/whistle-functions/Visit_Encounter.wstl`](https://github.com/mends-on-fhir/whistle-mappings/blob/main/synthea/whistle-functions/Visit_Encounter.wstl)

**Direction**: OMOP → FHIR (reverse direction)

### OMOP VISIT_OCCURRENCE → FHIR Encounter

| FHIR Encounter Field | OMOP VISIT_OCCURRENCE Source | Whistle Logic |
|----------------------|------------------------------|---------------|
| `id` | `visit_occurrence_id` | Direct assignment |
| `identifier[]` | `visit_occurrence_id` | With system "omop-id" |
| `status` | (hardcoded) | `"finished"` |
| `class` | `visit_concept_id` | Via `CodingMapDefault()` |
| `classHistory[].class` | `visit_concept_id` | Via `CodingMapNull()` if different |
| `type[]` | `visit_concept_id` | Via `Encounter_Type()` helper |
| `subject` | `person_id` | Reference to Patient |
| `period.start` | `visit_start_date`, `visit_start_datetime` | PHI-aware |
| `period.end` | `visit_end_date`, `visit_end_datetime` | PHI-aware |

### PHI-Aware Date Handling

```whistle
if context.config.output.phi = "yes" {
    if $And($IsNotNil(Visit.visit_start_datetime), $IsNotNil(Visit.visit_end_datetime)) {
        period.start: ReformatDatetime(Visit.visit_start_datetime)
        period.end: ReformatDatetime(Visit.visit_end_datetime)
    } else {
        period.start: Visit.visit_start_date
        period.end: Visit.visit_end_date
    }
} else {
    // Masked dates for de-identification
    period.start: "2030-01-01"
    period.end: "2030-01-01"
}
```

### Encounter Type Mapping

```whistle
def Encounter_Type(Visit) {
    $this: CodeableConceptMapNull(Visit.visit_concept_id,
        "VisitOccurrence.visit-concept-id--Encounter.type",
        Visit.visit_source_value)
    if Visit.visit_concept_id ~= Visit.visit_source_concept_id {
        coding[]: Coding(Code_System(Visit.visit_source_vocabulary_id), "",
            Visit.visit_source_concept_code, Visit.visit_source_concept_name)
    }
}
```

### Notes

- **Direction**: OMOP → FHIR only (no FHIR → OMOP)
- **Status**: Always "finished" (OMOP has no status)
- **PHI handling**: Dates masked to 2030-01-01 when de-identification required
- **Concept mapping**: Uses concept map files for class/type vocabulary translation
- **Source concept preservation**: Includes source concept if different from standard

---

## OMOP CONDITION_OCCURRENCE → FHIR Condition Mapping

**Source**: [`whistle-mappings/synthea/whistle-functions/ConditionOccurrence_Condition.wstl`](https://github.com/CU-DBMI/mends-on-fhir/blob/main/whistle-mappings/synthea/whistle-functions/ConditionOccurrence_Condition.wstl)

**Direction**: OMOP → FHIR (US Core Condition profile)

### OMOP CONDITION_OCCURRENCE → FHIR Condition

| FHIR Condition Field | OMOP CONDITION_OCCURRENCE Source | Whistle Logic |
|----------------------|----------------------------------|---------------|
| `resourceType` | (static) | `"Condition"` |
| `id` | `condition_occurrence_id` | Direct assignment |
| `meta.profile[]` | (static) | `"http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"` |
| `language` | (static) | `"en-US"` |
| `identifier[0].use` | (static) | `"secondary"` |
| `identifier[0].system` | (static) | `Code_System("HDC")` |
| `identifier[0].value` | `person_id` | MENDS ID |
| `category[]` | `condition_type_concept_id` | Via `CodingMapDefault()` |
| `code` | `condition_concept_id/code/name` | Via `Condition_Code()` |
| `subject` | `person_id` | Reference to `Patient/{person_id}` |
| `encounter` | `visit_occurrence_id` | Reference to `Encounter/{visit_occurrence_id}` (if present) |
| `onsetPeriod.start` | `condition_start_date` | PHI-controlled |
| `onsetPeriod.end` | `condition_end_date` | PHI-controlled |
| `abatementString` | `stop_reason` | If available |
| `asserter` | `provider_id` | Reference to `Practitioner/{provider_id}` (if present) |

### Code Field Structure (Dual Coding)

Returns both standard (SNOMED) and source (ICD10CM) codes:

```whistle
def Condition_Code(co) {
  // Standard code (e.g., SNOMED)
  coding[]: Coding(Code_System(co.condition_vocabulary_id), "",
                   co.condition_concept_code, co.condition_concept_name);

  // Source code (e.g., ICD10CM) if different from standard
  if (co.condition_concept_code ~= co.condition_source_concept_code) {
    coding[]: Coding(Code_System(co.condition_source_vocabulary_id), "",
                     co.condition_source_concept_code, co.condition_source_concept_name);
  }
  $this: CodeableConcept(coding, co.condition_source_value)
}
```

### PHI Handling

| Mode | onsetPeriod.start/end |
|------|----------------------|
| `phi = "yes"` | Actual dates from OMOP |
| `phi = "no"` | Masked: `"2030-01-01"` |

```whistle
if context.config.output.phi = "yes" {
    onsetPeriod.start : ConditionOccurrence.condition_start_date;
    onsetPeriod.end : ConditionOccurrence.condition_end_date;
} else {
    onsetPeriod.start : "2030-01-01";
    onsetPeriod.end : "2030-01-01";
}
```

### Category Mapping

Category is mapped via concept map file:
```whistle
var CategoryCoding: CodingMapDefault(ConditionOccurrence.condition_type_concept_id,
    "ConditionOccurrence.category.conceptid");
category[0].coding[0]: CategoryCoding;
category[0].text: CategoryCoding.display;
```

### Notes

- **Direction**: OMOP → FHIR only (no FHIR → OMOP)
- **US Core Profile**: Generates resources matching `us-core-condition` profile
- **Dual coding**: Both standard and source codes included when different
- **PHI handling**: Dates masked for de-identified output
- **Optional references**: Encounter and asserter only included if IDs present
- **Stop reason**: Maps to `abatementString`
