# FHIR R4 to OMOP CDM v5.4 Mapping Plan

## Overview

This project implements a FHIR R4 to OMOP CDM v5.4 transformation pipeline using TypeScript/Bun, following the HL7 fhir-omop-ig methodology and CodeX cookbook guidance.

## Core Principles

### 1. Domain-Driven Mapping
- OMOP concept's `domain_id` determines target table, not FHIR resource type
- A FHIR Observation may become OMOP Measurement OR Observation based on concept domain
- A FHIR Condition may go to condition_occurrence, procedure_occurrence, or observation

### 2. Code Prioritization Hierarchy
When multiple codes present in CodeableConcept:
1. SNOMED CT
2. RxNorm
3. LOINC
4. ICD-10-CM / ICD-10-PCS
5. CPT / HCPCS
6. NDC
7. Local/institutional codes

### 3. Source Value Preservation
- Always store original codes in `*_source_value` fields
- Store standard concept in `*_concept_id` fields
- Enables audit trail and debugging

### 4. Status Filtering
- Only map completed/final activities
- Filter out: planned, cancelled, entered-in-error, draft
- FHIR status → OMOP typically loses this granularity

### 5. Type Concepts
Use `*_type_concept_id` to indicate data provenance:
- 32817 = EHR
- 32818 = EHR administration
- 32833 = EHR prescription
- 32879 = Registry

## Resource Mappings

### Patient → Person

| FHIR Element | OMOP Field | Notes |
|--------------|------------|-------|
| Patient.id | person_id | Generate integer via mapping table |
| Patient.gender | gender_concept_id | 8507=Male, 8532=Female, 8551=Unknown |
| Patient.birthDate | year_of_birth, month_of_birth, day_of_birth | Parse date parts |
| Patient.extension[race] | race_concept_id | US Core race extension |
| Patient.extension[ethnicity] | ethnicity_concept_id | US Core ethnicity extension |
| Patient.address | location_id | FK to location table |
| Patient.identifier | person_source_value | MRN or other identifier |

### Encounter → Visit_Occurrence

| FHIR Element | OMOP Field | Notes |
|--------------|------------|-------|
| Encounter.id | visit_occurrence_id | Integer mapping |
| Encounter.subject | person_id | Patient reference |
| Encounter.class | visit_concept_id | Map class to visit type |
| Encounter.period.start | visit_start_date/datetime | |
| Encounter.period.end | visit_end_date/datetime | |
| Encounter.type | visit_type_concept_id | 32817 (EHR) |
| Encounter.serviceProvider | care_site_id | Organization reference |

**Encounter Class Mapping:**
- inpatient → 9201 (Inpatient Visit)
- outpatient → 9202 (Outpatient Visit)
- emergency → 9203 (Emergency Room Visit)
- ambulatory → 9202
- home → 581476 (Home Visit)

### Condition → Condition_Occurrence

| FHIR Element | OMOP Field | Notes |
|--------------|------------|-------|
| Condition.id | condition_occurrence_id | Integer mapping |
| Condition.subject | person_id | |
| Condition.code | condition_concept_id | Via vocabulary lookup |
| Condition.code.text | condition_source_value | Original code |
| Condition.onsetDateTime | condition_start_date | |
| Condition.abatementDateTime | condition_end_date | |
| Condition.encounter | visit_occurrence_id | |
| Condition.category | condition_type_concept_id | |

**Status Filter:** Only map if `clinicalStatus` = active, recurrence, relapse, or `verificationStatus` = confirmed

### Observation → Measurement OR Observation

Routing decision based on concept domain lookup:

```
IF concept.domain_id = 'Measurement' → measurement table
ELSE → observation table
```

**Common Measurement mappings (labs, vitals):**

| FHIR Element | OMOP Field |
|--------------|------------|
| Observation.id | measurement_id |
| Observation.subject | person_id |
| Observation.code | measurement_concept_id |
| Observation.valueQuantity.value | value_as_number |
| Observation.valueQuantity.unit | unit_concept_id |
| Observation.referenceRange.low | range_low |
| Observation.referenceRange.high | range_high |
| Observation.effectiveDateTime | measurement_date/datetime |
| Observation.encounter | visit_occurrence_id |

