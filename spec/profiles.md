# FHIR OMOP Profiles

## Concept

Not every FHIR resource can be converted to OMOP — only those conforming to certain constraints. OMOP profiles define these constraints declaratively, allowing resources to be validated *before* conversion.

Each profile defines:
- **Error rules**: violations that prevent conversion (missing required fields, invalid status)
- **Warning rules**: data quality issues that don't block conversion but may result in data loss

## Architecture

```
FHIR Resource → validate(resource, profile) → ValidationResult
                                                 ├── valid: true  → map(resource) → OMOP Record
                                                 └── valid: false → issues[] (structured errors)
```

## Profiles

### OmopPatient (Patient → Person + Location + Death)

| Rule | Severity | Path | Description |
|------|----------|------|-------------|
| patient-birthdate-required | error | Patient.birthDate | year_of_birth is mandatory in OMOP |
| patient-birthdate-format | error | Patient.birthDate | Must be YYYY, YYYY-MM, or YYYY-MM-DD |
| patient-gender-valueset | warning | Patient.gender | Should be male/female/other/unknown |
| patient-identifier-present | warning | Patient.identifier | Needed for person_source_value |
| patient-deceased-datetime | warning | Patient.deceased[x] | deceasedDateTime preferred for death record |
| patient-race-extension | warning | Patient.extension(us-core-race) | Needed for race_concept_id |
| patient-ethnicity-extension | warning | Patient.extension(us-core-ethnicity) | Needed for ethnicity_concept_id |

### OmopEncounter (Encounter → visit_occurrence)

| Rule | Severity | Path | Description |
|------|----------|------|-------------|
| encounter-status-valid | error | Encounter.status | Must be finished or in-progress |
| encounter-period-start-required | error | Encounter.period.start | visit_start_date is mandatory |
| encounter-class-present | error | Encounter.class | Needed for visit_concept_id |
| encounter-class-known | warning | Encounter.class | Should be a recognized ActCode |
| encounter-subject-present | warning | Encounter.subject | Needed for person_id linkage |

### OmopCondition (Condition → condition_occurrence)

| Rule | Severity | Path | Description |
|------|----------|------|-------------|
| condition-not-entered-in-error | error | Condition.verificationStatus | entered-in-error not mappable |
| condition-clinical-status-valid | error | Condition.clinicalStatus | Must be active/recurrence/relapse |
| condition-verification-status-valid | error | Condition.verificationStatus | Must be confirmed/unconfirmed/provisional/differential |
| condition-code-required | error | Condition.code | Needed for condition_concept_id |
| condition-code-known-system | warning | Condition.code.coding.system | Should be SNOMED, ICD-10-CM, etc. |
| condition-onset-required | error | Condition.onsetDateTime | condition_start_date is mandatory |
| condition-subject-present | warning | Condition.subject | Needed for person_id linkage |

### OmopObservation (Observation → measurement / observation)

| Rule | Severity | Path | Description |
|------|----------|------|-------------|
| observation-status-valid | error | Observation.status | Must be final/amended/corrected |
| observation-code-required | error | Observation.code | Needed for concept_id |
| observation-code-known-system | warning | Observation.code.coding.system | Should be LOINC, SNOMED, etc. |
| observation-effective-required | error | Observation.effectiveDateTime | Date is mandatory |
| observation-category-present | warning | Observation.category | Needed for table routing |
| observation-category-known | warning | Observation.category | Should be laboratory/vital-signs/social-history/survey/activity |
| observation-value-present | warning | Observation.value[x] | Recommended for meaningful data |
| observation-subject-present | warning | Observation.subject | Needed for person_id linkage |

### OmopMedicationRequest (MedicationRequest → drug_exposure)

| Rule | Severity | Path | Description |
|------|----------|------|-------------|
| medication-status-valid | error | MedicationRequest.status | Must be active or completed |
| medication-code-required | error | MedicationRequest.medicationCodeableConcept | Needed for drug_concept_id |
| medication-code-known-system | warning | MedicationRequest.medicationCodeableConcept.coding.system | Should be RxNorm, NDC, etc. |
| medication-authored-on-required | error | MedicationRequest.authoredOn | drug_exposure_start_date is mandatory |
| medication-subject-present | warning | MedicationRequest.subject | Needed for person_id linkage |
| medication-end-date-present | warning | MedicationRequest.dispenseRequest.validityPeriod.end | Recommended for drug_exposure_end_date |

## Usage

### Validate only (check conformance)
```ts
import { validateResource } from "./src/profile/validate-and-map";

const result = validateResource(fhirResource);
if (!result.valid) {
  console.log("Cannot convert:", result.issues);
}
```

### Validate and map (combined workflow)
```ts
import { validateAndMapPatient } from "./src/profile/validate-and-map";

const { validation, result } = validateAndMapPatient(patient);
if (validation.valid) {
  // result contains the OMOP records
} else {
  // validation.issues explains why conversion failed
}
```

### Access profile definitions
```ts
import { getProfile, profiles } from "./src/profile/index";

const patientProfile = getProfile("Patient");
console.log(patientProfile.rules.map(r => r.description));
```

## Design Decisions

1. **Errors vs Warnings**: Errors block conversion (missing required OMOP fields). Warnings indicate data quality issues but allow conversion to proceed.

2. **Profile-per-resource**: Each FHIR resource type that has an OMOP mapping gets its own profile. Resources without profiles (e.g., CarePlan) are rejected with a "no profile" error.

3. **Rules mirror mapper logic**: Profile rules encode the same constraints that mappers check internally (status filtering, required fields, etc.), but in a declarative, inspectable format with structured error messages.

4. **Terminology warnings**: Using non-standard code systems (e.g., local codes instead of SNOMED/LOINC) produces warnings since concept_id resolution may fail, but conversion still proceeds.
