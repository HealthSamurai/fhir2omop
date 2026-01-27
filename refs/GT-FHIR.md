# GT-FHIR: OMOP on FHIR

## Project Information

- **Project Name**: GT-FHIR (Georgia Tech FHIR)
- **URL**: https://github.com/gt-health/GT-FHIR
- **Organization**: Georgia Tech Research Institute (GTRI), Interoperability and Integration Innovation Lab (I3L)
- **License**: Apache Software License 2.0 (referenced in pom.xml, based on HAPI FHIR)

## Purpose/Description

GT-FHIR is a Fast Healthcare Interoperability Resources (FHIR) implementation that provides a FHIR API layer on top of an OMOP Common Data Model (CDM) database. It enables bidirectional data exchange between FHIR resources and OMOP CDM tables, allowing clinical data stored in OMOP format to be accessed via standard FHIR interfaces.

The project is built on top of the HAPI FHIR reference implementation with a modified data access layer that supports any database schema, specifically optimized for OMOP CDM v5.

## Key Features

- **FHIR DSTU2 Compliance**: Objects model built in conformance with FHIR DSTU2 specification
- **Bidirectional Mapping**: Supports both reading from OMOP (GET) and writing to OMOP (CREATE/UPDATE)
- **SMART on FHIR Support**: Integration with SMART on FHIR authorization server for launch ID resolution
- **Extensible Architecture**: Modular design with separate projects for entities, JPA base, webapp, and overlay
- **Concept Mapping Cache**: OmopConceptMapping class provides cached lookups for OMOP concepts
- **Custom Extension Tables**: Supports f_person and f_observation_view tables for additional FHIR data elements
- **Blood Pressure Handling**: Special logic to combine OMOP's separate systolic/diastolic measurements into FHIR's combined blood pressure observation

## Technology Stack

- **Language**: Java 8
- **Build**: Maven (multi-module project)
- **FHIR Library**: HAPI FHIR 1.6
- **ORM**: Hibernate 4.2.17
- **Framework**: Spring Framework 4.1.5
- **Application Server**: Servlet 3.1 compatible (Jetty for testing)
- **Persistence**: JPA with support for PostgreSQL and other databases

## Project Structure

| Module | Description |
|--------|-------------|
| `gt-fhir-entities` | JPA entity classes mapping OMOP tables to FHIR resources |
| `gt-fhir-jpabase` | Base FHIR DAO implementations and query infrastructure |
| `gt-fhir-webapp` | Resource providers, servlets, and web configuration |
| `gt-fhir-overlay` | User interface (based on HAPI FHIR test page) |

## FHIR Resources Supported

| FHIR Resource | FHIR Version |
|---------------|--------------|
| Patient | DSTU2 |
| Practitioner | DSTU2 |
| Organization | DSTU2 |
| Encounter | DSTU2 |
| Condition | DSTU2 |
| Observation | DSTU2 |
| Procedure | DSTU2 |
| Medication | DSTU2 |
| MedicationOrder | DSTU2 |
| MedicationDispense | DSTU2 |
| MedicationAdministration | DSTU2 |
| Device | DSTU2 |

## OMOP Tables Mapped

| OMOP Table | FHIR Resource | Notes |
|------------|---------------|-------|
| `person` | Patient | Core demographics |
| `f_person` | Patient | Extension table for additional elements (name parts, SSN, marital status) |
| `provider` | Practitioner | Healthcare providers |
| `care_site` | Organization | Healthcare facilities |
| `location` | Address (datatype) | Physical addresses |
| `visit_occurrence` | Encounter | Patient visits |
| `condition_occurrence` | Condition | Diagnoses and problems |
| `f_observation_view` | Observation | View joining measurement and observation tables |
| `measurement` | Observation | Lab results and vitals (via view) |
| `observation` | Observation | Clinical observations (via view) |
| `procedure_occurrence` | Procedure | Clinical procedures |
| `drug_exposure` | MedicationOrder, MedicationDispense, MedicationAdministration | Medications (discriminated by drug_type_concept_id) |
| `device_exposure` | Device | Medical devices |
| `concept` | Medication, CodeableConcept | Vocabulary concepts (RxNorm for medications) |
| `vocabulary` | System URIs | Terminology system mappings |

