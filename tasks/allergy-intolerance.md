# Task: AllergyIntolerance -> observation

**Priority**: P1 | **References**: 3/4 (HL7 IG, FhirToCdm, omoponfhir)

## Existing Spec

`spec/allergy-intolerance.md` — field mapping, implementations from 3 reference projects.

## Deliverables

### 1. FHIR Type (`src/types/fhir.ts`)

Add `AllergyIntolerance` interface:

```
AllergyIntolerance.id
AllergyIntolerance.clinicalStatus: CodeableConcept  (active | inactive | resolved)
AllergyIntolerance.verificationStatus: CodeableConcept  (unconfirmed | confirmed | refuted | entered-in-error)
AllergyIntolerance.type: allergy | intolerance
AllergyIntolerance.category: food | medication | environment | biologic
AllergyIntolerance.code: CodeableConcept
AllergyIntolerance.patient: Reference
AllergyIntolerance.encounter: Reference
AllergyIntolerance.onsetDateTime: string
AllergyIntolerance.recorder: Reference
AllergyIntolerance.reaction[].manifestation: CodeableConcept[]
AllergyIntolerance.reaction[].severity: mild | moderate | severe
```

### 2. OMOP Type

Reuse existing `OmopObservation` interface — no changes needed.

### 3. FSH Profile (`profiles/OmopAllergyIntolerance.fsh`)

- Base: AllergyIntolerance
- clinicalStatus: 1..1, restrict to active
- verificationStatus: exclude entered-in-error
- code: 1..1, bind to OMOP-resolvable codes (SNOMED, RxNorm)
- patient: 1..1

Add `OmopAllergyIntoleranceCodes` ValueSet to `profiles/valuesets.fsh`:
- SNOMED CT (allergy findings), RxNorm (drug allergens)

### 4. Mapper (`src/mapper/allergy-intolerance.ts`)

```
mapAllergyIntolerance(allergy: AllergyIntolerance, ctx: MappingContext): OmopObservation | null
```

- Status filter: clinicalStatus = `active`; verificationStatus != `entered-in-error`, `refuted`
- Type concept: 32817 (EHR)
- Key mapping rules:
  - code -> observation_concept_id (0) + observation_source_value
  - onsetDateTime -> observation_date
  - type (allergy|intolerance) -> qualifier_source_value
  - reaction[0].manifestation -> value_as_string
  - patient -> person_id
  - encounter -> visit_occurrence_id
  - recorder -> provider_id

### 5. Tests (`tests/allergy-intolerance.test.ts`)

Cover:
- Clinical status filtering (active -> mapped; resolved/inactive -> null)
- Verification status filtering (entered-in-error/refuted -> null)
- Required field validation (code, patient)
- Date handling (onsetDateTime present and missing)
- Type mapping (allergy vs intolerance -> qualifier)
- Reaction manifestation mapping
- Reference resolution (patient, encounter, recorder)
- Code prioritization
- Hash mode determinism

### 6. ValueSet Update (`profiles/valuesets.fsh`)

Add `OmopAllergyIntoleranceClinicalStatus` and `OmopAllergyIntoleranceVerificationStatus` ValueSets.
