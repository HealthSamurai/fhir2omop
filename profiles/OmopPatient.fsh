// OMOP-Convertible Patient Profile
// Constraints guaranteeing successful mapping to OMOP person, location, and death tables.

Profile: OmopPatient
Parent: Patient
Id: omop-patient
Title: "OMOP-Convertible Patient"
Description: """
  Constrains FHIR Patient so that any conformant resource can be reliably
  converted to OMOP CDM person, location, and death records.

  Key requirements:
  - birthDate is mandatory (OMOP person.year_of_birth is required)
  - gender should use the FHIR administrative-gender ValueSet
  - At least one identifier is recommended for person_source_value
  - US Core race/ethnicity extensions are recommended for race_concept_id / ethnicity_concept_id
  - deceasedDateTime is preferred over deceasedBoolean for death record creation
"""

// --- Birth date: OMOP year_of_birth is required ---
* birthDate 1..1 MS

// --- Gender: maps to gender_concept_id ---
* gender MS
* gender from http://hl7.org/fhir/ValueSet/administrative-gender (required)

// --- Identifier: recommended for person_source_value ---
* identifier MS

// --- Address: maps to OMOP location table ---
* address MS
* address.city MS
* address.state MS
* address.postalCode MS
* address.country MS

// --- Deceased: maps to OMOP death table ---
* deceased[x] MS

// --- Provider linkage ---
* generalPractitioner MS    // -> provider_id
* managingOrganization MS   // -> care_site_id

// --- US Core race extension (recommended for race_concept_id) ---
* extension contains
    http://hl7.org/fhir/us/core/StructureDefinition/us-core-race named race 0..1 MS and
    http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity named ethnicity 0..1 MS
