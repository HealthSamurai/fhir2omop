# AllergyIntolerance → observation

OMOP CDM v5.4. Allergies and intolerances are stored in the `observation` table. One FHIR AllergyIntolerance maps to one `observation` row (or multiple if each reaction produces a separate row).

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `observation_id` | integer | Yes (PK) | Surrogate key from `AllergyIntolerance.id`. Hash or sequence via `ctx.ids.getId()`. |
| `AllergyIntolerance.patient` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference via `ctx.ids.resolveRef()`. |
| `AllergyIntolerance.code` | `observation_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | SNOMED allergy/substance concept. Requires vocabulary lookup. This project: 0 (placeholder). omoponfhir: category-driven (see Vocabulary Mappings). FhirToCdm: direct vocab lookup on code. |
| `AllergyIntolerance.onsetDateTime` | `observation_date` | dateTime → date | Yes | Onset date. Fallback chain: `onsetPeriod.start` → `recordedDate`. If all absent, record is skipped. |
| `AllergyIntolerance.onsetDateTime` | `observation_datetime` | dateTime | No | Full ISO datetime when available. Null if source is date-only or from fallback. |
| (constant) | `observation_type_concept_id` | integer (FK CONCEPT) | Yes | This project: 32817 (EHR). omoponfhir: 38000280 ("Observation recorded from EHR"). See Type Concepts below. |
| (none) | `value_as_number` | float | No | null. Not applicable for allergy data. |
| `AllergyIntolerance.reaction[*].manifestation[*]` display | `value_as_string` | string → varchar(60) | No | Concatenated manifestation display names, semicolon-separated. All reactions and manifestations are included. |
| `AllergyIntolerance.reaction[0].manifestation[0]` | `value_as_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | First reaction manifestation concept. Requires vocab lookup. This project: null (placeholder). HL7 IG FML maps manifestation code here. omoponfhir places the substance here instead. |
| (none) | `qualifier_concept_id` | integer (FK CONCEPT) | No | null. Could map `type` (allergy/intolerance) or `criticality` if standard concepts existed. |
| `AllergyIntolerance.type` | `qualifier_source_value` | string → varchar(50) | No | `"allergy"` or `"intolerance"`. Preserves the type distinction. |
| (none) | `unit_concept_id` | integer (FK CONCEPT) | No | null. Not applicable for allergy data. |
| (none) | `unit_source_value` | varchar(50) | No | null. Not applicable for allergy data. |
| `AllergyIntolerance.asserter` or `.recorder` | `provider_id` | ref → integer (FK PROVIDER) | No | This project: prefer `asserter`, fall back to `recorder`. omoponfhir: `recorder` only. See Reference Resolution. |
| `AllergyIntolerance.encounter` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Resolve Encounter reference. |
| (none) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | null. Not mapped by any implementation. Could link to ward/ICU detail if available. |
| `AllergyIntolerance.code.coding[best].code` | `observation_source_value` | code → varchar(50) | No | Source allergy code (verbatim). Best coding selected by system priority (SNOMED > RxNorm > first). |
| (none) | `observation_source_concept_id` | integer (FK CONCEPT) | No | 0. Could hold the non-standard concept for the source code if vocabulary lookup is available. |
| `AllergyIntolerance.criticality` | `value_source_value` | string → varchar(50) | No | `"low"`, `"high"`, or `"unable-to-assess"`. Preserves criticality. |
| (none) | `observation_event_id` | integer | No | null. Could link to related records (e.g., triggering Encounter or MedicationAdministration). Not mapped. |
| (none) | `obs_event_field_concept_id` | integer (FK CONCEPT) | No | null. Identifies the table of `observation_event_id`. Not mapped. |

