# Patient ↔ OMOP PERSON Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| Patient | PERSON, LOCATION, DEATH | Bidirectional |

## Field Mapping Summary

| FHIR Patient Field | OMOP PERSON Field | Notes |
|--------------------|-------------------|-------|
| `Patient.id` | `person_source_value` | Source identifier |
| `Patient.gender` | `gender_concept_id` | male→8507, female→8532 |
| `Patient.birthDate` | `year_of_birth`, `month_of_birth`, `day_of_birth` | Date components |
| `Patient.deceasedDateTime` | `death_datetime` | Also creates DEATH record |
| `Patient.address` | LOCATION table | Linked via `location_id` |
| `Patient.extension[race]` | `race_concept_id` | US Core extension |
| `Patient.extension[ethnicity]` | `ethnicity_concept_id` | US Core extension |
| `Patient.generalPractitioner` | `provider_id` | Reference resolution |
| `Patient.managingOrganization` | `care_site_id` | Reference resolution |

## Gender Concept Mapping

| FHIR Gender | OMOP Concept ID | Concept Name |
|-------------|-----------------|--------------|
| `male` | 8507 | MALE |
| `female` | 8532 | FEMALE |
| `other` | 8521 | OTHER |
| `unknown` | 8551 | UNKNOWN |

---

## Implementation Comparison

### Overview

| Project | Language | Direction | FHIR | OMOP | Status |
|---------|----------|-----------|------|------|--------|
| omoponfhir-v54-r4 | Java | ↔ Bidirectional | R4 | v5.4 | Active |
| fhir-omop-ig | FML | → FHIR→OMOP | R4 | v5.4 | Draft |
| ETL-German-FHIR-Core | Java | → FHIR→OMOP | R4 | v5.3 | Active |
| FhirToCdm | .NET | → FHIR→OMOP | R4 | v5.4 | Active |
| omopfhirmap | Java | ↔ Bidirectional | R4 | v5.3 | Active |
| mends-on-fhir | Whistle | ← OMOP→FHIR | R4 | v5.3 | Active |
| GT-FHIR | Java | ↔ Bidirectional | DSTU2 | v5.x | Legacy |
| NACHC-fhir-to-omop | Java | → FHIR→OMOP | DSTU3 | v5.3 | Active |
| FHIROntopOMOP | Ontop/JSON | ← OMOP→FHIR | R4 | v5.4 | Research |

### Field Coverage Matrix

| Field | omoponfhir | fhir-omop-ig | ETL-German | FhirToCdm | omopfhirmap | mends | GT-FHIR | NACHC | Ontop |
|-------|------------|--------------|------------|-----------|-------------|-------|---------|-------|-------|
| **Core Fields** |
| id/person_id | ✓ | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| gender | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| birthDate | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| identifier | ✓ | - | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| **Demographics** |
| name | ✓¹ | - | - | - | - | ✓² | - | - | ✓¹ |
| address/location | ✓ | - | ✓ | ✓ | - | ✓³ | ✓ | - | - |
| telecom | ✓¹ | - | - | - | - | - | - | - | - |
| maritalStatus | ✓¹ | - | - | - | - | - | - | - | - |
| **Extensions** |
| US Core Race | ✓ | - | ✓⁴ | ✓ | - | ✓ | - | ✓ | - |
| US Core Ethnicity | ✓ | - | ✓⁴ | ✓ | - | ✓ | - | ✓ | - |
| US Core Birthsex | ✓ | - | - | - | - | ✓ | - | - | - |
| **References** |
| generalPractitioner | ✓ | - | - | - | ✓ | ✓ | ✓ | - | - |
| managingOrganization | ✓ | - | - | - | ✓ | - | - | - | - |
| **Death** |
| deceasedDateTime | ✓ | - | ✓ | - | - | ✓ | - | - | - |
| **Tracking** |
| active | ✓¹ | - | - | - | - | - | - | - | - |
| fhir_logical_id | - | - | ✓ | - | - | - | - | - | - |

**Notes:**
- ¹ Requires FPerson extension table (non-standard OMOP)
- ² Hardcoded placeholder values
- ³ State and ZIP only
- ⁴ German ethnic group extension (different from US Core)

### Gender Mapping Comparison

| Project | male | female | other | unknown | Default |
|---------|------|--------|-------|---------|---------|
| omoponfhir-v54-r4 | 8507 | 8532 | 8521 | 8551 | 8551 |
| fhir-omop-ig | pass-through | pass-through | - | - | - |
| ETL-German-FHIR-Core | vocab lookup | vocab lookup | vocab lookup | vocab lookup | 8551 |
| FhirToCdm | 8507 | 8532 | 0 | 0 | 0 |
| omopfhirmap | 8507 | 8532 | 0 | 0 | 0 |
| mends-on-fhir | 8507 | 8532 | unknown | unknown | unknown |
| GT-FHIR | concept name match | concept name match | - | - | - |
| NACHC-fhir-to-omop | 8507 | 8532 | null→0 | null→0 | 0 |
| FHIROntopOMOP | SQL CASE | SQL CASE | female | female | female |

