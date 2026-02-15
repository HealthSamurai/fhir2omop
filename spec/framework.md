# Mapping Framework Analysis

Analysis of the mapping patterns across `./mapping`, `./tests`, `./profiles`, `./spec`, and `./src/mapper`.

## Current Architecture

```
FHIR Resource (JSON)
  │
  ├── Status filter (skip invalid/irrelevant)
  ├── Required field validation (skip if missing)
  ├── ID assignment via MappingContext.ids
  ├── Code selection via selectBestCoding()
  ├── Date resolution (polymorphic onset/effective/period)
  ├── Reference resolution via ctx.ids.resolveRef()
  └── OMOP record construction
```

### Mapper Signatures

Every mapper follows the same contract:

```typescript
function mapXxx(resource: FhirType, ctx: MappingContext = new MappingContext()): OmopType | null
```

- **Input**: FHIR resource + shared MappingContext
- **Output**: OMOP record(s) or `null` (if validation fails)
- **Pure**: No side effects beyond IdRegistry state
- **Default ctx**: Each mapper can work standalone (new MappingContext)

### Multi-Record Results

Patient and Observation produce multiple OMOP records:

| Mapper | Result Type | Tables |
|--------|-------------|--------|
| `mapPatient` | `PatientMappingResult` | person, location, death |
| `mapObservation` | `ObservationMappingResult` | measurement[], observation[] |
| `mapCondition` | `ConditionOccurrence \| null` | condition_occurrence |
| `mapEncounter` | `VisitOccurrence \| null` | visit_occurrence |
| `mapMedicationRequest` | `DrugExposure \| null` | drug_exposure |
| `mapMedicationStatement` | `DrugExposure \| null` | drug_exposure |
| `mapAllergyIntolerance` | `OmopObservation \| null` | observation |

## Mapping Pipeline (5 Stages)

Every mapper follows these stages, though implemented inline rather than as a formal pipeline:

### 1. Status Filter

Each resource type defines valid statuses. Invalid resources return `null` immediately.

| Resource | Valid Statuses | Reject |
|----------|---------------|--------|
| Patient | (all — no filter) | only if no birthDate |
| Encounter | finished, in-progress | planned, cancelled, entered-in-error |
| Condition | active, recurrence, relapse (clinical); confirmed, unconfirmed, provisional, differential (verification) | entered-in-error, refuted, inactive, resolved, remission |
| Observation | final, amended, corrected | registered, preliminary, cancelled, entered-in-error |
| MedicationRequest | active, completed | cancelled, entered-in-error, draft, stopped, on-hold |
| MedicationStatement | active, completed | entered-in-error, intended, stopped, on-hold, not-taken |
| AllergyIntolerance | active (clinical) | inactive, resolved; entered-in-error, refuted (verification) |

### 2. Required Field Validation

After status filtering, each mapper checks for required data:

| Resource | Required Fields | Skip If Missing |
|----------|----------------|-----------------|
| Patient | birthDate | yes (year_of_birth is OMOP required) |
| Encounter | period.start | yes |
| Condition | code.coding, start date (onset/recorded) | yes |
| Observation | code.coding, effectiveDateTime | yes |
| MedicationRequest | medicationCodeableConcept.coding, authoredOn | yes |
| MedicationStatement | medicationCodeableConcept.coding, effective date | yes |
| AllergyIntolerance | code.coding, onsetDateTime | yes |

### 3. ID Assignment

All resources use `ctx.ids.getId(resourceType, fhirId)` to get deterministic integer IDs.

Two modes:
- **Sequential** (default): 1, 2, 3... per resource type. Deterministic within one run.
- **Hash** (FNV-1a-64): deterministic across independent runs. Collision detection built-in.

Special ID patterns:
- Location IDs: `ctx.ids.getId("Location", "Patient/{id}")` — derived from patient
- Component observations: `ctx.ids.getId("Observation", "{id}-comp-{index}")` — suffix per component

### 4. Field Mapping

Each mapper maps FHIR fields to OMOP fields using:

- **Concept maps** — static `Record<string, number>` for FHIR code → OMOP concept_id
- **selectBestCoding()** — vocabulary-priority selection from CodeableConcept
- **Date resolution** — polymorphic date handling (dateTime, Period, fallback chain)
- **Reference resolution** — `ctx.ids.resolveRef(ref)` for FK relationships
- **Source value preservation** — original code/text stored in `*_source_value`