FHIR fields with no OMOP target: `AllergyIntolerance.clinicalStatus` (used for filtering only), `AllergyIntolerance.verificationStatus` (used for filtering only), `AllergyIntolerance.category` (food/medication/environment/biologic — informs concept selection in omoponfhir but not stored directly), `AllergyIntolerance.reaction[].severity` (mild/moderate/severe), `AllergyIntolerance.reaction[].exposureRoute`, `AllergyIntolerance.reaction[].onset`, `AllergyIntolerance.reaction[].substance`, `AllergyIntolerance.note`, `AllergyIntolerance.lastOccurrence`.

## Vocabulary Mappings

### observation_concept_id Strategy

Two competing approaches exist for `observation_concept_id`:

**Approach A: Category-based concept (omoponfhir)**

The substance goes to `value_as_concept_id`; `observation_concept_id` represents the allergy category.

| FHIR `category` | OMOP concept_id | OMOP concept_name | Vocabulary |
|---|---|---|---|
| `food` | 4188027 | Allergy to food | SNOMED |
| `medication` | 439224 | Allergy to drug | SNOMED |
| `environment` | 40772948 | Allergy | SNOMED |
| `biologic` | 40772948 | Allergy | SNOMED |
| (absent, substance domain = Drug) | 439224 | Allergy to drug | SNOMED |
| (absent, other domain) | 40772948 | Allergy | SNOMED |

Additional medication allergy concepts used by omoponfhir for reverse mapping (OMOP → FHIR):
- 4166257 — Allergic disorder caused by drug
- 4297808 — Allergic reaction caused by drug
- 4299541 — Drug allergy
- 4165345 — Allergy to substance
- 37017420 — Allergic reaction caused by substance
- 4164867 — Drug adverse reaction
- 4171468 — Drug intolerance

**Approach B: Direct substance concept (FhirToCdm, HL7 IG FML)**

The substance code is looked up in the vocabulary and placed directly in `observation_concept_id`. `value_as_concept_id` may hold the reaction manifestation concept.

**This project:** Currently uses 0 (placeholder). Will require vocabulary lookup to implement either approach.

### observation_type_concept_id (Type Concepts)

| concept_id | Name | Used by |
|---|---|---|
| 32817 | EHR | This project, FhirToCdm, fhir-to-omop-demo |
| 38000280 | Observation recorded from EHR | omoponfhir, omoponfhir-v54 |

Both are valid; 32817 is the more modern convention (OMOP CDM v6 recommendation). 38000280 is a legacy type concept still widely used.

### clinicalStatus Filtering

| FHIR `clinicalStatus` code | Action | Rationale |
|---|---|---|
| `active` | Map | Active allergy |
| `inactive` | Skip | Historical — no longer clinically relevant |
| `resolved` | Skip | Previously active, now resolved |
| (absent) | Map | Not required in FHIR; map permissively |

### verificationStatus Filtering

| FHIR `verificationStatus` code | Action | Rationale |
|---|---|---|
| `confirmed` | Map | Clinically confirmed |
| `unconfirmed` | Map | Suspected but not ruled out |
| `provisional` | Map | Temporary assessment |
| `differential` | Map | Under consideration |
| `entered-in-error` | Skip | Data entry error — not valid |
| `refuted` | Skip | Clinically ruled out |
| (absent) | Map | Map permissively |

### Reaction Manifestation Concepts (value_as_concept_id)

Common SNOMED manifestation codes that may appear in `AllergyIntolerance.reaction[].manifestation`:

| SNOMED Code | Display | OMOP concept_id (SNOMED domain) |
|---|---|---|
| 247472004 | Hives (Urticaria) | Requires vocab lookup |
| 267036007 | Shortness of breath | Requires vocab lookup |
| 271807003 | Rash | Requires vocab lookup |
| 422587007 | Nausea | Requires vocab lookup |
| 39579001 | Anaphylaxis | Requires vocab lookup |
| 386661006 | Fever | Requires vocab lookup |
| 418290006 | Itching | Requires vocab lookup |

These require an Athena vocabulary database to resolve to standard OMOP concept_ids.

### Allergy Type (qualifier_source_value)