### Race/Ethnicity Support

| Project | Race Source | Ethnicity Source | Mapping Method |
|---------|-------------|------------------|----------------|
| omoponfhir-v54-r4 | US Core | US Core | OMB categories |
| ETL-German-FHIR-Core | German ethnic group | German ethnic group | SNOMED lookup |
| FhirToCdm | US Core | US Core | Hardcoded map |
| mends-on-fhir | OMOP concept | OMOP concept | ConceptMap files |
| NACHC-fhir-to-omop | US Core | US Core | DB concept lookup |

### Special Features

| Project | Feature |
|---------|---------|
| omoponfhir-v54-r4 | SSN handling, contact points (3), FPerson extension table |
| ETL-German-FHIR-Core | Incremental updates, fhir_logical_id tracking, age calculation from extension |
| FhirToCdm | Bundle processing, multiple Patients per bundle |
| omopfhirmap | Configurable identifier system, ATLAS cohort export |
| mends-on-fhir | PHI anonymization config, Whistle DSL, ConceptMap-driven |
| GT-FHIR | JPA/Hibernate entities, auditing |
| NACHC-fhir-to-omop | Auto-generated person_id, default provider/location/caresite |
| FHIROntopOMOP | Virtual Knowledge Graph, SPARQL queries, no ETL |

---

## Mapping Differences & Incompatibilities

### 1. Gender - Inconsistent "other/unknown" Handling

| Project | other | unknown | Issue |
|---------|-------|---------|-------|
| omoponfhir-v54-r4 | 8521 | 8551 | ✓ Correct |
| FhirToCdm | 0 | 0 | Loses distinction |
| omopfhirmap | 0 | 0 | Loses distinction |
| NACHC | null→0 | null→0 | Loses distinction |
| FHIROntopOMOP | female | female | **Wrong** - defaults to female |
| fhir-omop-ig | pass-through | pass-through | No concept translation |

**Impact**: Roundtrip fails - "other" and "unknown" become indistinguishable (concept 0) in most implementations.

### 2. Identifier Encoding - Incompatible Formats

| Project | Format | Example |
|---------|--------|---------|
| omoponfhir-v54-r4 | `system^value` | `http://hospital.org^12345` |
| ETL-German-FHIR-Core | MR identifier only | `12345` (truncated) |
| FhirToCdm | Patient.id direct | `patient-uuid` |
| omopfhirmap | Patient.id direct | `patient-uuid` |
| NACHC | Patient.id direct | `patient-uuid` |

**Impact**: Data from different ETLs won't have compatible `person_source_value` formats.

### 3. Race/Ethnicity - Different Source Extensions

| Project | Extension Used | Mapping Target |
|---------|---------------|----------------|
| omoponfhir-v54-r4 | US Core Race/Ethnicity | OMB categories → OMOP concepts |
| ETL-German-FHIR-Core | German `ethnicGroup` | SNOMED → race_concept_id |
| FhirToCdm | US Core | Hardcoded (ASIAN→8515, BLACK→8516, etc.) |
| mends-on-fhir | OMOP concepts | ConceptMap to US Core OMB codes |

**Impact**: German data uses different extension - not compatible with US Core implementations.

### 4. Birth Date Handling

| Project | year | month | day | datetime | Method |
|---------|------|-------|-----|----------|--------|
| omoponfhir-v54-r4 | ✓ | ✓ | ✓ | - | Calendar API |
| ETL-German-FHIR-Core | ✓ | ✓ | ✓ | - | LocalDateTime |
| FhirToCdm | ✓ | ✓ | ✓ | - | DateTime.Parse |
| NACHC | ✓ | ✓ | ✓ | ✓ | Calendar API |
| fhir-omop-ig | ✓ | ✓ | ✓ | ✓ | `substring(0,4)`* |

*fhir-omop-ig uses fragile string manipulation - may fail if date format varies.

### 5. Death Handling

| Project | Creates DEATH record | Source field |
|---------|---------------------|--------------|
| omoponfhir-v54-r4 | ✓ | deceasedDateTime |
| ETL-German-FHIR-Core | ✓ (via post_process_map) | deceasedDateTime |
| mends-on-fhir | Maps from OMOP | Person.death_date |
| FhirToCdm | ✗ | - |
| omopfhirmap | ✗ | - |
| NACHC | ✗ | - |

**Impact**: Deceased patients may lose death information in some ETLs.

### 6. Name Handling

| Project | Approach | Storage |
|---------|----------|---------|
| omoponfhir-v54-r4 | FPerson extension | family_name, given1_name, given2_name |
| mends-on-fhir | Hardcoded placeholder | "MENDS NONAME" |
| FHIROntopOMOP | Custom columns | fname, name1, name2 (non-standard) |
| All others | **Not mapped** | Lost |

**Impact**: Standard OMOP has no name fields - patient names lost unless using custom extensions.

### 7. Default Values for Missing Data

| Project | Missing race | Missing ethnicity | Missing location |
|---------|--------------|-------------------|------------------|
| omoponfhir-v54-r4 | null | null | null |
| ETL-German-FHIR-Core | 8552 (Unknown) | 0 | null |
| NACHC | 0 + "Not Available" | 0 | 1 (default) |
| FhirToCdm | 0 | 0 | null |