**Status Filter:** Only map if `status` = final, amended, corrected

### Procedure → Procedure_Occurrence

| FHIR Element | OMOP Field |
|--------------|------------|
| Procedure.id | procedure_occurrence_id |
| Procedure.subject | person_id |
| Procedure.code | procedure_concept_id |
| Procedure.performedDateTime | procedure_date |
| Procedure.encounter | visit_occurrence_id |
| Procedure.performer.actor | provider_id |

**Status Filter:** Only map if `status` = completed

### MedicationRequest → Drug_Exposure

| FHIR Element | OMOP Field |
|--------------|------------|
| MedicationRequest.id | drug_exposure_id |
| MedicationRequest.subject | person_id |
| MedicationRequest.medicationCodeableConcept | drug_concept_id |
| MedicationRequest.authoredOn | drug_exposure_start_date |
| MedicationRequest.dispenseRequest.validityPeriod.end | drug_exposure_end_date |
| MedicationRequest.dosageInstruction.doseAndRate.doseQuantity | quantity |
| MedicationRequest.encounter | visit_occurrence_id |
| - | drug_type_concept_id | 32833 (EHR prescription) |

### Immunization → Drug_Exposure

| FHIR Element | OMOP Field |
|--------------|------------|
| Immunization.id | drug_exposure_id |
| Immunization.patient | person_id |
| Immunization.vaccineCode | drug_concept_id | CVX → RxNorm |
| Immunization.occurrenceDateTime | drug_exposure_start_date |
| Immunization.encounter | visit_occurrence_id |
| - | drug_type_concept_id | 32818 (EHR administration) |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  FHIR Resources │────▶│  Mapper Engine   │────▶│  OMOP Records   │
│  (JSON/NDJSON)  │     │  (TypeScript)    │     │  (JSON/CSV)     │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │  Vocabulary DB   │
                        │  (DuckDB)        │
                        └──────────────────┘
```

## Project Structure

```
fhir2omop/
├── src/
│   ├── index.ts              # Main entry point
│   ├── mapper/
│   │   ├── patient.ts        # Patient → Person
│   │   ├── encounter.ts      # Encounter → Visit_Occurrence
│   │   ├── condition.ts      # Condition → Condition_Occurrence
│   │   ├── observation.ts    # Observation → Measurement/Observation
│   │   ├── procedure.ts      # Procedure → Procedure_Occurrence
│   │   ├── medication.ts     # MedicationRequest → Drug_Exposure
│   │   └── immunization.ts   # Immunization → Drug_Exposure
│   ├── vocabulary/
│   │   ├── loader.ts         # Load OMOP vocabularies into DuckDB
│   │   ├── lookup.ts         # Concept lookup functions
│   │   └── concept-map.ts    # Code system mappings
│   ├── types/
│   │   ├── fhir.ts           # FHIR R4 type definitions
│   │   └── omop.ts           # OMOP CDM type definitions
│   └── utils/
│       ├── id-mapping.ts     # FHIR ID → OMOP integer mapping
│       ├── date.ts           # Date parsing/formatting
│       └── codeable.ts       # CodeableConcept handling
├── scripts/
│   ├── fhir-structuredef.ts  # Search FHIR StructureDefinitions
│   ├── fhir-valueset.ts      # Search FHIR ValueSets
│   ├── fhir-codesystem.ts    # Search FHIR CodeSystems
│   └── omop-table.ts         # Search OMOP tables
├── vocab/                    # OMOP vocabulary files (Athena download)
├── fhir-core/               # FHIR R4 core definitions (gitignored)
└── tests/
    ├── patient.test.ts
    ├── condition.test.ts
    └── ...
```

## Vocabulary Handling

### Loading Athena Vocabularies

```typescript
// vocab/loader.ts
import { Database } from "bun:sqlite";