| FHIR `type` code | Stored in | Notes |
|---|---|---|
| `allergy` | `qualifier_source_value` | Immune-mediated reaction |
| `intolerance` | `qualifier_source_value` | Non-immune-mediated reaction |
| (absent) | null | |

No standard OMOP concept exists for allergy vs. intolerance distinction.

### Criticality (value_source_value)

| FHIR `criticality` code | Stored in | Notes |
|---|---|---|
| `low` | `value_source_value` | Low risk for future life-threatening reactions |
| `high` | `value_source_value` | High risk for future life-threatening reactions |
| `unable-to-assess` | `value_source_value` | Unable to assess the risk |
| (absent) | null | |

## Reference Resolution

### `AllergyIntolerance.patient` → `person_id`

Required. The patient reference must resolve to an integer `person_id` in the OMOP `person` table.

1. Extract the reference string (e.g., `"Patient/42"` or `"urn:uuid:abc-123"`).
2. Resolve via `ctx.ids.resolveRef()` — uses sequence or hash mode depending on `IdRegistry` configuration.
3. If unresolvable, fall back to 0 (this project) or skip the record.
4. The referenced Patient must be mapped first so `person_id` exists in the `person` table.

### `AllergyIntolerance.encounter` → `visit_occurrence_id`

Optional. Links the allergy to the clinical encounter where it was recorded.

1. Extract the reference string (e.g., `"Encounter/99"`).
2. Resolve via `ctx.ids.resolveRef()`.
3. If absent or unresolvable, set to null. The allergy record is still valid without a visit link.
4. omoponfhir resolves via `fhirContext2OmopVisitOccurrence()` service lookup.

### `AllergyIntolerance.recorder` / `AllergyIntolerance.asserter` → `provider_id`

Optional. Two FHIR fields can map to the single OMOP `provider_id`:

| FHIR Field | FHIR Definition | Target types |
|---|---|---|
| `recorder` | Who recorded the allergy | Practitioner, PractitionerRole, Patient, RelatedPerson |
| `asserter` | Who states the allergy exists | Practitioner, PractitionerRole, Patient, RelatedPerson |

Strategy (this project):
1. Prefer `asserter` (clinically more meaningful — the person who asserts the allergy).
2. Fall back to `recorder` if `asserter` is absent.
3. Only `Practitioner` and `PractitionerRole` references are meaningful for OMOP `provider_id`. `Patient` and `RelatedPerson` references cannot map to `provider`.
4. Resolve via `ctx.ids.resolveRef()`.

Strategy (omoponfhir):
1. Uses `recorder` only (line 392-398). Does not consider `asserter`.
2. Resolves via `providerService.findById()`.

## Edge Cases