**Impact**: Inconsistent defaults make it hard to distinguish "unknown" from "not recorded".

### Summary of Data Loss Risks

| Issue | Severity | Affected Projects |
|-------|----------|-------------------|
| Gender other/unknown → 0 | **High** | FhirToCdm, omopfhirmap, NACHC |
| Identifier format incompatible | **Medium** | All (no standard format) |
| US Core vs German extensions | **Medium** | ETL-German vs others |
| Name not mapped | **High** | All except omoponfhir, mends, Ontop |
| Death not mapped | **High** | FhirToCdm, omopfhirmap, NACHC |
| Inconsistent defaults | **Low** | All |

### Recommendation

For new implementations, follow **omoponfhir-v54-r4** patterns:
- Proper gender mapping (8507, 8532, 8521, 8551)
- Identifier encoding with system preservation (`system^value`)
- FPerson extension for name/contact/marital status
- Death record creation from deceasedDateTime
- US Core race/ethnicity with OMB category mapping

---

## Project Implementations

### omoponfhir-v54-r4 (Java)

**Source**: [`refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java`](../refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java)

**Direction**: Bidirectional (1338 lines)

**OMOP Tables**: Uses `FPerson` (extends `Person`) with additional fields for name parts, SSN, marital status, contact points, active status.

#### Field Mapping (OMOP → FHIR)

| FPerson/Person Field | FHIR Patient Field | Notes |
|---------------------|-------------------|-------|
| `person_id` | `Patient.id` | Direct mapping |
| `person_source_value` | `Patient.identifier[0]` | Format: `system^value` parsed |
| `ssn` | `Patient.identifier[ssn]` | System: `http://hl7.org/fhir/sid/us-ssn` |
| `gender_concept_id` | `Patient.gender` | 8507→male, 8532→female, 8521→other, 8551→unknown |
| `year_of_birth` + `month_of_birth` + `day_of_birth` | `Patient.birthDate` | Combined into date |
| `family_name` | `Patient.name[0].family` | FPerson extension |
| `given1_name` | `Patient.name[0].given[0]` | FPerson extension |
| `given2_name` | `Patient.name[0].given[1]` | FPerson extension |
| `prefix_name` | `Patient.name[0].prefix` | FPerson extension |
| `suffix_name` | `Patient.name[0].suffix` | FPerson extension |
| `contact_point1` | `Patient.telecom[0]` | Format: `system:use:value` |
| `contact_point2` | `Patient.telecom[1]` | Format: `system:use:value` |
| `contact_point3` | `Patient.telecom[2]` | Format: `system:use:value` |
| `location_id` → Location | `Patient.address` | Via LOCATION table |
| `provider_id` | `Patient.generalPractitioner` | Reference to Practitioner |
| `care_site_id` | `Patient.managingOrganization` | Reference to Organization |
| `race_concept_id` + `race_source_value` | US Core Race extension | Extension URL: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-race` |
| `ethnicity_concept_id` + `ethnicity_source_value` | US Core Ethnicity extension | Extension URL: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity` |
| `marital_status` | `Patient.maritalStatus` | FPerson extension |
| `active` | `Patient.active` | FPerson extension |

#### Field Mapping (FHIR → OMOP)

| FHIR Patient Field | FPerson/Person Field | Notes |
|-------------------|---------------------|-------|
| `Patient.identifier` (non-SSN) | `person_source_value` | Encoded as `system^value` |
| `Patient.identifier` (SSN) | `ssn` | Detected by system URL |
| `Patient.gender` | `gender_concept_id` | male→8507, female→8532, other→8521, unknown→8551 |
| `Patient.birthDate` | `year_of_birth`, `month_of_birth`, `day_of_birth` | Decomposed |
| `Patient.name.family` | `family_name` | First name entry |
| `Patient.name.given[0]` | `given1_name` | First given name |
| `Patient.name.given[1]` | `given2_name` | Second given name |
| `Patient.name.prefix` | `prefix_name` | First prefix |
| `Patient.name.suffix` | `suffix_name` | First suffix |
| `Patient.telecom[0]` | `contact_point1` | Encoded as `system:use:value` |
| `Patient.telecom[1]` | `contact_point2` | Encoded as `system:use:value` |
| `Patient.telecom[2]` | `contact_point3` | Encoded as `system:use:value` |
| `Patient.address` | `location_id` | Creates/links LOCATION record |
| `Patient.generalPractitioner` | `provider_id` | Reference resolution |
| `Patient.managingOrganization` | `care_site_id` | Reference resolution |
| US Core Race extension | `race_concept_id`, `race_source_value` | OMB category + text |
| US Core Ethnicity extension | `ethnicity_concept_id`, `ethnicity_source_value` | OMB category + text |
| `Patient.maritalStatus` | `marital_status` | CodeableConcept text |
| `Patient.active` | `active` | Boolean |

#### Key Implementation Details