## Mapping Documentation Details

### Key Mapping Patterns

1. **ID Mapping**: OMOP table primary keys map directly to FHIR resource IDs

2. **Code/Concept Mapping**: OMOP concept tables map to FHIR CodeableConcept:
   - `concept_code` -> `code`
   - `concept_name` -> `display`
   - `vocabulary.system_uri` -> `system`

3. **Reference Mapping**: Foreign keys become FHIR ResourceReference:
   - `person_id` -> Patient reference
   - `provider_id` -> Practitioner reference
   - `visit_occurrence_id` -> Encounter reference

4. **Drug Exposure Discrimination**: Single OMOP table maps to multiple FHIR resources via drug_type_concept_id:
   - 38000177 (Prescription written) -> MedicationOrder
   - 38000175, 38000176 (Prescription dispensed) -> MedicationDispense
   - 38000179, 43542356-58 (Physician administered) -> MedicationAdministration

5. **Observation View**: Joins measurement and observation tables:
   - Measurement IDs used as-is
   - Observation IDs negated (prefixed with '-') to avoid collisions

### Hard-coded Values

Some FHIR required fields without OMOP equivalents are set statically:
- Condition.verificationStatus: "CONFIRMED"
- Procedure.status: "IN_PROGRESS"
- Observation.status: "FINAL"
- VisitOccurrence.visitTypeConcept: 44818518 (Visit derived from EHR)

### Concept Class Mappings

The `OmopConceptMapping` class caches these concept types:
- Gender
- Drug Exposure Type
- Clinical Finding (SNOMED)
- Condition Type
- LOINC Code
- UCUM (units)
- Visit
- Place of Service

### Gender Mapping

| OMOP Gender Concept | FHIR AdministrativeGender |
|--------------------|---------------------------|
| Male | male |
| Female | female |
| Unknown | unknown |

### Visit/Encounter Class Mapping

| OMOP Visit Concept | FHIR EncounterClass |
|-------------------|---------------------|
| Contains "inpatient" | INPATIENT |
| Contains "outpatient" | OUTPATIENT |
| Contains "emergency" | EMERGENCY |
| Contains "ambulatory"/"office" | AMBULATORY |
| Contains "home" | HOME |
| Other | OTHER |

## Collaborators

- Apervita
- Cerner
- Docsnap
- Duke University
- Emory University School of Medicine
- Medical University in South Carolina
- Mulesoft
- Salesforce
- UCB
- VA (Veterans Administration)

## Related Publications

1. M. Choi, R. Starr, M. Braunstein, and J. Duke, "OHDSI on FHIR Platform Development with OMOP CDM mapping to FHIR Resources," ODHSI 2016
2. H. Su, A. Henderson, M. Choi, R. Starr, and J. Sun, "Clinical Predictive Modeling Development and Deployment with OMOP CDM and FHIR," ODHSI 2015
3. K. Mohammed, M. Choi, A. Henderson, S. Iyengar, M. Braunstein, and J. Sun, "Clinical Predictive Modeling Development and Deployment through FHIR Web Services," AMIA 2015

## Deployment

Ansible deployment scripts are available at: https://github.com/gt-health/gt-fhir-ansible

---

## Patient ↔ OMOP PERSON Mapping Details

