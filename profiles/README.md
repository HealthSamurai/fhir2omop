# OMOP FHIR Profiles

FHIR profiles (StructureDefinitions) that define the constraints a FHIR resource must satisfy to be convertible to OMOP CDM.

## Profiles

| Profile | Base Resource | OMOP Target | File |
|---------|--------------|-------------|------|
| OmopMedicationStatement | MedicationStatement | drug_exposure | `OmopMedicationStatement.fsh` |

## ValueSets

| ValueSet | Description | File |
|----------|-------------|------|
| OmopDrugCodes | Drug terminologies resolvable in OMOP (RxNorm, NDC, SNOMED, ATC, CVX) | `valuesets.fsh` |
| OmopMedicationStatementStatus | Statuses representing actual drug exposure (active, completed) | `valuesets.fsh` |
| OmopConditionCodes | Condition terminologies resolvable in OMOP (SNOMED, ICD-10-CM, ICD-10, CPT) | `valuesets.fsh` |
| OmopObservationCodes | Observation terminologies resolvable in OMOP (LOINC, SNOMED, CPT) | `valuesets.fsh` |

## Format

Profiles are written in [FSH (FHIR Shorthand)](https://build.fhir.org/ig/HL7/fhir-shorthand/). FSH is the HL7 standard notation for defining FHIR profiles, extensions, and value sets.

## Validation

Use `scripts/profile.ts` to validate FHIR resources against these profiles:

```bash
# Validate a resource from a file
bun scripts/profile.ts validate OmopMedicationStatement resource.json

# Validate from stdin
cat resource.json | bun scripts/profile.ts validate OmopMedicationStatement

# List available profiles
bun scripts/profile.ts list

# Show profile details
bun scripts/profile.ts show OmopMedicationStatement
```