**Gender Concept Mapping** (lines 201-213, 1006-1022):
```java
// OMOP → FHIR
if (genderConcept.getId() == 8507L) patient.setGender(AdministrativeGender.MALE);
else if (genderConcept.getId() == 8532L) patient.setGender(AdministrativeGender.FEMALE);
else if (genderConcept.getId() == 8521L) patient.setGender(AdministrativeGender.OTHER);
else if (genderConcept.getId() == 8551L) patient.setGender(AdministrativeGender.UNKNOWN);
```

**Identifier Encoding** (lines 188-199, 955-978):
```java
// person_source_value stores: "system^value"
String personSourceValue = fPerson.getPersonSourceValue();
int index = personSourceValue.indexOf('^');
if (index > 0) {
    identifier.setSystem(personSourceValue.substring(0, index));
    identifier.setValue(personSourceValue.substring(index+1));
}
```

**Contact Point Encoding** (lines 307-340):
```java
// Stored as "system:use:value" in contactPoint1/2/3
String[] contactInfo = contactPoint.split(":");
if (contactInfo.length == 3) {
    ContactPoint.ContactPointSystem system = ContactPoint.ContactPointSystem.fromCode(contactInfo[0]);
    ContactPoint.ContactPointUse use = ContactPoint.ContactPointUse.fromCode(contactInfo[1]);
    String value = contactInfo[2];
}
```

**Birth Date Handling** (lines 226-248, 1024-1046):
```java
// OMOP stores year, month, day separately
Integer yearOfBirth = fPerson.getYearOfBirth();
Integer monthOfBirth = fPerson.getMonthOfBirth();
Integer dayOfBirth = fPerson.getDayOfBirth();
// Constructs date string: "YYYY-MM-DD" or "YYYY-MM" or "YYYY"
```

---

### fhir-omop-ig (FML) - HL7 Official IG

**Source**: [`refs/fhir-omop-ig/input/maps/PersonMap.fml`](../refs/refs/fhir-omop-ig/input/maps/PersonMap.fml)

**Logical Model**: [`refs/fhir-omop-ig/input/fsh/Person.fsh`](../refs/refs/fhir-omop-ig/input/fsh/Person.fsh)

**Direction**: FHIR → OMOP (minimal implementation)

#### Field Mapping

| FHIR Patient Field | OMOP Person Field | Notes |
|-------------------|------------------|-------|
| `Patient.gender` | `gender_concept_id` | Direct copy (no concept translation) |
| `Patient.gender` | `gender_source_value` | Cast to string |
| `Patient.birthDate` | `birth_datetime` | Direct copy |
| `Patient.birthDate` | `year_of_birth` | `substring(0,4)` |
| `Patient.birthDate` | `month_of_birth` | `substring(5,2)` |
| `Patient.birthDate` | `day_of_birth` | `substring(8,2)` |

#### Complete FML Mapping

```fml
group Person(source src: Patient, target tgt : PersonTable) {
    // Note: gender should be translated to OMOP concept, but currently copies directly
    src.gender as gender -> tgt.gender_concept_id = gender,
                            tgt.gender_source_value = cast(gender, "string");
    src.birthDate as bdSrc -> tgt.birth_datetime = bdSrc,
        tgt.year_of_birth = (src.birthDate.toString().substring(0,4)),
        tgt.month_of_birth = (src.birthDate.toString().substring(5,2)),
        tgt.day_of_birth = (src.birthDate.toString().substring(8,2));
}
```

#### OMOP Person Logical Model (from Person.fsh)

| Field | Cardinality | Type | Description |
|-------|-------------|------|-------------|
| `person_id` | 1..1 | integer | Unique identifier |
| `gender_concept_id` | 1..1 | code | Biological sex at birth |
| `year_of_birth` | 1..1 | integer | Year of birth |
| `month_of_birth` | 0..1 | integer | Month of birth |
| `day_of_birth` | 0..1 | integer | Day of birth |
| `birth_datetime` | 0..1 | dateTime | Birth datetime |
| `race_concept_id` | 1..1 | code | Race/ethnic background |
| `ethnicity_concept_id` | 1..1 | code | Hispanic/Not Hispanic |
| `location_id` | 0..1 | Reference | Physical address |
| `provider_id` | 0..1 | Reference | Primary care provider |
| `care_site_id` | 0..1 | Reference | Primary care site |
| `person_source_value` | 0..1 | string | Source identifier |

**Note**: This is a minimal/draft implementation. Many FHIR Patient fields (name, address, telecom, identifiers, extensions) are not mapped.

---

### ETL-German-FHIR-Core (Java) - German MII

**Source**: [`refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/PatientMapper.java`](../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/PatientMapper.java)

**Direction**: FHIR → OMOP (700 lines)

**Features**: Bulk and incremental loading, German-specific extensions, FHIR logical ID tracking for updates/deletes

#### Field Mapping (FHIR → OMOP)

