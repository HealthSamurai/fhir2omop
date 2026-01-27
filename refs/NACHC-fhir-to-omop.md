# NACHC fhir-to-omop

**Project URL:** https://github.com/NACHC-CAD/fhir-to-omop

**Documentation:** https://nachc-cad.github.io/fhir-to-omop/index.html

## Purpose/Description

The fhir-to-omop project is a comprehensive suite of tools for transforming FHIR (Fast Healthcare Interoperability Resources) data to the OMOP (Observational Medical Outcomes Partnership) Common Data Model. The project provides utilities for the entire ETL pipeline: building OMOP CDM databases, downloading patient data from FHIR servers, and uploading transformed data to OMOP instances.

The tools use a file-based approach where FHIR Patient/$everything resources are downloaded from FHIR servers and then transformed and written to OMOP CDM database instances.

## Key Features

- **Instant OMOP Database Creation**: Build a complete OMOP CDM 5.4 database from scratch including vocabulary tables
- **FHIR Patient Download**: Download patient IDs and full patient records from FHIR servers
- **FHIR to OMOP Transformation**: Convert FHIR resources to OMOP CDM data structures
- **High-Performance Multi-threaded Upload**: Write approximately 1.5 million patients to OMOP in ~2 hours
- **OHDSI Tool Integration**: Support for Achilles, Atlas, and Data Quality Dashboard
- **Flexible Authentication**: Dynamic class loading for various FHIR server authentication methods (OAuth2, etc.)
- **Terminology Mapping**: Map FHIR systems and codes to OMOP vocabulary_id and concept_id values

## FHIR Resources Supported

| FHIR Resource | Description |
|---------------|-------------|
| Patient | Demographics and patient information |
| Encounter | Healthcare encounters/visits |
| Condition | Diagnoses and conditions |
| Observation | Lab results, vital signs, surveys |
| Procedure | Medical procedures |
| MedicationRequest | Medication orders/prescriptions |
| DiagnosticReport | Diagnostic reports (R4 only) |
| Bundle | Patient/$everything bundles |

Both FHIR STU3 (DSTU3) and R4 versions are supported with separate parser implementations.

## OMOP Tables Mapped

| OMOP Table | Source FHIR Resource |
|------------|---------------------|
| person | Patient |
| visit_occurrence | Encounter |
| condition_occurrence | Condition, Procedure |
| observation | Observation, Procedure |
| measurement | Observation (labs, vitals), Procedure |
| drug_exposure | MedicationRequest |
| procedure_occurrence | Procedure |
| cdm_source | Configuration metadata |

## Technology/Language

- **Language:** Java 11+
- **Build Tool:** Maven
- **FHIR Library:** HAPI FHIR
- **Database Support:**
  - Microsoft SQL Server (primary, tested)
  - PostgreSQL (supported)
  - MySQL (driver included)
- **Key Dependencies:**
  - Lombok
  - SLF4J/Logback
  - JUnit 4
  - NACHC Core Framework
  - NACHC Thread-Tool (high-performance threading)

## License

Apache License, Version 2.0

## Tools Included

### Main Tools (CLI)

| Command | Description |
|---------|-------------|
| `fhir-to-omop i` (instant-omop) | Build complete OMOP CDM database with vocabularies |
| `fhir-to-omop ids` (download-patient-ids) | Get list of patient IDs from FHIR server |
| `fhir-to-omop d` (download) | Download patients from FHIR server |
| `fhir-to-omop u` (upload) | Upload FHIR patients to OMOP database |
| `fhir-to-omop atlas` | Initialize Atlas database dependencies |
| `fhir-to-omop atlas2` | Initialize Atlas datasources |
| `fhir-to-omop a` | Run Achilles |

### Utilities/Components

- **FhirPatient/FhirPatientFactory**: Parse and represent FHIR patient data
- **OmopPerson/OmopPersonFactory**: Convert FHIR to OMOP data structures
- **WriteOmopPersonToDatabase**: Write single patient to OMOP
- **WriteOmopPeopleToDatabase**: Multi-threaded batch patient upload
- **Various Parser Classes**: PatientParser, EncounterParser, ConditionParser, ObservationParser, ProcedureParser, MedicationRequestParser

## How to Use

### Prerequisites