export async function loadVocabularies(vocabDir: string, db: Database) {
  // Load concept.csv, vocabulary.csv, concept_relationship.csv
  // Use DuckDB for efficient querying
}
```

### Concept Lookup

```typescript
// vocab/lookup.ts
export interface ConceptLookup {
  conceptId: number;
  conceptName: string;
  domainId: string;
  vocabularyId: string;
  conceptClassId: string;
  standardConcept: string | null;
  conceptCode: string;
}

export function lookupByCode(
  system: string,
  code: string
): ConceptLookup | null;

export function lookupStandardConcept(
  sourceConceptId: number
): ConceptLookup | null;
```

### System to Vocabulary Mapping

| FHIR System URI | OMOP vocabulary_id |
|-----------------|-------------------|
| http://snomed.info/sct | SNOMED |
| http://loinc.org | LOINC |
| http://www.nlm.nih.gov/research/umls/rxnorm | RxNorm |
| http://hl7.org/fhir/sid/icd-10-cm | ICD10CM |
| http://hl7.org/fhir/sid/icd-10 | ICD10 |
| http://www.ama-assn.org/go/cpt | CPT4 |
| http://hl7.org/fhir/sid/ndc | NDC |
| urn:oid:2.16.840.1.113883.6.238 | Race |
| urn:oid:2.16.840.1.113883.6.12 | CPT4 |

## Implementation Phases

### Phase 1: Foundation
- [ ] Set up project structure
- [ ] Define FHIR R4 TypeScript types
- [ ] Define OMOP CDM TypeScript types
- [ ] Implement vocabulary loader (DuckDB)
- [ ] Implement concept lookup functions

### Phase 2: Core Mappers
- [ ] Patient → Person mapper
- [ ] Encounter → Visit_Occurrence mapper
- [ ] Condition → Condition_Occurrence mapper
- [ ] Basic test suite

### Phase 3: Clinical Data
- [ ] Observation → Measurement/Observation mapper (with domain routing)
- [ ] Procedure → Procedure_Occurrence mapper
- [ ] MedicationRequest → Drug_Exposure mapper
- [ ] Immunization → Drug_Exposure mapper

### Phase 4: Supporting Tables
- [ ] Organization → Care_Site mapper
- [ ] Practitioner → Provider mapper
- [ ] Location mapper
- [ ] Observation_Period generation

### Phase 5: Validation & Output
- [ ] OMOP record validation
- [ ] CSV output for database loading
- [ ] JSON output for APIs
- [ ] Data quality checks

## Testing Strategy

### Unit Tests
- Individual mapper functions
- Vocabulary lookups
- Code prioritization logic

### Integration Tests
- Full resource transformation
- Synthea-generated FHIR bundles
- Known test cases from HL7 IG

### Validation
- OMOP CDM constraints
- Required field completeness
- Referential integrity

## Key Challenges

### 1. ID Management
- FHIR uses string UUIDs, OMOP uses integers
- Maintain mapping table for bidirectional lookup
- Handle references between resources

### 2. Partial Dates
- FHIR allows YYYY or YYYY-MM
- OMOP requires full dates
- Imputation rules: missing month → 01, missing day → 01

### 3. Multiple Codes
- FHIR CodeableConcept can have multiple codings
- Must select best code using prioritization
- Preserve all codes in source_value

### 4. Domain Routing
- Same FHIR resource → different OMOP tables
- Requires vocabulary lookup before mapping
- Must handle unmapped concepts

### 5. Missing Concepts
- Not all codes map to standard concepts
- Store concept_id = 0 with source_value preserved
- Log unmapped codes for vocabulary gap analysis

## References

- [HL7 FHIR to OMOP IG](http://hl7.org/fhir/uv/omop)
- [CodeX FHIR-to-OMOP Cookbook](https://github.com/CodeX-HL7-FHIR-Accelerator/fhir2omop-cookbook)
- [OMOP CDM v5.4 Spec](https://ohdsi.github.io/CommonDataModel/cdm54.html)
- [Athena Vocabulary](https://athena.ohdsi.org/)
- [Echidna FHIR Terminology Server](https://echidna.fhir.org)