| FHIR Patient Field | OMOP Person Field | Notes |
|-------------------|------------------|-------|
| `Patient.identifier[MR]` | `person_source_value` | Medical Record Number, truncated |
| `Patient.id` | `fhir_logical_id` | Extension field for tracking |
| `Patient.identifier` | `fhir_identifier` | Extension field for tracking |
| `Patient.gender` | `gender_concept_id` | Via custom concept mapping |
| `Patient.gender` | `gender_source_value` | Original FHIR value |
| `Patient.gender.extension[GenderAmtlichDe]` | `gender_source_value` | German official gender code |
| `Patient.birthDate` | `year_of_birth`, `month_of_birth`, `day_of_birth` | Decomposed |
| `Patient.extension[age]` | `year_of_birth` | Calculated if birthDate missing |
| `Patient.extension[ethnicGroup]` | `race_concept_id`, `race_source_value` | Via SNOMED lookup |
| `Patient.extension[ethnicGroup]` | `ethnicity_concept_id`, `ethnicity_source_value` | Hispanic detection |
| `Patient.address` | → LOCATION table | Via post_process_map |
| `Patient.deceasedDateTime` | → DEATH table | Via post_process_map |

#### German-Specific Extensions

| Extension URL | Purpose | Mapping |
|--------------|---------|---------|
| `[GenderAmtlichDeExtension]` | German official administrative gender | `gender_source_value` |
| `[AgeExtension]` | Age at documentation (when birthDate unknown) | Calculated `year_of_birth` |
| `[EthnicGroupExtension]` | German ethnic group coding | `race_concept_id` via SNOMED |

#### Key Implementation Details

**Gender Mapping** (lines 607-641):
```java
// German administrative gender extension override
if (gender.equals("other") && genderElement.hasExtension(fhirSystems.getGenderAmtlichDeExtension())) {
    var administrativeGender = genderElement.getExtensionByUrl(...).getValue().castToCoding(...);
    if (administrativeGender.hasCode()) return administrativeGender.getCode();
}
// Concept mapping via custom vocabulary
var sourceToConcepMap = findOmopConcepts.getCustomConcepts(gender, SOURCE_VOCABULARY_ID_GENDER, dbMappings);
```

**Birth Date Calculation from Age** (lines 494-524):
```java
// If no birthDate, calculate from age extension
var ageUnit = ageValue.getCode();  // "a" (years), "mo" (months), "d" (days)
switch (ageUnit) {
    case "a":  return documentationDateTime.minusYears(age);
    case "mo": return documentationDateTime.minusMonths(age);
    case "d":  return documentationDateTime.minusDays(age);
}
```

**Address to Location** (lines 293-334):
```java
// Stored in post_process_map for later processing
// dataOne: "zip;city;country"
// dataTwo: "lines;state"
PostProcessMap.builder()
    .dataOne(zip + ";" + city + ";" + country)
    .dataTwo(lines + ";" + state)
    .omopTable("LOCATION")
```

**Death Record** (lines 653-675):
```java
// Creates post_process_map entry for DEATH table
PostProcessMap.builder()
    .dataOne(deathDateTime.toLocalDate().toString())          // death_date
    .dataTwo(deathDateTime.format("yyyy-MM-dd HH:mm:ss"))    // death_datetime
    .omopTable("DEATH")
    .omopId(CONCEPT_EHR_RECORD_STATUS_DECEASED)              // death_type_concept_id
```

**Incremental Update Support** (lines 139-142, 185-191):
```java
// Tracks FHIR resource IDs for update/delete operations
if (bulkload.equals(Boolean.FALSE)) {
    deleteExistingPatients(patientLogicId, patientSourceIdentifier);
    deleteExistingDeath(patientLogicId, patientSourceIdentifier);
}
```

---

### FhirToCdm (.NET) - OHDSI Official

**Source**: [`refs/FhirToCdm/FhirToCdmMappings.cs`](../refs/refs/FhirToCdm/FhirToCdmMappings.cs) - `CreatePersonAndLocations()` (lines 20-170)

**Direction**: FHIR → OMOP

#### Field Mapping (FHIR → OMOP)

| FHIR Patient Field | OMOP Person Field | Notes |
|-------------------|------------------|-------|
| `Patient.id` | `person_source_value` | Direct copy |
| `Patient.gender` | `gender_source_value` | e.g., "Male", "Female" |
| `Patient.gender` | `gender_concept_id` | Male→8507, Female→8532, else→0 |
| `Patient.birthDate` | `year_of_birth` | Parsed from date |
| `Patient.birthDate` | `month_of_birth` | Parsed from date |
| `Patient.birthDate` | `day_of_birth` | Parsed from date |
| `Patient.address[].city` | → Location.city | Via separate LOCATION table |
| `Patient.address[].state` | → Location.state | Via separate LOCATION table |
| `Patient.address[].postalCode` | → Location.zip | Via separate LOCATION table |
| `Patient.address[].country` | → Location.country | Via separate LOCATION table |
| US Core Race extension | `race_source_value` | Display text |
| US Core Race extension | `race_concept_id` | Asian→8515, Black→8516, White→8527, Other→8522 |
| US Core Ethnicity extension | `ethnicity_source_value` | Display text |
| US Core Ethnicity extension | `ethnicity_concept_id` | Hispanic variants→38003563 |

#### Key Implementation Details