| Case | Handling | Implementation |
|---|---|---|
| No `onsetDateTime`, no `onsetPeriod`, no `recordedDate` | Skip the record — `observation_date` is NOT NULL | This project returns null |
| `onsetPeriod.start` only (no `onsetDateTime`) | Use `onsetPeriod.start` as `observation_date` | This project: supported in fallback chain (line 39-41) |
| `recordedDate` only (no onset fields) | Use as last-resort date | This project: third fallback (line 43-45) |
| No `code` or empty `code.coding[]` | Skip the record — cannot identify the substance | This project returns null (line 58) |
| `code` with text only (no `coding`) | Skip — no structured code to map | This project requires `coding[]` |
| Multiple `reaction` entries | Concatenate all manifestation display names into `value_as_string` | This project: semicolon-separated (line 17-27) |
| Multiple `manifestation` per reaction | Include all in `value_as_string` concatenation | This project: iterates all manifestations |
| `category` = `medication` | Code might overlap with drug concepts. Still maps to observation, not `drug_exposure` | All implementations agree on observation target |
| `category` = `food` | omoponfhir sets `observation_concept_id` = 4188027 | This project: not yet implemented |
| `criticality` present | Stored in `value_source_value` | This project: line 88 |
| `type` = `intolerance` | Stored in `qualifier_source_value` | This project: line 87. No separate OMOP handling |
| `verificationStatus` = `entered-in-error` | Skip the record | This project: line 97 |
| `verificationStatus` = `refuted` | Skip the record | This project: line 97 |
| `clinicalStatus` = `inactive` or `resolved` | Skip the record | This project: line 100 |
| `clinicalStatus` absent | Map permissively (not required in FHIR) | This project: passes validation |
| `asserter` is a Patient (self-reported) | Cannot map to OMOP `provider_id` — set null | Not explicitly handled; `resolveRef` will produce an ID but it won't correspond to a provider row |
| `recorder` is a RelatedPerson | Cannot map to OMOP `provider_id` — set null | Same issue as Patient self-report |
| `reaction[].severity` present | Lost — no OMOP field for severity | Could store in `qualifier_source_value` but this project uses it for `type` |
| `reaction[].substance` differs from `code` | The per-reaction substance is lost | Only `code` (top-level) is mapped |
| `note[]` present | Lost — no standard OMOP target | Could append to `value_as_string` but would mix with manifestation text |
| Multiple `coding` in `code` | Best coding selected by system priority (SNOMED preferred) | This project: `selectBestCoding()` |
| `onsetAge` or `onsetRange` | Not handled — only `onsetDateTime` and `onsetPeriod` supported | Would require birth date to compute absolute date |
| `onsetString` | Not handled — free-text onset cannot produce a date | Skip or store in a separate field |

## Implementation Comparison