### 5. Record Construction

Each mapper returns a typed OMOP object. Key patterns:
- `*_concept_id = 0` when vocabulary lookup not yet available
- `*_source_value` always populated for audit trail
- `*_source_concept_id = 0` (placeholder for source vocabulary concept)
- `*_type_concept_id` indicates data provenance (32817=EHR, 44787730=patient-reported, 38000177=prescription)

## Concept Mapping Strategy

### Static Concept Maps (currently implemented)

```typescript
// Gender: 4 values → 4 OMOP concepts
const GENDER_CONCEPT = { male: 8507, female: 8532, other: 8521, unknown: 8551 }

// Visit class: 9 FHIR codes → 4 OMOP concepts
const VISIT_CONCEPT = { IMP: 9201, AMB: 9202, EMER: 9203, HH: 581476, ... }

// Condition type: category → provenance concept
const TYPE_CONCEPT = { "problem-list-item": 32840, "encounter-diagnosis": 32817 }

// Race/Ethnicity: OMB codes → OMOP concepts
const RACE_CONCEPT = { "1002-5": 8657, "2028-9": 8515, ... }
```

### Vocabulary Lookup (not yet implemented)

Clinical codes (SNOMED, LOINC, RxNorm, ICD-10) need Athena vocabulary database for:
- `*_concept_id` resolution (currently 0)
- Domain-based routing (Observation → Measurement vs Observation)
- Standard concept mapping
- Unit concept resolution (UCUM → OMOP concept_id)

## Testing Patterns

### Two Testing Approaches

**1. Inline test fixtures** (condition, encounter, observation, medication, allergy-intolerance)

```typescript
function makeResource(overrides = {}): ResourceType {
  return { /* valid defaults */ ...overrides };
}
test("description", () => {
  const result = mapResource(makeResource({ field: "value" }));
  expect(result.field).toBe(expected);
});
```

**2. JSON data-driven tests** (patient only — `tests/patient/run.test.ts`)

```json
[{
  "description": "test name",
  "fhir": [{ "resourceType": "Patient", ... }],
  "omop": [{ "table": "person", "field": "value" }]
}]
```

The JSON data-driven approach (`run.test.ts`) is more declarative and enables:
- Hash mode compatibility testing (auto-relaxes ID assertions)
- Partial field matching (only check specified fields)
- Table-grouped assertions
- Reusable test data

### Test Coverage

| Mapper | Test Categories | Fixture Style |
|--------|----------------|---------------|
| Patient | gender, birthdate, identifier, address, death, race/ethnicity, references, full integration, hash mode | JSON data-driven + inline |
| Condition | status filter, onset/abatement, type/status concepts, references | inline |
| Encounter | status filter, visit class, dates | inline |
| Observation | status filter, category routing, component expansion, values | inline |
| MedicationRequest | status filter, fields, type concept, references, hash mode, code priority | inline |
| MedicationStatement | status filter, dates, dosage, references, code priority | inline |
| AllergyIntolerance | status filter, reactions, references | inline |
| MappingContext | IdRegistry sequential/hash, collision detection, reference resolution | inline |

**Total: 370 tests, 972 assertions, 9 test files.**

## Profiles (FHIR Shorthand)

9 FSH profiles define OMOP-convertible constraints:

| Profile | Base Resource | Key Constraints |
|---------|--------------|-----------------|
| OmopPatient | Patient | birthDate 1..1, gender 1..1, identifier 1..* |
| OmopCondition | Condition | code 1..1, clinicalStatus 1..1, onset[x] 1..1 |
| OmopEncounter | Encounter | period.start 1..1, class 1..1, status from valid set |
| OmopObservation | Observation | code 1..1, effective[x] 1..1, status from valid set |
| OmopMeasurement | Observation | + valueQuantity 1..1, referenceRange |
| OmopMedicationRequest | MedicationRequest | medication[x] 1..1, authoredOn 1..1 |
| OmopMedicationStatement | MedicationStatement | medication[x] 1..1, effective[x] 1..1 |
| OmopAllergyIntolerance | AllergyIntolerance | code 1..1, clinicalStatus 1..1, onset 1..1 |
| valuesets | — | Shared ValueSet definitions |

Profiles mirror the mapper validation rules — a resource conforming to the profile is guaranteed to produce a non-null mapping result.

## Identified Inconsistencies

### 1. MedicationStatement uses `resolveReferenceAsNumber` instead of MappingContext