**Gender Mapping** (lines 50-63):
```csharp
switch (person.GenderSourceValue)
{
    case "Male":   person.GenderConceptId = 8507; break;
    case "Female": person.GenderConceptId = 8532; break;
    default:       person.GenderConceptId = 0;    break;
}
```

**Birth Date Parsing** (lines 36-38):
```csharp
YearOfBirth = DateTime.Parse(patient.BirthDate).Year,
MonthOfBirth = DateTime.Parse(patient.BirthDate).Month,
DayOfBirth = DateTime.Parse(patient.BirthDate).Day,
```

**Race Concept Mapping** (lines 139-165):
```csharp
switch (person.RaceSourceValue.ToUpper())
{
    case "ASIAN":    person.RaceConceptId = 8515; break;
    case "BLACK":    person.RaceConceptId = 8516; break;
    case "OTHER":    person.RaceConceptId = 8522; break;
    case "WHITE":    person.RaceConceptId = 8527; break;
    case "HISPANIC": person.RaceConceptId = 0;
                     person.EthnicityConceptId = 38003563; break;
    default:         person.RaceConceptId = 0;    break;
}
```

**US Core Extensions** (lines 91-116):
```csharp
// Race: http://hl7.org/fhir/StructureDefinition/us-core-race
// Ethnicity: http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity
person.RaceSourceValue = ((Coding)item.Extension[0].Value).Display;
```

---

### omopfhirmap (Java) - ATLAS Cohort to FHIR

**Source**: [`refs/omopfhirmap/src/main/java/com/canehealth/omopfhirmap/mapping/PatientMapper.java`](../refs/refs/omopfhirmap/src/main/java/com/canehealth/omopfhirmap/mapping/PatientMapper.java)

**Direction**: Bidirectional (158 lines)

#### Field Mapping (OMOP → FHIR) - `mapOmopToFhir()` (lines 34-89)

| OMOP Person Field | FHIR Patient Field | Notes |
|------------------|-------------------|-------|
| `person_id` | `Patient.identifier` | System from config |
| `gender_concept_id` | `Patient.gender` | 8532→female, 8507→male, else→unknown |
| `year_of_birth`, `month_of_birth`, `day_of_birth` | `Patient.birthDate` | Combined into Date |
| `provider_id` | `Patient.generalPractitioner` | Reference to Practitioner |
| `care_site_id` | `Patient.managingOrganization` | Reference to Organization |

#### Field Mapping (FHIR → OMOP) - `mapFhirToOmop()` (lines 91-157)

| FHIR Patient Field | OMOP Person Field | Notes |
|-------------------|------------------|-------|
| `Patient.id` | `person_source_value` | Direct copy |
| `Patient.birthDate` | `year_of_birth`, `month_of_birth`, `day_of_birth` | Calendar decomposition |
| `Patient.gender` | `gender_concept_id` | female→8532, male→8507, else→0 |
| `Patient.generalPractitioner[0]` | `provider_id` | Parse "Practitioner/{id}" |
| `Patient.managingOrganization` | `care_site_id` | Parse "Organization/{id}" |
| (not mapped) | `race_concept_id` | Set to 0 (TODO in code) |
| (not mapped) | `ethnicity_concept_id` | Set to 0 (TODO in code) |

#### Key Implementation Details

**Gender Mapping** (lines 40-45, 119-124):
```java
// OMOP → FHIR
if(omopResource.getGenderConceptId().equals(OmopConstants.OMOP_FEMALE)) // 8532
    fhirResource.setGender(AdministrativeGender.FEMALE);
else if (omopResource.getGenderConceptId().equals(OmopConstants.OMOP_MALE)) // 8507
    fhirResource.setGender(AdministrativeGender.MALE);
else
    fhirResource.setGender(AdministrativeGender.UNKNOWN);
```

**Birth Date Handling** (lines 48-63, 108-117):
```java
// OMOP → FHIR: Combine year/month/day into Date
calendar.set(yob, mob - 1, dob); // month is 0-indexed in Calendar
fhirResource.setBirthDate(calendar.getTime());

// FHIR → OMOP: Decompose Date into year/month/day
cal.setTime(fhirResource.getBirthDate());
omopResource.setYearOfBirth(cal.get(Calendar.YEAR));
omopResource.setMonthOfBirth(cal.get(Calendar.MONTH) + 1);
omopResource.setDayOfBirth(cal.get(Calendar.DAY_OF_MONTH));
```

**Note**: Race and ethnicity mappings are marked as TODO in the code.

---

### mends-on-fhir (Whistle) - Chronic Disease Surveillance

**Source**: [`refs/mends-on-fhir/whistle-mappings/synthea/whistle-functions/Person_Patient.wstl`](../refs/refs/mends-on-fhir/whistle-mappings/synthea/whistle-functions/Person_Patient.wstl)

**Concept Maps**:
- [`Person.gender.conceptid.json`](../refs/refs/mends-on-fhir/whistle-mappings/synthea/concept-maps/Person.gender.conceptid.json)
- [`Person.race-concept-id--Patient.x.uscore-omb.json`](../refs/refs/mends-on-fhir/whistle-mappings/synthea/concept-maps/Person.race-concept-id--Patient.x.uscore-omb.json)

