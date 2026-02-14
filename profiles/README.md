# OMOP FHIR Profiles

FHIR profiles (StructureDefinitions in FSH notation) that define the constraints a FHIR resource must satisfy to be convertible to OMOP CDM.

The key idea: **not every FHIR resource can be converted into OMOP** — only those that conform to a "profile" (a set of constraints) which guarantees smooth conversion.

## Profiles

| Profile | Base Resource | OMOP Target | File |
|---------|--------------|-------------|------|
| OmopPatient | Patient | person, location, death | `OmopPatient.fsh` |
| OmopEncounter | Encounter | visit_occurrence | `OmopEncounter.fsh` |
| OmopCondition | Condition | condition_occurrence | `OmopCondition.fsh` |
| OmopObservation | Observation | measurement / observation | `OmopObservation.fsh` |
| OmopMedicationRequest | MedicationRequest | drug_exposure | `OmopMedicationRequest.fsh` |
| OmopMedicationStatement | MedicationStatement | drug_exposure | `OmopMedicationStatement.fsh` |

## ValueSets

| ValueSet | Description | File |
|----------|-------------|------|
| OmopDrugCodes | Drug terminologies resolvable in OMOP (RxNorm, NDC, SNOMED, ATC, CVX) | `valuesets.fsh` |
| OmopConditionCodes | Condition terminologies resolvable in OMOP (SNOMED, ICD-10-CM, ICD-10, CPT) | `valuesets.fsh` |
| OmopObservationCodes | Observation terminologies resolvable in OMOP (LOINC, SNOMED, CPT) | `valuesets.fsh` |
| OmopMedicationStatementStatus | Statuses representing actual drug exposure (active, completed) | `valuesets.fsh` |
| OmopMedicationRequestStatus | Statuses representing actual prescriptions (active, completed) | `valuesets.fsh` |
| OmopEncounterStatus | Statuses representing actual visits (finished, in-progress) | `valuesets.fsh` |
| OmopEncounterClass | ActCode values for visit type (IMP, AMB, EMER, etc.) | `valuesets.fsh` |
| OmopConditionClinicalStatus | Active condition statuses (active, recurrence, relapse) | `valuesets.fsh` |
| OmopConditionVerificationStatus | Acceptable verification statuses (excludes entered-in-error) | `valuesets.fsh` |
| OmopObservationStatus | Finalized observation statuses (final, amended, corrected) | `valuesets.fsh` |
| OmopObservationCategory | Categories for OMOP table routing (laboratory, vital-signs, etc.) | `valuesets.fsh` |

## Format

Profiles are written in [FSH (FHIR Shorthand)](https://build.fhir.org/ig/HL7/fhir-shorthand/). FSH is the HL7 standard notation for defining FHIR profiles, extensions, and value sets.

## CLI

Use `scripts/profile.ts` to work with profiles:

```bash
# List all profiles and value sets
bun scripts/profile.ts list

# Show profile constraints
bun scripts/profile.ts show OmopMedicationStatement

# Validate a resource against a profile
bun scripts/profile.ts validate OmopMedicationStatement resource.json

# Validate from stdin
cat resource.json | bun scripts/profile.ts validate OmopMedicationStatement
```

## Profile Design Principles

Each profile encodes the constraints that guarantee a FHIR resource can be meaningfully converted to OMOP:

1. **Status filters** — only statuses representing actual clinical events (not entered-in-error, planned, etc.)
2. **Required codes** — coded elements bound to ValueSets of OMOP-resolvable terminologies
3. **Required dates** — OMOP date fields are mandatory; profiles tighten optional FHIR dates to 1..1
4. **Must-support flags** — elements that enrich the OMOP record (MS = recommended for quality)
5. **Type restrictions** — e.g., medication must be CodeableConcept (not bare Reference) for code extraction
6. **Terminology bindings** — extensible bindings to OMOP-recognized code systems