**Source**: [`gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/Person.java`](https://github.com/gt-health/GT-FHIR/blob/master/gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/Person.java)

**Note**: GT-FHIR provides **bidirectional mapping** (OMOP↔FHIR) in the same entity class.

### OMOP PERSON → FHIR Patient (`getRelatedResource()` method, lines 316-363)

| FHIR Patient Field | OMOP PERSON Source | Logic |
|--------------------|-------------------|-------|
| `Patient.id` | `person_id` | Direct from entity ID |
| `Patient.birthDate` | `year_of_birth`, `month_of_birth`, `day_of_birth` | Combined via Calendar (defaults to 1 if null) |
| `Patient.gender` | `gender_concept_id` → Concept.name | Matched against `AdministrativeGenderEnum.values()` (case-insensitive) |
| `Patient.address[0].use` | (hardcoded) | `AddressUseEnum.HOME` |
| `Patient.address[0].line[0]` | `location.address1` | Via Location entity |
| `Patient.address[0].line[1]` | `location.address2` | Via Location entity |
| `Patient.address[0].city` | `location.city` | Via Location entity |
| `Patient.address[0].postalCode` | `location.zipCode` | Via Location entity |
| `Patient.address[0].state` | `location.state` | Via Location entity |
| `Patient.careProvider[0]` | `provider_id` → Provider | ResourceReference with provider name |

### FHIR Patient → OMOP PERSON (`constructEntityFromResource()` method, lines 382-458)

| OMOP PERSON Field | FHIR Patient Source | Logic |
|-------------------|---------------------|-------|
| `year_of_birth` | `Patient.birthDate` | `Calendar.get(Calendar.YEAR)` |
| `month_of_birth` | `Patient.birthDate` | `Calendar.get(Calendar.MONTH) + 1` |
| `day_of_birth` | `Patient.birthDate` | `Calendar.get(Calendar.DAY_OF_MONTH)` |
| `gender_concept_id` | `Patient.gender` | First letter via `OmopConceptMapping.get(gender[0], GENDER)` |
| `location_id` | `Patient.address[0]` | Via `Location.searchAndUpdate()` |
| `provider_id` | `Patient.careProvider[0]` | Via `Provider.searchAndUpdate()` |

### Gender Concept Resolution

Gender is looked up dynamically via `OmopConceptMapping`:
```java
this.genderConcept.setId(
  OmopConceptMapping.getInstance().get(
    genderString.substring(0, 1),  // First letter: "M", "F", etc.
    OmopConceptMapping.GENDER
  )
);
```

The mapping queries the OMOP `concept` table where `concept_class_id = 'Gender'`.

### JPA Entity Field Mapping

| Entity Field | Column Name | OMOP Data Type | Notes |
|--------------|-------------|----------------|-------|
| `id` | `person_id` | integer | PK, sequence-generated |
| `genderConcept` | `gender_concept_id` | FK | Concept entity (NOT NULL) |
| `yearOfBirth` | `year_of_birth` | integer | NOT NULL |
| `monthOfBirth` | `month_of_birth` | integer | Nullable |
| `dayOfBirth` | `day_of_birth` | integer | Nullable |
| `timeOfBirth` | `time_of_birth` | varchar | Nullable |
| `raceConcept` | `race_concept_id` | FK | Concept entity |
| `ethnicityConcept` | `ethnicity_concept_id` | FK | Concept entity |
| `location` | `location_id` | FK | Location entity (cascade ALL) |
| `provider` | `provider_id` | FK | Provider entity (cascade ALL) |
| `careSite` | `care_site_id` | FK | CareSite entity (cascade MERGE) |
| `personSourceValue` | `person_source_value` | varchar | - |
| `genderSourceValue` | `gender_source_value` | varchar | - |
| `genderSourceConcept` | `gender_source_concept_id` | FK | Concept entity |
| `raceSourceValue` | `race_source_value` | varchar | - |
| `raceSourceConcept` | `race_source_concept_id` | FK | Concept entity |
| `ethnicitySourceValue` | `ethnicity_source_value` | varchar | - |
| `ethnicitySourceConcept` | `ethnicity_source_concept_id` | FK | Concept entity |

### Fields NOT Mapped

- **Race/Ethnicity**: Not exposed to FHIR (no US Core extensions in DSTU2 base spec)
- **Death**: Commented out in code (`// this.death = patient.getDeceased();`)
- **birth_datetime**: Only date components used, time_of_birth not mapped
- **person_source_value**: Not populated from FHIR

### Location Handling

When creating/updating a Patient, the address is resolved via `Location.searchAndUpdate()`:
1. Searches for existing location matching address components
2. If found, reuses existing location_id
3. If not found, creates new Location record

### Notes

- FHIR version: DSTU2 (not R4)
- Defaults: month/day default to 1 when null in OMOP (for date construction)
- Only first address is used for Location mapping
- Only first careProvider is mapped to provider_id
- Gender lookup uses first character only ("M", "F")

---

## Observation ↔ OMOP Mapping Details

**OMOP Observation Table Source**: [`gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/OmopObservation.java`](https://github.com/gt-health/GT-FHIR/blob/master/gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/OmopObservation.java)

**OMOP Measurement Table Source**: [`gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/OmopMeasurement.java`](https://github.com/gt-health/GT-FHIR/blob/master/gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/OmopMeasurement.java)

**Note**: GT-FHIR provides **bidirectional mapping** and maps FHIR Observation to **both** OMOP `observation` and `measurement` tables (separate entity classes).

### FHIR Observation → OMOP OBSERVATION (`constructEntityFromResource()` in OmopObservation.java)

| OMOP OBSERVATION Field | FHIR Observation Source | Logic |
|------------------------|-------------------------|-------|
| `person_id` | `Observation.subject` | Via `PersonComplement.searchAndUpdate()` |
| `observation_concept_id` | `Observation.code.coding[0].code` | Via `OmopConceptMapping.get()` |
| `observation_source_value` | `Observation.id` | For update detection |
| `observation_date` | `Observation.effectiveDateTime` | Date component |
| `observation_time` | `Observation.effectiveDateTime` | Time formatted as "HH:mm:ss" |
| `value_as_number` | `Observation.valueQuantity.value` | `quantity.getValue().doubleValue()` |
| `value_as_string` | `Observation.valueString` | For string values |
| `value_as_concept_id` | `Observation.valueCodeableConcept` | Via `OmopConceptMapping.get()` |
| `unit_concept_id` | `Observation.valueQuantity.code` (or `.unit`) | Via `OmopConceptMapping.get()` |
| `observation_type_concept_id` | `Observation.category` | Category-based mapping (see table below) |
| `visit_occurrence_id` | `Observation.encounter` | From reference ID |

### FHIR Observation → OMOP MEASUREMENT (`constructEntityFromResource()` in OmopMeasurement.java)

| OMOP MEASUREMENT Field | FHIR Observation Source | Logic |
|------------------------|-------------------------|-------|
| `person_id` | `Observation.subject` | Via `PersonComplement.searchAndUpdate()` |
| `measurement_concept_id` | `Observation.code.coding[0].code` | Via `OmopConceptMapping.get()` |
| `measurement_source_value` | `Observation.id` | For update detection |
| `measurement_date` | `Observation.effectiveDateTime` | Date component |
| `measurement_time` | `Observation.effectiveDateTime` | Time formatted as "HH:mm:ss" |
| `value_as_number` | `Observation.valueQuantity.value` | `quantity.getValue().doubleValue()` |
| `value_as_concept_id` | `Observation.valueCodeableConcept` | Via `OmopConceptMapping.get()` |
| `unit_concept_id` | `Observation.valueQuantity.code` (or `.unit`) | Via `OmopConceptMapping.get()` |
| `range_low` | `Observation.referenceRange[0].low.value` | Reference range lower bound |
| `range_high` | `Observation.referenceRange[0].high.value` | Reference range upper bound |
| `measurement_type_concept_id` | `Observation.category` | Category-based mapping (see table below) |
| `visit_occurrence_id` | `Observation.encounter` | From reference ID |

### Observation Category → Type Concept Mapping

**For OMOP `observation` table (`OmopObservation.java`):**

| Category Code | Value Type | Type Concept ID | Description |
|---------------|------------|-----------------|-------------|
| `exam` | string | 38000281 | Physical examination with text |
| `exam` | numeric | 38000280 | Physical examination with value |
| `laboratory` | string | 38000278 | Lab result with text |
| `laboratory` | numeric | 38000277 | Lab result with value |
| `survey` | any | 45905771 | Survey observation |
| `vital-signs` | any | 38000280 | Vital signs |
| (empty/other) | any | 0 | Unknown type |

**For OMOP `measurement` table (`OmopMeasurement.java`):**

| Category Code | Type Concept ID | Description |
|---------------|-----------------|-------------|
| `exam` | 44818701 | Physical examination |
| `laboratory` | 44818702 | Lab test |
| (empty/other) | 0 | Unknown type |

### Value Type Handling

```java
IDatatype value = obs.getValue();
if (value instanceof QuantityDt) {
    // Numeric value with unit
    String unitCode = ((QuantityDt) value).getCode();
    if (unitCode == null) unitCode = ((QuantityDt) value).getUnit();
    this.valueAsNumber = ((QuantityDt) value).getValue().doubleValue();
    Long unitId = ocm.get(unitCode);
    if (unitId != null) this.unit = new Concept(unitId);

} else if (value instanceof CodeableConceptDt) {
    // Coded value
    Long valueAsConceptId = ocm.get(((CodeableConceptDt) value).getCodingFirstRep().getCode());
    if (valueAsConceptId != null) this.valueAsConcept = new Concept(valueAsConceptId);

} else if (value instanceof StringDt) {
    // String value (observation table only)
    this.valueAsString = ((StringDt) value).getValueAsString();
}
```

### Blood Pressure Constants

The `OmopMeasurement` class defines constants for blood pressure handling:
```java
public static final Long SYSTOLIC_CONCEPT_ID = 3004249L;
public static final Long DIASTOLIC_CONCEPT_ID = 3012888L;
```

### Update Detection

Both entity classes check for existing records by source value:
```java
OmopObservation origObservation = (OmopObservation) ocm.loadEntityBySource(
    OmopObservation.class, "OmopObservation", "sourceValue", obs.getId().getIdPart());
if (origObservation == null)
    this.setSourceValue(obs.getId().getIdPart());
else
    this.setId(origObservation.getId());
```

### Key Differences: OBSERVATION vs MEASUREMENT Tables

| Feature | OMOP OBSERVATION | OMOP MEASUREMENT |
|---------|------------------|------------------|
| `value_as_string` | Yes | No |
| `range_low` / `range_high` | No | Yes |
| String value support | Yes (`StringDt`) | No |
| Reference range support | No | Yes |
| Type concept IDs | Exam/Lab/Survey-specific | Exam/Lab only |

### JPA Entity Fields

**OmopObservation.java:**
| Entity Field | Column Name | Notes |
|--------------|-------------|-------|
| `id` | `observation_id` | PK |
| `person` | `person_id` | FK to person |
| `observationConcept` | `observation_concept_id` | FK to concept |
| `date` | `observation_date` | DATE |
| `time` | `observation_time` | VARCHAR |
| `valueAsString` | `value_as_string` | - |
| `valueAsNumber` | `value_as_number` | DOUBLE |
| `valueAsConcept` | `value_as_concept_id` | FK to concept |
| `type` | `observation_type_concept_id` | FK to concept |
| `provider` | `provider_id` | FK to provider |
| `visitOccurrence` | `visit_occurrence_id` | FK |
| `sourceValue` | `observation_source_value` | - |
| `unit` | `unit_concept_id` | FK to concept |
| `unitSourceValue` | `unit_source_value` | - |

### Notes

- FHIR version: DSTU2 (not R4)
- Only Patient subjects supported (Device, Group, Location return null)
- Concept mapping via `OmopConceptMapping.getInstance().get(code)`
- First coding in `Observation.code` is used
- `effectivePeriod` handling marked as TODO (not fully implemented)
- Blood pressure components defined but view-based merging is in separate code

---

## Encounter ↔ OMOP VISIT_OCCURRENCE Mapping

**Source**: [`gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/VisitOccurrence.java`](https://github.com/GT-FHIR/gt-fhir-entities/blob/master/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/VisitOccurrence.java)

**Note**: This is DSTU2 (not R4), uses HAPI FHIR `Encounter` class.

### OMOP VISIT_OCCURRENCE → FHIR Encounter (`getRelatedResource()`)

| FHIR Encounter Field | OMOP VISIT_OCCURRENCE Source | Logic |
|----------------------|------------------------------|-------|
| `id` | `visit_occurrence_id` | Via ID mapping |
| `status` | (hardcoded) | `EncounterStateEnum.FINISHED` |
| `class` | `visit_concept.name` | String matching to EncounterClassEnum |
| `patient` | `person` | Reference to Patient with display name |
| `period.start` | `visit_start_date`, `start_time` | Combined date + time |
| `period.end` | `visit_end_date`, `end_time` | Combined date + time |
| `serviceProvider` | `care_site` | Reference to CareSite |
| `participant[].individual` | `provider` | Reference to Provider |

### Visit Concept → Encounter Class Mapping

```java
String visitString = this.visitConcept.getName().toLowerCase();
if (visitString.contains("inpatient")) {
    encounter.setClassElement(EncounterClassEnum.INPATIENT);
} else if (visitString.contains("outpatient")) {
    encounter.setClassElement(EncounterClassEnum.OUTPATIENT);
} else if (visitString.contains("ambulatory") || visitString.contains("office")) {
    encounter.setClassElement(EncounterClassEnum.AMBULATORY);
} else if (visitString.contains("home")) {
    encounter.setClassElement(EncounterClassEnum.HOME);
} else if (visitString.contains("emergency")) {
    encounter.setClassElement(EncounterClassEnum.EMERGENCY);
} else if (visitString.contains("field")) {
    encounter.setClassElement(EncounterClassEnum.FIELD);
} else if (visitString.contains("daytime")) {
    encounter.setClassElement(EncounterClassEnum.DAYTIME);
} else if (visitString.contains("virtual")) {
    encounter.setClassElement(EncounterClassEnum.VIRTUAL);
} else {
    encounter.setClassElement(EncounterClassEnum.OTHER);
}
```

### FHIR Encounter → OMOP VISIT_OCCURRENCE (`constructEntityFromResource()`)

| OMOP VISIT_OCCURRENCE Field | FHIR Encounter Source | Logic |
|-----------------------------|----------------------|-------|
| `person_id` | `Encounter.patient` | Resolved from Patient reference |
| `visit_concept_id` | `Encounter.classElement` | Via `OmopConceptMapping.VISIT` |
| `visit_start_date` | `Encounter.period.start` | Date portion |
| `start_time` | `Encounter.period.start` | Time portion ("HH:mm:ss") |
| `visit_end_date` | `Encounter.period.end` | Date portion |
| `end_time` | `Encounter.period.end` | Time portion |
| `visit_type_concept_id` | (hardcoded) | `44818518` (Visit derived from EHR) |
| `provider_id` | `Encounter.participant[0].individual` | From first participant |
| `care_site_id` | `Encounter.serviceProvider` | From Organization reference |
| `visit_source_value` | `Encounter.id` | FHIR resource ID |

### Encounter Class → Visit Concept Mapping

```java
String classType2Use = null;
if (classLowerString.contains("inpatient")) {
    classType2Use = "ip";
} else if (classLowerString.contains("outpatient")) {
    classType2Use = "op";
} else if (classLowerString.contains("emergency")) {
    classType2Use = "er";
}
Long id = OmopConceptMapping.getInstance().get(classType2Use, OmopConceptMapping.VISIT);
```

### Notes

- **FHIR Version**: DSTU2 (not R4)
- **Status**: Always set to "finished" (OMOP has no status field)
- **Visit Type**: Hardcoded to `44818518` (Visit derived from EHR)
- **Source Value**: FHIR ID stored for duplicate detection via `searchAndUpdate()`
- **Date handling**: Separate date and time columns (not combined datetime)
- **Provider**: Only first participant's individual reference is used

---

## Condition ↔ OMOP CONDITION_OCCURRENCE Mapping

**Source**: [`gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/ConditionOccurrence.java`](https://github.com/gt-health/GT-FHIR/blob/master/gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/ConditionOccurrence.java)

**Note**: This is DSTU2, provides **bidirectional mapping**.

### OMOP CONDITION_OCCURRENCE → FHIR Condition (`getRelatedResource()`)

| FHIR Condition Field | OMOP CONDITION_OCCURRENCE Source | Logic |
|----------------------|----------------------------------|-------|
| `id` | `condition_occurrence_id` | Direct |
| `patient` | `person` | Reference to Patient with display name |
| `encounter` | `visit_occurrence` | Reference to Encounter |
| `asserter` | `provider` | Reference to Practitioner with display name |
| `code` | `condition_concept` | System from vocabulary, code, display |
| `onsetDateTime` | `condition_start_date` | Direct mapping |
| `abatementDateTime` | `condition_end_date` | If end date exists |
| `verificationStatus` | (hardcoded) | `ConditionVerificationStatusEnum.CONFIRMED` |

### FHIR Condition → OMOP CONDITION_OCCURRENCE (`constructEntityFromResource()`)

| OMOP CONDITION_OCCURRENCE Field | FHIR Condition Source | Logic |
|---------------------------------|----------------------|-------|
| `person_id` | `Condition.patient` | Via `PersonComplement.searchAndUpdate()` |
| `condition_concept_id` | `Condition.code.coding[0].code` | Via `OmopConceptMapping.get()` |
| `condition_start_date` | `Condition.onset` | DateTimeDt or PeriodDt.start |
| `condition_end_date` | `Condition.onset` (if Period) | PeriodDt.end |
| `condition_type_concept_id` | `Condition.category` | Category-based mapping (see below) |
| `provider_id` | `Condition.asserter` | If resource type is Practitioner |
| `visit_occurrence_id` | `Condition.encounter` | Via `VisitOccurrence.searchAndUpdate()` |
| `condition_source_value` | `Condition.identifier[0].value` | For duplicate detection |

### Category → Type Concept Mapping

| FHIR Category Code | OMOP Type Concept ID | Constant |
|--------------------|---------------------|----------|
| `complaint` | PATIENT_SELF_REPORT | Patient-reported condition |
| (other) | EHR_PROBLEM_ENTRY | Default EHR entry |
| (null) | PRIMARY_CONDITION | Primary diagnosis |

```java
if (condCatCoding.getCode().equalsIgnoreCase(ConditionCategoryCodesEnum.COMPLAINT.getCode())) {
    this.conditionTypeConcept.setId(Omop4ConceptsFixedIds.PATIENT_SELF_REPORT.getConceptId());
} else {
    this.conditionTypeConcept.setId(Omop4ConceptsFixedIds.EHR_PROBLEM_ENTRY.getConceptId());
}
```

### Duplicate Detection

Uses identifier value for source-based lookup:
```java
ConditionOccurrence existingConditionOccurrence =
    (ConditionOccurrence) ocm.loadEntityBySource(ConditionOccurrence.class,
        "ConditionOccurrence", "sourceValue", identifierValue);
if (existingConditionOccurrence != null) {
    this.setId(existingConditionOccurrence.getId());
}
```

### Notes

- **FHIR Version**: DSTU2 (uses `Condition.patient`, not `Condition.subject`)
- **Verification Status**: Hardcoded to "confirmed" (OMOP has no equivalent)
- **Onset handling**: Supports both DateTimeDt and PeriodDt
- **Asserter**: Only Practitioner references are processed (not Patient)
- **Concept lookup**: Falls back to concept ID 0 if code not recognized
- **Category**: COMPLAINT category maps to patient self-report type

---

## OMOP PROCEDURE_OCCURRENCE → FHIR Procedure Mapping

**Source**: [`gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/ProcedureOccurrence.java`](https://github.com/gt-health/GT-FHIR/blob/master/gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/ProcedureOccurrence.java)

**Note**: This is DSTU2, provides **read-only mapping** (OMOP → FHIR only). FHIR → OMOP is not implemented (`constructEntityFromResource()` returns null).

### OMOP PROCEDURE_OCCURRENCE → FHIR Procedure (`getRelatedResource()`)

| FHIR Procedure Field | OMOP PROCEDURE_OCCURRENCE Source | Logic |
|----------------------|----------------------------------|-------|
| `id` | `procedure_occurrence_id` | Direct via `getIdDt()` |
| `subject` | `person` | Reference to Patient with display name |
| `status` | (hardcoded) | `ProcedureStatusEnum.IN_PROGRESS` |
| `code.coding[0].system` | `procedure_concept.vocabulary.systemUri` | Vocabulary system URI |
| `code.coding[0].code` | `procedure_concept.conceptCode` | Concept code |
| `code.coding[0].display` | `procedure_concept.name` | Concept name |
| `code.text` | (derived) | `"{name}, {vocabulary}, {code}"` |
| `performed[x]` | `procedure_date` | As DateTimeDt |

### JPA Entity Fields

| Entity Field | Column Name | Data Type | Notes |
|--------------|-------------|-----------|-------|
| `id` | `procedure_occurrence_id` | Long | PK, auto-generated |
| `person` | `person_id` | FK | NOT NULL |
| `procedureConcept` | `procedure_concept_id` | FK | Concept entity |
| `date` | `procedure_date` | Date | NOT NULL |
| `procedureTypeConcept` | `procedure_type_concept_id` | FK | Concept entity |
| `modifierConcept` | `modifier_concept_id` | FK | Concept entity |
| `quantity` | `quantity` | Long | |
| `provider` | `provider_id` | FK | Provider entity |
| `visitOccurrence` | `visit_occurrence_id` | FK | VisitOccurrence entity |
| `procedureSourceValue` | `procedure_source_value` | String | |
| `procedureSourceConcept` | `procedure_source_concept_id` | FK | Concept entity |
| `qualifierSourceValue` | `qualifier_source_value` | String | |

### Search Parameters

```java
switch (theSearchParam) {
    case SP_PATIENT:
        return "person";
    case SP_ENCOUNTER:
        return "visitOccurrence";
}
```

### Fields NOT Mapped to FHIR

- `procedure_type_concept_id` → (not mapped)
- `modifier_concept_id` → (not mapped)
- `quantity` → (not mapped)
- `provider_id` → (not mapped to Procedure.performer)
- `visit_occurrence_id` → (not mapped to Procedure.encounter)
- `procedure_source_value` → (not mapped)
- `qualifier_source_value` → (not mapped)

### Notes

- **FHIR Version**: DSTU2 (not R4)
- **Read-only**: FHIR → OMOP not implemented
- **Status**: Always set to `IN_PROGRESS` (TODO in code - revisit)
- **Code text**: Concatenates name, vocabulary, and code
- **Subject display**: Builds full name from given names + family name

---

## MedicationStatement → OMOP DRUG_EXPOSURE Mapping

**Note**: GT-FHIR does **NOT** appear to implement MedicationStatement mapping in the available codebase. The project focuses on:
- Patient ↔ Person
- Observation ↔ Observation/Measurement
- Encounter ↔ VisitOccurrence
- Condition ↔ ConditionOccurrence
- Procedure ↔ ProcedureOccurrence

### Not Implemented

No `DrugExposure.java` entity or `MedicationStatement` provider exists in the analyzed codebase. If medication mapping were needed, it would follow the entity pattern of other resources.

---

## Immunization → OMOP DRUG_EXPOSURE Mapping

**Note**: GT-FHIR does **NOT** implement Immunization mapping. The project focuses on the DSTU2 resources listed above.

### Not Implemented

No `Immunization` entity or provider exists in the codebase. If Immunization mapping were added, it would:
- Map to `drug_exposure` table
- Filter by CVX vocabulary codes
- Use type concept for administered drugs (38000179 - Physician administered drug)
- Follow the entity pattern of other resources

---

## AllergyIntolerance → OMOP Mapping

**Note**: GT-FHIR does **NOT** implement AllergyIntolerance mapping. The project focuses on DSTU2 resources (Patient, Observation, Encounter, Condition, Procedure, Medication).

### Not Implemented

No `AllergyIntolerance` entity or provider exists in the codebase. If AllergyIntolerance mapping were added, it would:
- Map to `observation` table (allergies are clinical findings)
- Use observation_concept_id for allergy type (food, drug, etc.)
- Store substance in value_as_concept_id
- Follow the entity pattern of other resources

---

## DiagnosticReport → OMOP Mapping

**Note**: GT-FHIR does **NOT** implement DiagnosticReport mapping. The project focuses on DSTU2 resources (Patient, Observation, Encounter, Condition, Procedure, Medication).

### Not Implemented

No `DiagnosticReport` entity or provider exists in the codebase. If DiagnosticReport mapping were added, it would:
- Map to multiple tables based on LOINC code domain (observation, measurement, procedure)
- Use LOINC codes for the main concept
- Use SNOMED codes for conclusion values
- Follow the entity pattern of other resources