**Direction**: OMOP → FHIR (132 lines)

**Profile**: US Core Patient (`http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient`)

#### Field Mapping (OMOP → FHIR)

| OMOP Person Field | FHIR Patient Field | Notes |
|------------------|-------------------|-------|
| `person_id` | `Patient.id` | Direct mapping |
| `person_id` | `Patient.identifier[MR]` | Medical record number |
| `gender_concept_id` | `Patient.gender` | Via ConceptMap: 8507→male, 8532→female, 0→unknown |
| `gender_concept_id` | US Core birthsex extension | Via ConceptMap |
| `year_of_birth`, `month_of_birth`, `day_of_birth` | `Patient.birthDate` | Joined with "-" separator |
| `death_date` | `Patient.deceasedDateTime` | If present |
| `race_concept_id` | US Core Race extension | OMB category + detailed |
| `ethnicity_concept_id` | US Core Ethnicity extension | Via ConceptMap |
| `provider_id` | `Patient.generalPractitioner` | Reference to Practitioner |
| `state`, `zip` | `Patient.address` | Via Address() helper |

#### Whistle Mapping Functions

**Person_Patient** (lines 4-58):
```whistle
def Person_Patient(Person, required context) {
   resourceType: "Patient";
   id: Person.person_id;
   meta.profile[]: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient";

   extension[]: USCore_Race(Person.race_concept_id)
   extension[]: USCore_Ethnicity(Person.ethnicity_concept_id)
   extension[]: USCore_Birthsex(Person.gender_concept_id)

   identifier[]: Person_Identifier(Person.person_id)
   gender: CodeMapDefault(Person.gender_concept_id, "Person.gender.conceptid");
   birthDate: $StrJoin("-", Person.year_of_birth, Person.month_of_birth, Person.day_of_birth);
}
```

#### Gender ConceptMap
```json
{ "8507": "male", "8532": "female", "0": "unknown" }
```

#### Race ConceptMap (OMOP → US Core OMB)
| OMOP Concept ID | US Core Race Code | Display |
|-----------------|-------------------|---------|
| 8516 | 2054-5 | Black or African American |
| 8527 | 2106-3 | White |
| 8657 | 1002-5 | American Indian or Alaska Native |
| 8557 | 2076-8 | Native Hawaiian or Other Pacific Islander |
| 38003574/79/81/84/85/92 | 2028-9 | Asian (detailed variants) |
| 0 | UNK | Unknown |

**Note**: PHI-aware - can anonymize birthDate and deceasedDateTime based on config.

---

### GT-FHIR (Java) - Georgia Tech FHIR Server

**Source**: [`refs/GT-FHIR/gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/Person.java`](../refs/refs/GT-FHIR/gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/Person.java)

**Direction**: Bidirectional (471 lines)

**FHIR Version**: DSTU2 (older version)

#### Field Mapping (OMOP → FHIR) - `getRelatedResource()` (lines 316-363)

| OMOP Person Field | FHIR Patient Field | Notes |
|------------------|-------------------|-------|
| `person_id` | `Patient.id` | Direct mapping |
| `year_of_birth`, `month_of_birth`, `day_of_birth` | `Patient.birthDate` | Combined via Calendar |
| `gender_concept.name` | `Patient.gender` | Matched to AdministrativeGenderEnum |
| `location` | `Patient.address` | address1, address2, city, state, zipCode |
| `provider` | `Patient.careProvider` | Reference to Practitioner |

#### Field Mapping (FHIR → OMOP) - `constructEntityFromResource()` (lines 382-458)

| FHIR Patient Field | OMOP Person Field | Notes |
|-------------------|------------------|-------|
| `Patient.birthDate` | `year_of_birth`, `month_of_birth`, `day_of_birth` | Calendar decomposition |
| `Patient.gender` | `gender_concept_id` | Via OmopConceptMapping (first letter) |
| `Patient.address[0]` | `location_id` | Search existing or create Location |
| `Patient.careProvider[0]` | `provider_id` | Provider.searchAndUpdate() |

#### Key Implementation Details

**Gender Mapping** (lines 342-353, 393-398):
```java
// OMOP → FHIR: Match concept name to enum
String gName = this.genderConcept.getName(); // e.g., "MALE", "FEMALE"
for (AdministrativeGenderEnum value : AdministrativeGenderEnum.values()) {
    if(gName.equalsIgnoreCase(value.getCode())) {
        patient.setGender(value);
    }
}

// FHIR → OMOP: Use first letter of gender string
genderConcept.setId(OmopConceptMapping.getInstance().get(genderString.substring(0, 1), OmopConceptMapping.GENDER));
```

**Birth Date Handling** (lines 320-326, 386-390):
```java
// OMOP → FHIR
Calendar calendar = Calendar.getInstance();
calendar.set(yob, mob-1, dob);  // month is 0-indexed
patient.setBirthDate(new DateDt(calendar.getTime()));

// FHIR → OMOP
c.setTime(patient.getBirthDate());
this.yearOfBirth = c.get(Calendar.YEAR);
this.monthOfBirth = c.get(Calendar.MONTH)+1;
this.dayOfBirth = c.get(Calendar.DAY_OF_MONTH);
```