1. Java 8/11+ installed
2. Microsoft SQL Server or PostgreSQL database
3. OMOP Vocabularies downloaded from [Athena](https://athena.ohdsi.org)
4. (Optional) Synthea/SyntheticMass credentials for test FHIR server

### Configuration

All configuration is done via `app.properties` file:

```properties
# Database connection
DbmsName=sql server
CdmVersion=5.4
Url=jdbc:sqlserver://localhost:1433;...
Uid=your_user
Pwd=your_password

# Terminology files location
TerminologyRootDir=C:\\path\\to\\vocabulary\\

# Export directory
ExportDir=C:\\temp\\export\\
```

### Running the Standalone Application

1. Download the latest release ZIP from GitHub releases
2. Extract and configure `app.properties`
3. Run commands:

```bash
# Build OMOP database
fhir-to-omop i

# Download patient IDs
fhir-to-omop ids

# Download patients
fhir-to-omop d

# Upload to OMOP
fhir-to-omop u
```

### Using as a Library

Add Maven dependency:

```xml
<dependency>
    <groupId>org.nachc.cad.tools</groupId>
    <artifactId>fhirtoomop</artifactId>
    <version>1.0.004</version>
</dependency>
```

### Developer Usage

1. Clone the repository
2. Add `app.properties` to `src/main/resources/auth/`
3. Run integration tests individually or via `RunAllIntegrationTests`

## Architecture Overview

The project follows a factory/builder pattern:

1. **FhirPatientResources** - Interface for FHIR data sources (files or REST)
2. **FhirPatientFactory** - Creates FhirPatient from resources
3. **FhirPatient** - Composed of Parser objects (PatientParser, EncounterParser, etc.)
4. **OmopPersonFactory** - Converts FhirPatient to OmopPerson
5. **OmopPerson** - Composed of DVO (Data Value Objects) mapping 1:1 to OMOP tables
6. **WriteOmopPersonToDatabase** - Persists OmopPerson to database

## Related Projects

- [NACHC Core](https://github.com/NACHC-CAD) - Core framework utilities
- [thread-tool](https://github.com/NACHC-CAD/thread-tool) - High-performance threading framework
- [OHDSI Tools](https://www.ohdsi.org/) - Achilles, Atlas, Data Quality Dashboard

---

## Patient → OMOP Mapping Details

**Source**: [`src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/person/OmopPersonBuilder.java`](https://github.com/NACHC-CAD/fhir-to-omop/blob/main/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/person/OmopPersonBuilder.java)

**Gender Mapping**: [`src/main/java/org/nachc/tools/fhirtoomop/util/mapping/GenderMapping.java`](https://github.com/NACHC-CAD/fhir-to-omop/blob/main/src/main/java/org/nachc/tools/fhirtoomop/util/mapping/GenderMapping.java)

### FHIR Patient → OMOP PERSON

| OMOP PERSON Field | FHIR Patient Source | Mapping Logic |
|-------------------|---------------------|---------------|
| `person_id` | (generated) | `FhirToOmopIdGenerator.getId("person", "person_id")` |
| `person_source_value` | `Patient.id` | Direct assignment |
| `gender_concept_id` | `Patient.gender` | Via `GenderMapping.getOmopConceptForFhirCode()` |
| `gender_source_concept_id` | `Patient.gender` | Same as gender_concept_id |
| `gender_source_value` | `Patient.gender` | `gender.toCode()` |
| `year_of_birth` | `Patient.birthDate` | Extracted year component |
| `month_of_birth` | `Patient.birthDate` | Extracted month component |
| `day_of_birth` | `Patient.birthDate` | Extracted day component |
| `birth_datetime` | `Patient.birthDate` | Full datetime |
| `race_concept_id` | US Core Race extension | Via `RaceMapping.getOmopConceptForFhirCode()` |
| `race_source_concept_id` | US Core Race extension | Same as race_concept_id |
| `race_source_value` | US Core Race extension code | Code value or "Not Available" |
| `ethnicity_concept_id` | US Core Ethnicity extension | Via `EthnicityMapping.getOmopConceptForFhirCode()` |
| `ethnicity_source_concept_id` | US Core Ethnicity extension | Same as ethnicity_concept_id |
| `ethnicity_source_value` | US Core Ethnicity extension code | Code value |
| `location_id` | (default) | 1 if null |
| `care_site_id` | (default) | 1 if null |
| `provider_id` | (default) | 1 if null |

### Gender Concept Mapping

```java
public static Integer getOmopConceptForFhirCode(AdministrativeGender ag) {
    if (ag == AdministrativeGender.MALE) {
        return 8507;
    } else if (ag == AdministrativeGender.FEMALE) {
        return 8532;
    } else {
        return null;  // Falls back to 0
    }
}
```

| FHIR Gender | OMOP Concept ID | OMOP Concept Name |
|-------------|-----------------|-------------------|
| `male` | 8507 | MALE |
| `female` | 8532 | FEMALE |
| `other` | null → 0 | No matching concept |
| `unknown` | null → 0 | No matching concept |

### Race Mapping

Uses database lookup via `RaceMapping` class:
- Queries OMOP concept table for matching race codes
- Sets both `race_concept_id` and `race_source_concept_id` to same value
- Defaults to 0 if no match found
- Defaults `race_source_value` to "Not Available" if null

### Ethnicity Mapping

Uses database lookup via `EthnicityMapping` class:
- Queries OMOP concept table for matching ethnicity codes
- Sets both `ethnicity_concept_id` and `ethnicity_source_concept_id` to same value
- Defaults to 0 if no match found

### Code Structure

```java
public void build() {
    PersonDvo dvo = new PersonDvo();
    PatientParser patient = fhirPatient.getPatient();

    // person_id (generated)
    Integer personId = FhirToOmopIdGenerator.getId("person", "person_id");
    dvo.setPersonId(personId);

    // person_source_value
    dvo.setPersonSourceValue(patient.getId());

    // mappings
    mapRace(patient, dvo, conn);
    mapEthnicity(patient, dvo, conn);
    mapGender(patient, dvo, conn);
    mapBirthDay(patient, dvo, conn);

    // defaults for FKs
    if (dvo.getLocationId() == null) dvo.setLocationId(1);
    if (dvo.getCareSiteId() == null) dvo.setCareSiteId(1);
    if (dvo.getProviderId() == null) dvo.setProviderId(1);
    if (dvo.getRaceSourceValue() == null) dvo.setRaceSourceValue("Not Available");

    this.omopPerson.setPerson(dvo);
}
```

### Notes

- **FHIR Version**: STU3 (DSTU3) as primary, with R4 support
- **ID Generation**: Uses centralized `FhirToOmopIdGenerator` for consistent IDs
- **Default Values**: FK fields default to 1 (assumes default location/care_site/provider exist)
- **Source Values**: Both source and standard concept IDs are set to the same value
- **Database Lookup**: Race and ethnicity mappings query the OMOP concept table at runtime
- Uses HAPI FHIR library for parsing (`org.hl7.fhir.dstu3.model` package)

---

## Observation → OMOP Mapping Details

**Observation Builder Source**: [`src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/observation/OmopObservationBuilder.java`](https://github.com/NACHC-CAD/fhir-to-omop/blob/main/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/observation/OmopObservationBuilder.java)

**Measurement Translator Source**: [`src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/observation/translate/OmopMeasurementFromObservation.java`](https://github.com/NACHC-CAD/fhir-to-omop/blob/main/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/observation/translate/OmopMeasurementFromObservation.java)

**Note**: FHIR Observation is routed to **either** OMOP `observation` or `measurement` table based on category.

### Domain Routing Logic

```java
private boolean isMeasurement(ObservationParser obs) {
    if (obs.getObservationType() == ObservationType.VITAL_SIGNS ||
        obs.getObservationType() == ObservationType.LABORATORY) {
        return true;  // → measurement table
    } else {
        return false; // → observation table
    }
}
```

| FHIR Category | OMOP Target Table |
|---------------|-------------------|
| `vital-signs` | measurement |
| `laboratory` | measurement |
| (other) | observation |

### FHIR Observation → OMOP OBSERVATION

| OMOP OBSERVATION Field | FHIR Observation Source | Mapping Logic |
|------------------------|-------------------------|---------------|
| `observation_id` | (generated) | `FhirToOmopIdGenerator.getId("observation", "observation_id")` |
| `person_id` | `Observation.subject` | Via OmopPerson reference |
| `observation_concept_id` | `Observation.code.coding[0]` | Via `FhirToOmopConceptMapper.getOmopConceptForFhirCoding()` |
| `observation_source_value` | `Observation.id` | FHIR resource ID |
| `observation_date` | `Observation.effectiveDateTime` | Via `getStartDate()` |
| `observation_datetime` | `Observation.effectiveDateTime` | Same as date |
| `observation_type_concept_id` | (constant) | `OmopConceptConstants.getObsIsFromEhrEncounterRecord()` |
| `value_as_concept_id` | `Observation.valueCodeableConcept` | Via concept mapper |
| `value_as_string` | `Observation.valueString` or concept name | - |
| `value_as_number` | `Observation.valueQuantity.value` | - |
| `unit_concept_id` | `Observation.valueQuantity.code/unit` | Via `FhirToOmopConceptMapper` |
| `unit_source_value` | `Observation.valueQuantity.unit` | Display value |
| `qualifier_source_value` | `Observation.comparator` | Operator (e.g., "<", ">", "=") |
| `visit_occurrence_id` | `Observation.encounter` | Via visit lookup |
| `observation_event_id` | (parent ID) | For multi-part observations |

### FHIR Observation → OMOP MEASUREMENT

When routed to measurement table, uses `OmopMeasurementFromObservation` translator:

| OMOP MEASUREMENT Field | Source | Mapping Logic |
|------------------------|--------|---------------|
| `measurement_id` | (generated) | `FhirToOmopIdGenerator.getId("measurement", "measurement_id")` |
| `person_id` | observation.person_id | Copy from ObservationDvo |
| `measurement_concept_id` | observation.observation_concept_id | Copy |
| `measurement_source_concept_id` | observation.observation_source_concept_id | Copy |
| `measurement_source_value` | observation.observation_source_value | Copy |
| `measurement_date` | observation.observation_date | Copy |
| `measurement_datetime` | observation.observation_datetime | Copy |
| `measurement_type_concept_id` | observation.observation_type_concept_id | Modified (see below) |
| `value_as_number` | observation.value_as_number | Copy |
| `value_as_concept_id` | observation.value_as_concept_id | Copy |
| `unit_concept_id` | observation.unit_concept_id | Copy |
| `unit_source_value` | observation.unit_source_value | Or `getUnitsCodingDisplay()` |
| `value_source_value` | observation.value_source_value | Copy |
| `visit_occurrence_id` | observation.visit_occurrence_id | Copy |
| `visit_detail_id` | observation.visit_detail_id | Copy |
| `operator_concept_id` | `Observation.comparator` | Via `OperatorMapping.get()` |
| `measurement_event_id` | observation.observation_event_id | Copy |

### Type Concept ID Mapping for Measurements

```java
private void addMeasType(ObservationParser parser, ObservationDvo dvo) {
    if (parser.getObservationType() == ObservationType.LABORATORY) {
        dvo.setObservationTypeConceptId(
            OmopConceptConstants.getObsIsLabResultMeasurementConceptId());
    } else {
        dvo.setObservationTypeConceptId(
            OmopConceptConstants.getObsIsFromPhysicalExaminationConceptId());
    }
}
```

| Observation Type | Type Concept | Description |
|------------------|--------------|-------------|
| LABORATORY | Lab result | Lab measurement type |
| VITAL_SIGNS | Physical exam | Vital signs type |
| (other) | EHR encounter | General observation |

### Multi-Part (Component) Observation Handling

For multi-component observations (e.g., blood pressure):

1. **Parent observation** created with main observation code
2. **Child observations** created for each `Observation.component[]`
3. Each component is processed separately with:
   - `observation_event_id` set to parent's ID
   - Component-specific code, value, and units

```java
private void buildMultipleObservations(ObservationParser parser) {
    // Create parent
    ObservationDvo parent = buildSingleObservation(parser);

    // Process each component
    for (ObservationComponentParser comp : parser.getComponents()) {
        ObservationDvo dvo = getBasicInformation(parser, false);
        dvo.setObservationConceptId(/* from component code */);
        dvo.setValueAsNumber(comp.getValueAsNumber());
        dvo.setObservationEventId(parent.getObservationId());
        // Route to measurement or observation list
    }
}
```

### Unit Handling

```java
private void checkUnits(ObservationParser parser, ObservationDvo dvo) {
    if (dvo.getValueAsNumber() == null &&
        dvo.getValueAsConceptId() == null &&
        dvo.getUnitConceptId() == 0) {
        dvo.setUnitConceptId(OmopConceptConstants.getIsScalarMeasurementUnitsConceptId());
    }
    if (dvo.getUnitConceptId() == 0) {
        dvo.setUnitConceptId(OmopConceptConstants.getIsScalarMeasurementUnitsConceptId());
    }
}
```

### Date Fallback Logic

If `Observation.effectiveDateTime` is null, falls back to encounter start date:

```java
if (dvo.getObservationDate() == null) {
    String encounterId = parser.getEncounterId();
    VisitOccurrenceDvo visitDvo = this.omopPerson.getVisitOccurrenceByFhirId(encounterId);
    dvo.setVisitOccurrenceId(visitDvo.getVisitOccurrenceId());
    dvo.setObservationDate(visitDvo.getVisitStartDate());
}
```

### Notes

- **FHIR Version**: STU3 (DSTU3) primary, R4 support
- **Category-based routing**: `vital-signs` and `laboratory` → measurement, others → observation
- **Component expansion**: Multi-part observations create multiple OMOP records
- **Concept mapping**: Uses `FhirToOmopConceptMapper` with database lookup
- **Operator mapping**: Via `OperatorMapping` class for comparator symbols
- **Unit fallback**: Sets scalar measurement units concept if no unit provided
- **Parent-child linking**: Component observations linked via `observation_event_id`

---

## Encounter → OMOP VISIT_OCCURRENCE Mapping

**Source**: [`src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/visitoccurrence/OmopVisitOccurrenceBuilder.java`](https://github.com/NACHC-CAD/fhir-to-omop/blob/main/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/visitoccurrence/OmopVisitOccurrenceBuilder.java)

### FHIR Encounter → OMOP VISIT_OCCURRENCE

| OMOP VISIT_OCCURRENCE Field | FHIR Encounter Source | Logic |
|-----------------------------|----------------------|-------|
| `visit_occurrence_id` | Auto-generated | Via `FhirToOmopIdGenerator.getId()` |
| `person_id` | From `OmopPerson` | Already resolved |
| `visit_start_date` | `Encounter.period.start` | From `EncounterParser.getStartDate()` |
| `visit_end_date` | `Encounter.period.end` | Defaults to start date if null |
| `visit_start_datetime` | `visit_start_date` | Same as date |
| `visit_end_datetime` | `visit_end_date` | Same as date |
| `visit_source_value` | `Encounter.id` | Via `EncounterParser.getEncounterId()` |
| `visit_concept_id` | `Encounter.type[0].coding[0]` | Via `FhirToOmopConceptMapper` |
| `visit_source_concept_id` | Same as `visit_concept_id` | If domain is "Visit" |
| `visit_type_concept_id` | (hardcoded) | Via `OmopConceptConstants.getVisitTypeIsFromEmr()` |
| `care_site_id` | (hardcoded) | `1` |
| `provider_id` | (hardcoded) | `1` |
| `admitted_from_concept_id` | (hardcoded) | Via `OmopConceptConstants.getDefaultVisitAdmittedFrom()` |
| `admitted_from_source_value` | (hardcoded) | `"Not Available"` |
| `discharged_to_concept_id` | (hardcoded) | Via `OmopConceptConstants.getDefaultDischargedTo()` |
| `discharged_to_source_value` | (hardcoded) | `"Not Available"` |

### Visit Concept Mapping

```java
Coding encounterType = enc.getEncounterType();
ConceptDvo visitConcept = FhirToOmopConceptMapper.getOmopConceptForFhirCoding(encounterType, conn);
if (visitConcept != null && visitConcept.getConceptId() != null
        && "Visit".equals(visitConcept.getDomainId())) {
    dvo.setVisitConceptId(visitConcept.getConceptId());
    dvo.setVisitSourceConceptId(visitConcept.getConceptId());
} else {
    dvo.setVisitConceptId(OmopConceptConstants.getVisitIsOtherType());
    dvo.setVisitSourceConceptId(OmopConceptConstants.getVisitIsOtherType());
}
```

### EncounterParser

```java
public class EncounterParser {
    private Encounter enc;

    public String getEncounterId() {
        return FhirUtil.getIdUnqualified(this.enc.getId());
    }

    public Coding getEncounterType() {
        return this.enc.getTypeFirstRep().getCodingFirstRep();
    }

    public Date getStartDate() {
        return this.enc.getPeriod().getStart();
    }

    public Date getEndDate() {
        return this.enc.getPeriod().getEnd();
    }
}
```

### Notes

- **FHIR Version**: STU3 (DSTU3) primary
- **Visit Concept**: Mapped via database lookup; falls back to "Other" if not found
- **End Date**: Defaults to start date if not provided
- **Hardcoded values**: Care site, provider, admission/discharge set to defaults
- **ID generation**: Uses `FhirToOmopIdGenerator` for visit_occurrence_id
- **Domain validation**: Only codes with domain="Visit" are used for visit_concept_id

---

## Condition → OMOP CONDITION_OCCURRENCE Mapping

**Source**: [`src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/condition/OmopConditionOccurrenceBuilder.java`](https://github.com/NACHC-CAD/fhir-to-omop/blob/main/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/condition/OmopConditionOccurrenceBuilder.java)

### FHIR Condition → OMOP CONDITION_OCCURRENCE

| OMOP CONDITION_OCCURRENCE Field | FHIR Condition Source | Logic |
|---------------------------------|----------------------|-------|
| `condition_occurrence_id` | Auto-generated | `FhirToOmopIdGenerator.getId("condition_occurrence", "condition_occurrence_id")` |
| `person_id` | From `OmopPerson` | Already resolved |
| `condition_start_date` | `Condition.onset` | Via `ConditionParser.getStartDate()` |
| `condition_end_date` | `Condition.abatement` | Via `ConditionParser.getEndDate()` |
| `condition_source_value` | `Condition.code.coding[0].code` | Via `ConditionParser.getCode()` |
| `condition_concept_id` | `Condition.code.coding[0]` | Via `FhirToOmopConceptMapper.getOmopConceptForFhirCoding()` |
| `condition_type_concept_id` | (hardcoded) | `32020` (EHR encounter diagnosis) |

### Implementation Code

```java
private void buildConditionList() {
    Integer personId = this.omopPerson.getPerson().getPersonId();
    List<ConditionOccurrenceDvo> rtn = new ArrayList<ConditionOccurrenceDvo>();
    List<ConditionParser> conList = fhirPatient.getConditionList();

    for (ConditionParser con : conList) {
        Integer id = FhirToOmopIdGenerator.getId("condition_occurrence", "condition_occurrence_id");
        ConditionOccurrenceDvo dvo = new ConditionOccurrenceDvo();
        dvo.setPersonId(personId);
        dvo.setConditionOccurrenceId(id);
        dvo.setConditionStartDate(con.getStartDate());
        dvo.setConditionEndDate(con.getEndDate());
        dvo.setConditionSourceValue(con.getCode());

        ConceptDvo conceptDvo = FhirToOmopConceptMapper.getOmopConceptForFhirCoding(con.getCoding(), conn);
        dvo.setConditionConceptId(conceptDvo == null ? 0 : conceptDvo.getConceptId());

        // Hardcoded to EHR encounter diagnosis
        dvo.setConditionTypeConceptId(32020);

        rtn.add(dvo);
    }
    this.omopPerson.setConditionOccurrenceList(rtn);
}
```

### Notes

- **FHIR Version**: STU3 (DSTU3) primary
- **Simple mapping**: Minimal field mapping with hardcoded type concept
- **Type concept**: Always `32020` (EHR encounter diagnosis)
- **Concept fallback**: Returns 0 if concept not found in vocabulary
- **No category mapping**: Category is not used for type concept determination
- **No status mapping**: Clinical status not mapped
- **No provider/encounter**: These references not mapped
- **Batch processing**: Processes all conditions in a patient bundle at once

---

## Procedure → OMOP PROCEDURE_OCCURRENCE Mapping

**Note**: This project does **NOT** currently implement FHIR Procedure → OMOP mapping. The codebase handles Patient, Observation, Encounter, and Condition resources but does not include a `ProcedureBuilder` or similar class.

### Not Implemented

No `OmopProcedureOccurrenceBuilder.java` or equivalent exists in the codebase. If Procedure mapping is required, it would need to be added following the pattern of existing builders:

```
src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/
├── condition/OmopConditionOccurrenceBuilder.java
├── observation/OmopObservationBuilder.java
├── visitoccurrence/OmopVisitOccurrenceBuilder.java
└── (no procedure builder)
```

---

## MedicationStatement → OMOP DRUG_EXPOSURE Mapping

**Note**: This project does **NOT** currently implement FHIR MedicationStatement → OMOP mapping. The codebase handles Patient, Observation, Encounter, and Condition resources but does not include a `DrugExposureBuilder` or similar class.

### Not Implemented

No `OmopDrugExposureBuilder.java` or equivalent exists in the codebase. If MedicationStatement mapping is required, it would need to be added following the pattern of existing builders:

```
src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/
├── condition/OmopConditionOccurrenceBuilder.java
├── observation/OmopObservationBuilder.java
├── visitoccurrence/OmopVisitOccurrenceBuilder.java
└── (no drug exposure builder)
```

---

## Immunization → OMOP DRUG_EXPOSURE Mapping

**Note**: This project does **NOT** currently implement FHIR Immunization → OMOP mapping. No `ImmunizationParser` or `OmopImmunizationBuilder` exists in the codebase.

### Not Implemented

If Immunization mapping were added, it would follow the pattern of existing builders:

```
src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/
├── condition/OmopConditionOccurrenceBuilder.java
├── observation/OmopObservationBuilder.java
├── visitoccurrence/OmopVisitOccurrenceBuilder.java
└── (no immunization builder)
```

Key considerations for future implementation:
- Map to `drug_exposure` table
- Filter by CVX vocabulary for vaccine codes
- Use type concept 38000179 (Physician administered drug in inpatient setting)
- Map `Immunization.vaccineCode` → `drug_concept_id`
- Map `Immunization.occurrence` → `drug_exposure_start_date/datetime`
- Map `Immunization.lotNumber` → `lot_number`

---

## AllergyIntolerance → OMOP Mapping

**Note**: This project does **NOT** currently implement FHIR AllergyIntolerance → OMOP mapping. No `AllergyIntoleranceParser` or `OmopAllergyBuilder` exists in the codebase.

### Not Implemented

If AllergyIntolerance mapping were added, it would follow the pattern of existing builders:

```
src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/
├── condition/OmopConditionOccurrenceBuilder.java
├── observation/OmopObservationBuilder.java
├── visitoccurrence/OmopVisitOccurrenceBuilder.java
└── (no allergy builder)
```

Key considerations for future implementation:
- Map to `observation` table (not drug_exposure - allergies are clinical findings)
- Map `AllergyIntolerance.code` → `observation_concept_id`
- Map `AllergyIntolerance.reaction.manifestation` → `value_as_concept_id`
- Map `AllergyIntolerance.onset` → `observation_date/datetime`
- Map `AllergyIntolerance.recordedDate` → alternative date source

---

## DiagnosticReport → OMOP Mapping

**Note**: This project has a `DiagnosticReportParser.java` but **no corresponding OMOP builder** for mapping DiagnosticReport to OMOP tables.

### Partially Implemented

The project can parse DiagnosticReport resources but doesn't map them to OMOP:

```
src/main/java/org/nachc/tools/fhirtoomop/fhir/parser/r4/diagnosticreport/
└── DiagnosticReportParser.java (parser only)
```

### Expected Implementation

If DiagnosticReport mapping were added, it would follow the pattern of existing builders:

```
src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/
├── observation/OmopObservationBuilder.java
├── measurement/OmopMeasurementBuilder.java (would need domain routing)
└── (no diagnostic report builder)
```

Key considerations:
- Domain-based routing: observation, measurement, or procedure_occurrence
- Map `DiagnosticReport.code` (LOINC) → `*_concept_id`
- Map `DiagnosticReport.conclusionCode` (SNOMED) → `*_source_concept_id`
- Map `DiagnosticReport.effectiveDateTime` → `*_date/datetime`
