# Patient — Unmapped Elements

FHIR Patient elements with no direct mapping to OMOP PERSON / LOCATION / DEATH.

| FHIR Element | Reason | Potential Approach |
|---|---|---|
| `name` | No column in PERSON (OMOP is de-identified) | PII — not stored in OMOP CDM |
| `telecom` | No column | PII — phone/email |
| `maritalStatus` | No column in PERSON | Map to observation |
| `multipleBirth[x]` | No column | Map to observation |
| `photo` | No column | PII — not applicable |
| `contact` | No column | Contact persons |
| `communication` | No column | Communication language |
| `link` | No direct equivalent | Links between patient records |
| `active` | Not used for filtering | Record status (not clinical) |
| `generalPractitioner[1..n]` | OMOP has a single provider_id | Use only the first |
| `extension` (other than race/ethnicity) | No standard fields | Implementation-specific extensions |
| `identifier[1..n]` (other than best) | person_source_value is a single value | Select best by priority SSN > MRN > first |
| `address[1..n]` (other than home) | One LOCATION per patient | Select home address |
