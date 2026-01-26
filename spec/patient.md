# FHIR Patient to OMOP Mapping Specification

This document specifies how FHIR R4 Patient resources map to OMOP CDM v5.4 tables.

## Target OMOP Tables

| OMOP Table | Description |
|------------|-------------|
| **person** | Core patient demographics |
| **location** | Patient address |
| **death** | Mortality information |
| **observation_period** | Derived from clinical events (not directly from Patient) |

---

## FHIR Patient Structure

```
Patient
  ├── id                    0..1 string
  ├── identifier            0..* Identifier
  ├── active                0..1 boolean
  ├── name                  0..* HumanName
  ├── telecom               0..* ContactPoint
  ├── gender                0..1 code (male|female|other|unknown)
  ├── birthDate             0..1 date
  ├── deceased[x]           0..1 boolean|dateTime
  ├── address               0..* Address
  ├── maritalStatus         0..1 CodeableConcept
  ├── multipleBirth[x]      0..1 boolean|integer
  ├── photo                 0..* Attachment
  ├── contact               0..* BackboneElement
  ├── communication         0..* BackboneElement
  ├── generalPractitioner   0..* Reference(Practitioner|Organization)
  ├── managingOrganization  0..1 Reference(Organization)
  └── link                  0..* BackboneElement
```

### US Core Extensions (commonly used)

```
Patient.extension
  ├── us-core-race          0..1 Complex
  │     ├── ombCategory     0..5 Coding (OMB race categories)
  │     ├── detailed        0..* Coding (CDC detailed race codes)
  │     └── text            1..1 string
  └── us-core-ethnicity     0..1 Complex
        ├── ombCategory     0..1 Coding (OMB ethnicity category)
        ├── detailed        0..* Coding (CDC detailed ethnicity codes)
        └── text            1..1 string
```

---

## Mapping: Patient → person

### Field Mappings

| OMOP person Field | Type | Required | FHIR Source | Mapping Notes |
|-------------------|------|----------|-------------|---------------|
| `person_id` | integer | PK | `Patient.id` | Generate integer ID; store FHIR id in `person_source_value` |
| `gender_concept_id` | integer | Yes | `Patient.gender` | See gender mapping table below |
| `year_of_birth` | integer | Yes | `Patient.birthDate` | Extract year component |
| `month_of_birth` | integer | No | `Patient.birthDate` | Extract month component (if available) |
| `day_of_birth` | integer | No | `Patient.birthDate` | Extract day component (if available) |
| `birth_datetime` | datetime | No | `Patient.birthDate` | Convert to datetime (time = 00:00:00) |
| `race_concept_id` | integer | Yes | `Patient.extension[us-core-race]` | See race mapping table below |
| `ethnicity_concept_id` | integer | Yes | `Patient.extension[us-core-ethnicity]` | See ethnicity mapping table below |
| `location_id` | integer | FK | `Patient.address[0]` | FK to location table |
| `provider_id` | integer | FK | `Patient.generalPractitioner[0]` | FK to provider table (if Practitioner) |
| `care_site_id` | integer | FK | `Patient.managingOrganization` | FK to care_site table |
| `person_source_value` | varchar(50) | No | `Patient.id` or `Patient.identifier[0].value` | Original FHIR identifier |
| `gender_source_value` | varchar(50) | No | `Patient.gender` | Original gender code |
| `gender_source_concept_id` | integer | No | - | Usually 0 |
| `race_source_value` | varchar(50) | No | `extension[us-core-race].text` | Original race text |
| `race_source_concept_id` | integer | No | - | Usually 0 |
| `ethnicity_source_value` | varchar(50) | No | `extension[us-core-ethnicity].text` | Original ethnicity text |
| `ethnicity_source_concept_id` | integer | No | - | Usually 0 |

### Gender Mapping

| FHIR gender | OMOP concept_id | OMOP concept_name |
|-------------|-----------------|-------------------|
| `male` | 8507 | MALE |
| `female` | 8532 | FEMALE |
| `other` | 0 | No matching concept |
| `unknown` | 0 | No matching concept |
| (missing) | 0 | No matching concept |

**Note:** OMOP gender represents biological sex at birth, not gender identity. FHIR `other` and `unknown` have no standard OMOP equivalent.

