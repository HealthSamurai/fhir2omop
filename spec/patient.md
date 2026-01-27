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

## Project Implementations

### omoponfhir-v54-r4 (Java)

**Source**: `omoponfhir-omopv5-r4-mapping/.../mapping/OmopPatient.java`

**Direction**: Bidirectional

**Features**:
- Uses `FPerson` extension table for name parts, SSN, marital status
- Supports US Core race/ethnicity extensions
- Death records created in DEATH table
- Location linked via LOCATION table

---

### fhir-omop-ig (FML)

**Source**: `input/maps/patient.fml`

**Direction**: FHIR → OMOP

```fml
group Person(source src : Patient, target tgt : PersonTable) {
    src.gender as g -> tgt.gender_concept_id = translate(g, 'GenderMap', 'code');
    src.birthDate as bd -> tgt then {
        bd -> tgt.year_of_birth = ToInteger(ToString(bd).substring(0,4));
    };
}
```

---

### ETL-German-FHIR-Core (Java)

**Source**: `src/main/java/.../mapper/PatientMapper.java`

**Direction**: FHIR → OMOP

**Features**:
- Supports bulk and incremental loading
- German-specific extensions
- FHIR logical ID tracking for updates

---

### FhirToCdm (.NET)

**Source**: `FhirToCdmMappings.cs` - `CreatePerson()`

**Direction**: FHIR → OMOP

---

### omopfhirmap (Java)

**Source**: `src/main/java/.../mapping/PatientMapper.java`

**Direction**: Bidirectional

---

### mends-on-fhir (Whistle)

**Source**: `whistle-mappings/.../Person_Patient.wstl`

**Direction**: OMOP → FHIR

**Profile**: US Core Patient

---

## Gaps and Considerations

- **Name handling**: OMOP has no standard name fields; some use extension tables
- **Race/Ethnicity**: US-specific; not applicable to German/European data
- **Multiple identifiers**: FHIR supports many; OMOP has single `person_source_value`
- **Address history**: FHIR supports multiple; OMOP links to one LOCATION