**Note**: This is a legacy project using FHIR DSTU2. Modern implementations should use omoponfhir-v54-r4 for FHIR R4.

---

### NACHC-fhir-to-omop (Java) - National Association of CHCs

**Source**: [`refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/person/OmopPersonBuilder.java`](../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/person/OmopPersonBuilder.java)

**Mapping Classes**: [`GenderMapping.java`](../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/util/mapping/GenderMapping.java), [`RaceMapping.java`](../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/util/mapping/RaceMapping.java), [`EthnicityMapping.java`](../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/util/mapping/EthnicityMapping.java)

**Direction**: FHIR → OMOP (FHIR DSTU3)

#### Field Mapping (FHIR → OMOP)

| FHIR Patient Field | OMOP Person Field | Notes |
|-------------------|------------------|-------|
| `Patient.id` | `person_source_value` | Direct copy |
| `Patient.id` | `person_id` | Auto-generated |
| `Patient.gender` | `gender_concept_id` | MALE→8507, FEMALE→8532, else→null→0 |
| `Patient.gender` | `gender_source_value` | Via `gender.toCode()` |
| `Patient.birthDate` | `year_of_birth` | Extracted year |
| `Patient.birthDate` | `month_of_birth` | Extracted month |
| `Patient.birthDate` | `day_of_birth` | Extracted day |
| `Patient.birthDate` | `birth_datetime` | Full datetime |
| US Core Race extension | `race_concept_id`, `race_source_value` | Via RaceMapping DB lookup |
| US Core Ethnicity extension | `ethnicity_concept_id`, `ethnicity_source_value` | Via EthnicityMapping DB lookup |
| (defaults) | `location_id` | Defaults to 1 |
| (defaults) | `care_site_id` | Defaults to 1 |
| (defaults) | `provider_id` | Defaults to 1 |

#### Key Implementation Details

**Gender Mapping** (GenderMapping.java):
```java
public static Integer getOmopConceptForFhirCode(AdministrativeGender ag) {
    if(ag == AdministrativeGender.MALE)   return 8507;
    else if (ag == AdministrativeGender.FEMALE) return 8532;
    else return null;  // fallback to 0 in caller
}
```

**Race/Ethnicity Mapping** (lines 61-98):
```java
// Race: Lookup via DB concept table
Coding coding = patient.getRace();
ConceptDvo race = new RaceMapping(conn).getOmopConceptForFhirCode(code);
dvo.setRaceConceptId(race.getConceptId());
dvo.setRaceSourceValue(code);

// Fallbacks for missing data
if (dvo.getRaceConceptId() == null) dvo.setRaceConceptId(0);
if (dvo.getRaceSourceValue() == null) dvo.setRaceSourceValue("Not Available");
```

**Note**: Uses FHIR DSTU3. Database-driven concept mappings for race/ethnicity.

---

### FHIROntopOMOP (Ontop VKG) - Virtual Knowledge Graph

**Source**: [`refs/FHIROntopOMOP/turtle-template/src/main/resources/mapping/Patient.json`](../refs/refs/FHIROntopOMOP/turtle-template/src/main/resources/mapping/Patient.json)

**Direction**: OMOP → FHIR (via SPARQL virtual knowledge graph)

**Profile**: US Core Patient (`http://hl7.org/fhir/us/core/StructureDefinition-us-core-patient.json`)

#### Mapping Configuration

```json
{
  "$vkg": {
    "$table": "omop.person",
    "$structuredefinition": "http://hl7.org/fhir/us/core/StructureDefinition-us-core-patient.json",
    "$baseIRI": "http://example.org/",
    "$idColumn": "person_id"
  }
}
```

#### Field Mapping (OMOP → FHIR)

| OMOP Person Field | FHIR Patient Field | Mapping |
|------------------|-------------------|---------|
| `person_id` | `Patient.identifier.value` | `$column` |
| `fname` | `Patient.name.family` | `$column` |
| `name1` | `Patient.name.given[0]` | `$column` |
| `name2` | `Patient.name.given[1]` | `$column` |
| `birth_datetime` | `Patient.birthDate` | `$column` |
| `gender_source_value` | `Patient.gender` | SQL CASE expression |

#### Gender Mapping Expression

```sql
CASE
  WHEN "gender_source_value" LIKE 'M' or "gender_source_value" LIKE 'male'
  THEN 'male'
  ELSE 'female'
END
```

**Note**: This is a declarative/virtualized approach using Ontop to expose OMOP as RDF/SPARQL. Minimal mapping - assumes extended OMOP with name columns (fname, name1, name2).

---

## Gaps and Considerations

- **Name handling**: OMOP has no standard name fields; some use extension tables
- **Race/Ethnicity**: US-specific; not applicable to German/European data
- **Multiple identifiers**: FHIR supports many; OMOP has single `person_source_value`
- **Address history**: FHIR supports multiple; OMOP links to one LOCATION