| Aspect | HL7 IG (FML) | omoponfhir (Java) | FhirToCdm (C#) | fhir-to-omop-demo (jq) | This project (TS) |
|---|---|---|---|---|---|
| Direction | F→O | F↔O | F→O | F→O | F→O |
| Target table | observation | observation | observation | **condition_occurrence** | observation |
| `observation_concept_id` | Direct code lookup | Category-based (439224/4188027/40772948) | Direct vocab lookup | N/A (condition) | 0 (placeholder) |
| `value_as_concept_id` | Reaction manifestation code | Substance concept | (not set) | N/A | null (placeholder) |
| `observation_type_concept_id` | (not set) | 38000280 | 32817 | 32817 (condition_type) | 32817 |
| Date source | `onset` (dateTime only) | `onsetDateTimeType` | `recordedDate` | `recordedDate` | `onsetDateTime` → `onsetPeriod.start` → `recordedDate` |
| Provider source | (commented out) | `recorder` only | (not set) | (not set) | `asserter` → `recorder` fallback |
| Visit link | (commented out) | `encounter` → visit lookup | (not set) | (not set) | `encounter` → `resolveRef` |
| Status filtering | None | None (filters by concept name on read) | None | None | `clinicalStatus` + `verificationStatus` |
| Reaction handling | First manifestation → `value_as_concept_id` | Not mapped (F→O direction) | Not mapped | Not applicable | All manifestations → `value_as_string` |
| Type/criticality | Not mapped | Not mapped | Not mapped | Not mapped | `type` → `qualifier_source_value`, `criticality` → `value_source_value` |
| Category usage | Not used | Drives `observation_concept_id` | Not used | Not used | Not used (stored in `qualifier_source_value` is type, not category) |
| Vocabulary lookup | FML `code` → concept | `fhirCode2OmopConcept()` + hardcoded IDs | `LookupCode()` via vocabulary DB | `concept` via vocab pipeline | None (placeholder 0) |
| Multiple codings | Not handled | First coding | Per-coding iteration (creates multiple rows) | Per-coding iteration | Best coding by system priority |
| `observation_source_value` | From code | (not explicitly set) | (set via SetConceptId) | (set as condition_source_value) | Best coding `.code` string |

### Key Differences

1. **fhir-to-omop-demo maps to condition_occurrence, not observation.** This is a significant divergence from consensus. The jq mapping treats allergies as conditions, which is semantically different from the observation-based approach used by HL7 IG, omoponfhir, and FhirToCdm.

2. **omoponfhir's category-driven concept selection** is the most sophisticated approach. It separates the "what kind of allergy" (observation_concept_id) from "what substance" (value_as_concept_id). This is semantically richer but requires maintaining a hardcoded concept ID list.

3. **Only this project implements status filtering.** No reference implementation checks `clinicalStatus` or `verificationStatus` before mapping. This is a data quality improvement not seen elsewhere.

4. **Date source varies significantly.** omoponfhir uses `onsetDateTimeType` only; FhirToCdm uses `recordedDate` only; this project implements the most complete fallback chain.

5. **FhirToCdm creates multiple observation rows** when multiple codings exist in `code`. Other implementations use the first or best coding.

## Sources

- HL7 IG FML: `refs/refs/fhir-omop-ig/input/maps/Allergy.fml` (51 lines)
  - Code → concept: line 14-18 (`sc.code -> tgt.observation_concept_id, tgt.observation_source_value, tgt.observation_source_concept_id`)
  - Onset → date: line 40 (`src.onset : dateTime as osd -> tgt.observation_date`)
  - Reaction → value: lines 42-50 (`s.manifestation ... sc.code -> tgt.value_as_concept_id, tgt.value_source_value`)
  - Patient/encounter/provider: lines 20-38 (all commented out as TODO)
- HL7 IG logical model: `refs/refs/fhir-omop-ig/input/fsh/Observation.fsh` (30 lines)
- omoponfhir Java (bidirectional, 449 lines): `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopAllergyIntolerance.java`
  - `constructOmop()` (F→O): lines 350-449
  - Person resolution: lines 365-384
  - Date from onsetDateTime: lines 387-389, 434-437
  - Provider from recorder: lines 392-398
  - Substance → value_as_concept: lines 401-405
  - Category → observation_concept_id: lines 408-431 (food→4188027, medication→439224, default→40772948)
  - Type concept = 38000280: line 446
  - Encounter → visit: lines 439-443
  - `constructFHIR()` (O→F): lines 122-185
  - Category reverse mapping (medication concept IDs): lines 160-168
  - Filter params (concept name LIKE '%Allerg%'): lines 211-213
- omoponfhir-v54 Java: `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopAllergyIntolerance.java` (450 lines, identical logic)
- FhirToCdm C#: `refs/refs/FhirToCdm/FhirToCdmMappings.cs`
  - `CreateObservation()`: lines 453-480
  - AllergyIntolerance filter: line 455 (`e.Resource.TypeName == "AllergyIntolerance"`)
  - Code iteration (multiple rows per coding): lines 459-460
  - Person resolution: lines 461-463
  - Type concept = 32817: line 468
  - Vocab lookup: lines 471-473 (`LookupCode(code)` → `SetConceptId(o, result[0])`)
  - Date from recordedDate: line 475
- fhir-to-omop-demo jq: `refs/refs/fhir-to-omop-demo/demo/translate/map/AllergyIntolerance.jq` (48 lines)
  - Maps to condition_occurrence (not observation): line 29
  - recordedDate for start/datetime: lines 33-34
  - type_concept_id = 32817: line 37
  - clinicalStatus → condition_status: line 38
- This project: `src/mapper/allergy-intolerance.ts` (103 lines)
  - Status validation: lines 92-103 (`isValidAllergyIntolerance()`)
  - Date fallback chain: lines 33-47 (`resolveOnsetDate()`)
  - Reaction string builder: lines 17-27 (`getReactionString()`)
  - Provider preference (asserter → recorder): line 68
  - Field mapping output: lines 70-89
  - Tests: `tests/allergy-intolerance.test.ts` (312 lines, 22 test cases)
- OMOP CDM v5.4 observation spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 AllergyIntolerance: https://hl7.org/fhir/R4/allergyintolerance.html