### Race Mapping (US Core → OMOP)

| OMB Race Code | OMB Display | OMOP concept_id | OMOP concept_name |
|---------------|-------------|-----------------|-------------------|
| 1002-5 | American Indian or Alaska Native | 8657 | American Indian or Alaska Native |
| 2028-9 | Asian | 8515 | Asian |
| 2054-5 | Black or African American | 8516 | Black or African American |
| 2076-8 | Native Hawaiian or Other Pacific Islander | 8557 | Native Hawaiian or Other Pacific Islander |
| 2106-3 | White | 8527 | White |
| 2131-1 | Other Race | 0 | No matching concept |
| (missing) | - | 0 | No matching concept |

**Note:** FHIR us-core-race can have multiple ombCategory values. Use the first one or implement priority logic.

### Ethnicity Mapping (US Core → OMOP)

| OMB Ethnicity Code | OMB Display | OMOP concept_id | OMOP concept_name |
|--------------------|-------------|-----------------|-------------------|
| 2135-2 | Hispanic or Latino | 38003563 | Hispanic or Latino |
| 2186-5 | Not Hispanic or Latino | 38003564 | Not Hispanic or Latino |
| (missing) | - | 0 | No matching concept |

---

## Mapping: Patient.address → location

### Field Mappings

| OMOP location Field | Type | FHIR Source | Notes |
|---------------------|------|-------------|-------|
| `location_id` | integer | (generated) | Auto-generated PK |
| `address_1` | varchar(50) | `Address.line[0]` | First address line |
| `address_2` | varchar(50) | `Address.line[1]` | Second address line |
| `city` | varchar(50) | `Address.city` | |
| `state` | varchar(2) | `Address.state` | US state abbreviation |
| `zip` | varchar(9) | `Address.postalCode` | |
| `county` | varchar(20) | `Address.district` | |
| `country_concept_id` | integer | `Address.country` | Map to OMOP Geography vocabulary |
| `country_source_value` | varchar(80) | `Address.country` | Original country value |
| `latitude` | float | `Address.extension[geolocation].latitude` | If available |
| `longitude` | float | `Address.extension[geolocation].longitude` | If available |
| `location_source_value` | varchar(50) | `Address.text` | Full address as text |

### Address Selection Logic

When Patient has multiple addresses:
1. Prefer `Address.use = "home"` and `Address.period` is current
2. Fall back to first address in array
3. Skip addresses with `Address.use = "old"`

---

## Mapping: Patient.deceased → death

### Field Mappings

| OMOP death Field | Type | FHIR Source | Notes |
|------------------|------|-------------|-------|
| `person_id` | integer | (FK) | Link to person table |
| `death_date` | date | `Patient.deceasedDateTime` | Required if deceased |
| `death_datetime` | datetime | `Patient.deceasedDateTime` | Full datetime if available |
| `death_type_concept_id` | integer | - | See type concept mapping |
| `cause_concept_id` | integer | - | From Observation/Condition if available |
| `cause_source_value` | varchar(50) | - | From linked cause of death record |
| `cause_source_concept_id` | integer | - | Usually 0 |

### Death Detection Logic

```
IF Patient.deceasedBoolean = true OR Patient.deceasedDateTime exists:
    Create death record

IF Patient.deceasedDateTime exists:
    death_date = Patient.deceasedDateTime (date portion)
ELSE IF Patient.deceasedBoolean = true:
    death_date = NULL (or impute from last clinical event)
```

### Death Type Concept

| Source | concept_id | concept_name |
|--------|------------|--------------|
| EHR record | 32817 | EHR |
| Death certificate | 32885 | Death Certificate |
| Default/Unknown | 32817 | EHR |

**Note:** Cause of death typically comes from a separate FHIR Observation or Condition resource with appropriate category, not from Patient resource directly.

---

## Implementation Considerations

### ID Generation Strategy

| Approach | Description | Use When |
|----------|-------------|----------|
| **Hash-based** | Generate deterministic integer from `Patient.id` | Need reproducible IDs |
| **Sequence** | Auto-increment integer | Fresh database load |
| **Mapping table** | Store FHIR-to-OMOP ID mapping externally | Need bidirectional lookup |

