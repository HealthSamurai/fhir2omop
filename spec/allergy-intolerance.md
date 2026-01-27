# AllergyIntolerance ↔ OMOP OBSERVATION Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| AllergyIntolerance | OBSERVATION | Bidirectional |

**Note**: Maps to `observation` table (not drug_exposure) - allergies are clinical findings.

## Field Mapping

| FHIR Field | OMOP Field |
|------------|------------|
| `code` | `observation_concept_id` |
| `onsetDateTime` | `observation_date/datetime` |
| `patient` | `person_id` |
| `encounter` | `visit_occurrence_id` |
| `recorder` | `provider_id` |
| `reaction.manifestation` | `value_as_concept_id` |

## Implementations

- **omoponfhir-v54-r4**: `OmopAllergyIntolerance.java` - bidirectional
- **fhir-omop-ig**: `Allergy.fml` - FHIR→OMOP
- **FhirToCdm**: `CreateObservation()` - FHIR→OMOP