`medication-statement.ts` is the only mapper that uses the old `resolveReferenceAsNumber()` utility instead of `ctx.ids.resolveRef()`. This means:

- No IdRegistry tracking for referenced resources
- References only work if FHIR IDs happen to be numeric integers
- Hash mode doesn't work for MedicationStatement references
- Tests use `expect(result.person_id).toBe(123)` (numeric FHIR ID) vs the pattern in other tests

All other mappers (patient, condition, encounter, observation, medication-request, allergy-intolerance) correctly use `MappingContext`.

### 2. MedicationStatement doesn't accept MappingContext parameter

The function signature is `mapMedicationStatement(statement)` — it doesn't accept or use a `MappingContext`. This breaks the uniform mapper contract.

### 3. MedicationStatement missing `drug_exposure_id`

The MedicationStatement mapper doesn't assign `drug_exposure_id` from the IdRegistry, while MedicationRequest does.

### 4. No unified result type for single-table mappers

Patient has `PatientMappingResult`, Observation has `ObservationMappingResult`, but single-table mappers return the OMOP type directly. This is fine now but could benefit from a uniform `MappingResult<T>` wrapper if we add metadata (warnings, unmapped codes, etc.).

### 5. Observation component result types are loose

`ObservationMappingResult` uses `Measurement | Measurement[] | null` — the union with arrays makes consumer code complex. A consistent array-based approach would be cleaner.

## Spec ↔ Code Alignment

The `spec/` and `mapping/` docs are well-aligned with the code:

| Spec Doc | Mapper | Status |
|----------|--------|--------|
| spec/patient.md (1600 lines) | patient.ts | Aligned — all field mappings, gender concepts, identifier priority match |
| spec/condition.md | condition.ts | Aligned — status filter, onset fallback chain, type concepts match |
| spec/encounter.md | encounter.ts | Aligned — visit class mapping, status filter match |
| spec/observation.md | observation.ts | Aligned — category routing, component expansion match |
| spec/medication.md | medication.ts + medication-statement.ts | Aligned — type concepts, date resolution match |
| spec/allergy-intolerance.md | allergy-intolerance.ts | Aligned — status filter, reaction extraction match |
| spec/procedure.md | — | No mapper yet (Phase 3) |
| spec/immunization.md | — | No mapper yet (Phase 3) |
| spec/diagnostic-report.md | — | No mapper yet |

## Utility Layer

### date.ts
- `parseFhirDate(date)` — YYYY / YYYY-MM / YYYY-MM-DD → `{ year, month, day }`
- `toBirthDatetime(date)` — partial date → padded ISO datetime
- `toDate(datetime)` — ISO datetime → YYYY-MM-DD

### codeable.ts
- `selectBestCoding(concept)` — vocabulary-priority selection (SNOMED > RxNorm > LOINC > ...)
- `getSourceValue(concept)` — first code or text
- `systemToVocab(system)` — FHIR system URI → OMOP vocabulary_id

### reference.ts
- `resolveReference(ref)` — extract resource ID from Reference
- `resolveReferenceAsNumber(ref)` — parse numeric ID (legacy, used only by MedicationStatement)

### mapping-context.ts
- `IdRegistry` — sequential or FNV-1a-64 hash ID assignment with collision detection
- `MappingContext` — shared state wrapper (currently just IdRegistry, extensible)

## Recommendations

### Fix MedicationStatement Inconsistency

Migrate `medication-statement.ts` to accept `MappingContext` and use `ctx.ids.resolveRef()` / `ctx.ids.getId()`, matching all other mappers. Update tests accordingly.

### Extend JSON Data-Driven Testing

The `run.test.ts` pattern in `tests/patient/` is superior for mapping tests. Consider extending it to all resources — define FHIR input + expected OMOP output as JSON, auto-run with both sequential and hash modes.

### Add Procedure and Immunization Mappers

These are specified in `spec/` but not yet implemented. They follow the established pattern exactly.

### Vocabulary Integration

The biggest gap is `*_concept_id = 0` everywhere. When Athena vocabularies are loaded into DuckDB, the MappingContext should gain a `vocab: VocabularyLookup` field that mappers can call for concept resolution.

### Future: Mapping Metadata

Consider adding a `MappingResult<T>` wrapper that includes:
- The mapped record(s)
- Warnings (unmapped codes, partial dates, missing optional fields)
- Source tracing (which FHIR field produced which OMOP field)