```typescript
// Example: Hash-based ID generation
function generatePersonId(fhirId: string): number {
  const hash = crypto.createHash('sha256').update(fhirId).digest();
  return hash.readUInt32BE(0); // First 4 bytes as integer
}
```

### Partial Date Handling

FHIR allows partial dates (year only, year-month). OMOP requires at minimum `year_of_birth`.

| FHIR birthDate | year_of_birth | month_of_birth | day_of_birth |
|----------------|---------------|----------------|--------------|
| `1990-06-15` | 1990 | 6 | 15 |
| `1990-06` | 1990 | 6 | NULL |
| `1990` | 1990 | NULL | NULL |

### Status Filtering

Only map patients where:
- `Patient.active` is `true` or not present (default = active)
- Consider excluding test/synthetic patients based on `Patient.meta.tag`

### De-identification Considerations

**DO NOT map to OMOP:**
- `Patient.name` - contains PII
- `Patient.telecom` - contains PII
- `Patient.photo` - contains PII
- `Patient.identifier` where system indicates MRN/SSN

**Store in person_source_value:**
- Non-PII identifiers only
- Or use a separate secure mapping table

---

## Transformation Pseudocode

```typescript
function mapPatientToPerson(patient: FhirPatient): OmopPerson {
  return {
    person_id: generatePersonId(patient.id),
    gender_concept_id: mapGender(patient.gender),
    year_of_birth: extractYear(patient.birthDate),
    month_of_birth: extractMonth(patient.birthDate),
    day_of_birth: extractDay(patient.birthDate),
    birth_datetime: toDatetime(patient.birthDate),
    race_concept_id: mapRace(getExtension(patient, 'us-core-race')),
    ethnicity_concept_id: mapEthnicity(getExtension(patient, 'us-core-ethnicity')),
    location_id: mapAddress(patient.address),
    provider_id: mapProvider(patient.generalPractitioner),
    care_site_id: mapCareSite(patient.managingOrganization),
    person_source_value: patient.id,
    gender_source_value: patient.gender,
    gender_source_concept_id: 0,
    race_source_value: getRaceText(patient),
    race_source_concept_id: 0,
    ethnicity_source_value: getEthnicityText(patient),
    ethnicity_source_concept_id: 0,
  };
}

function mapPatientToDeath(patient: FhirPatient): OmopDeath | null {
  if (!patient.deceasedBoolean && !patient.deceasedDateTime) {
    return null;
  }

  return {
    person_id: generatePersonId(patient.id),
    death_date: extractDate(patient.deceasedDateTime),
    death_datetime: patient.deceasedDateTime,
    death_type_concept_id: 32817, // EHR
    cause_concept_id: null, // From separate Observation
    cause_source_value: null,
    cause_source_concept_id: null,
  };
}
```

---

## Validation Rules

### Required Fields Check
- [ ] `gender_concept_id` must be populated (0 if unknown)
- [ ] `year_of_birth` must be populated
- [ ] `race_concept_id` must be populated (0 if unknown)
- [ ] `ethnicity_concept_id` must be populated (0 if unknown)

### Referential Integrity
- [ ] `location_id` must exist in location table (or be NULL)
- [ ] `provider_id` must exist in provider table (or be NULL)
- [ ] `care_site_id` must exist in care_site table (or be NULL)

### Data Quality
- [ ] `year_of_birth` should be reasonable (> 1900, < current year)
- [ ] `birth_datetime` should not be in the future
- [ ] If death record exists, `death_date` >= `birth_datetime`

---

## References

- [HL7 FHIR-OMOP IG - PersonMap](https://build.fhir.org/ig/HL7/fhir-omop-ig/)
- [OHDSI FhirToCdm - Patient Mapping](https://github.com/OHDSI/FhirToCdm)
- [ETL-German-FHIR-Core - Patient Step](https://github.com/OHDSI/ETL-German-FHIR-Core)
- [US Core Race Extension](http://hl7.org/fhir/us/core/StructureDefinition/us-core-race)
- [US Core Ethnicity Extension](http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity)
- [OMOP CDM Person Table](https://ohdsi.github.io/CommonDataModel/cdm54.html#PERSON)
