# Condition → condition_occurrence

OMOP CDM v5.4. The `condition_occurrence` table stores diagnoses, problems, and health concerns. One FHIR Condition maps to one `condition_occurrence` row (unless multiple codings produce multiple rows -- see edge cases).

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `condition_occurrence_id` | integer | Yes (PK) | Surrogate key from `Condition.id`. Hash/sequence/lookup. HL7 IG FML has this commented out (line 11). |
| `Condition.subject` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference to integer. |
| `Condition.code` | `condition_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | Vocabulary lookup (SNOMED/ICD-10 → OMOP standard concept). Placeholder: 0. Production requires Athena vocabulary tables. |
| `Condition.onset[x]` | `condition_start_date` | polymorphic → date | Yes | See onset resolution below. Falls back through onsetDateTime → onsetPeriod.start → recordedDate. |
| `Condition.onset[x]` | `condition_start_datetime` | polymorphic → datetime | No | Full ISO datetime when available. omoponfhir uses 9999-12-31 when missing (line 542). |
| `Condition.abatement[x]` | `condition_end_date` | polymorphic → date | No | See abatement resolution below. |
| `Condition.abatement[x]` | `condition_end_datetime` | polymorphic → datetime | No | Full ISO datetime when available. |
| `Condition.category` | `condition_type_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | See type concept mapping below. |
| `Condition.clinicalStatus` | `condition_status_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | See status concept mapping below. ETL-German uses diagnostic confidence instead (line 1108-1112). |
| `Condition.clinicalStatus.coding[0].code` | `condition_status_source_value` | code → varchar(50) | No | Verbatim clinical status code. ETL-German stores diagnostic confidence code here. |
| `Condition.abatementString` | `stop_reason` | string → varchar(20) | No | Free-text reason for resolution. Truncated to 20 chars. fhir-x-omop uses `note[0].text` instead (line 33). |
| `Condition.asserter` or `Condition.recorder` | `provider_id` | ref → integer (FK PROVIDER) | No | Asserter preferred; recorder fallback. omoponfhir uses asserter only (line 499-506). fhir-x-omop uses recorder only (line 34). |
| `Condition.encounter` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Resolve Encounter reference. FhirToCdm also sets visit_detail_id from encounter (line 299). |
| (none) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | null -- not mapped. FhirToCdm sets it to same as visit_occurrence_id; fhir-x-omop does the same (line 36). |
| `Condition.code` (best coding) | `condition_source_value` | code → varchar(50) | No | Best code by vocabulary priority. ETL-German stores raw ICD code (line 1103). |
| `Condition.code` | `condition_source_concept_id` | integer (FK CONCEPT) | No | Source vocabulary concept. Requires vocabulary DB. Placeholder: 0. ETL-German populates via `FindOmopConcepts` (line 1100). |

FHIR fields with no OMOP target: `Condition.severity`, `Condition.bodySite`, `Condition.stage`, `Condition.evidence`, `Condition.note`, `Condition.identifier`, `Condition.verificationStatus` (used for filtering only).

ETL-German maps `severity`, `bodySite`, and `stage` to separate `observation` records (lines 452-476, 495-528, 1457-1495). No other reference implementation does this.

## Status Filtering

### Clinical Status

| FHIR clinicalStatus | Action | Rationale |
|---|---|---|
| `active` | Map | Current diagnosis |
| `recurrence` | Map | Active recurrence |
| `relapse` | Map | Active relapse |
| `inactive` | Skip | No longer active |
| `remission` | Skip | In remission |
| `resolved` | Skip | Resolved |
| (absent) | Map | clinicalStatus is optional in FHIR |

### Verification Status

| FHIR verificationStatus | Action |
|---|---|
| `confirmed` | Map |
| `unconfirmed` | Map |
| `provisional` | Map |
| `differential` | Map |
| `entered-in-error` | Skip -- always |
| `refuted` | Skip -- always |
| (absent) | Map |

ETL-German uses `FHIR_RESOURCE_CONDITION_ACCEPTABLE_STATUS_LIST` for verification status filtering (line 142-150). omoponfhir and FhirToCdm perform no status filtering at all. HL7 IG FML maps clinicalStatus but does not filter on it (lines 30-34).

## Onset[x] Resolution

Fallback chain for `condition_start_date`:

| Priority | Source | Handling |
|---|---|---|
| 1 | `onsetDateTime` | Direct → date + datetime |
| 2 | `onsetPeriod.start` | Period start → date + datetime |
| 3 | `recordedDate` | Fallback -- date when condition was recorded |
| -- | `onsetAge` | Not mapped. ETL-German calculates: birthDate + age = start date (via ResourceOnset helper). |
| -- | `onsetRange` | Not mapped (age range; imprecise) |
| -- | `onsetString` | Not mapped (free text) |
| -- | (none of above) | Skip -- condition_start_date is required |

Implementation notes:
- **HL7 IG FML**: Maps both `recordedDate` (line 22) and `onset:dateTime` (line 23) to `condition_start_date`. No priority chain; last match wins in FML.
- **omoponfhir**: Handles `onsetDateTime` and `onsetPeriod`. Uses 9999-12-31 as sentinel when onset is missing (line 542-546).
- **FhirToCdm**: Only `onsetDateTime` via cast (line 265). No fallback.
- **ETL-German**: Full chain -- `onsetDateTime`, `onsetPeriod`, `recordedDate` (lines 737-773). Also processes `onsetAge`/`onsetRange` via ResourceOnset.
- **NACHC**: Extracts start/end dates via ConditionParser (lines 54-55). No fallback chain.
- **fhir-x-omop**: Uses `onsetDateTime` with `recordedDate` fallback (line 19-20). No Period support.
- **This project**: `onsetDateTime` → `onsetPeriod.start` → `recordedDate` (lines 33-47 of `condition.ts`).

## Abatement[x] Resolution

| Priority | Source | Handling |
|---|---|---|
| 1 | `abatementDateTime` | Direct → date + datetime |
| 2 | `abatementPeriod.end` | Period end → date + datetime |
| -- | `abatementAge` | Not mapped |
| -- | `abatementRange` | Not mapped |
| -- | `abatementString` | → `stop_reason` (free text, truncated to 20 chars) |
| -- | (absent) | null -- condition may be ongoing |

FhirToCdm falls back to the visit end date when abatement is absent (line 301-302). No other implementation does this.

## Vocabulary Mappings

### Type Concept Mapping (`category` → `condition_type_concept_id`)

| FHIR Category Code | OMOP concept_id | OMOP concept_name | Vocabulary |
|---|---|---|---|
| `problem-list-item` | 32840 | Problem list from EHR | Type Concept |
| `encounter-diagnosis` | 32817 | EHR | Type Concept |
| `health-concern` | 32817 | EHR (default) | Type Concept |
| (absent/other) | 32817 | EHR (default) | Type Concept |

Implementation variations:
- **omoponfhir**: Uses `OmopConceptMapping.omopForConditionCategoryCode()` for bidirectional mapping (line 200, 583). Maps `problem-list-item` to its own concept and `encounter-diagnosis` to EHR.
- **FhirToCdm**: Hardcoded 32817 for all conditions (line 274, 290-291).
- **ETL-German**: Hardcoded `CONCEPT_EHR` (32817) for all conditions (line 1102). Category not used.
- **NACHC**: Hardcoded 32020 ("EHR encounter diagnosis") (line 60). Different concept than the standard 32817.
- **fhir-x-omop**: Maps `encounter-diagnosis` → 32817, `problem-list-item` → 32818, `health-concern` → 32819 (lines 23-27). Uses different concept IDs than other implementations.
- **This project**: `problem-list-item` → 32840, `encounter-diagnosis` → 32817, default 32817.

### Status Concept Mapping (`clinicalStatus` → `condition_status_concept_id`)

| FHIR Clinical Status | OMOP concept_id | OMOP concept_name |
|---|---|---|
| `active` | 32902 | Active condition |
| `recurrence` | 32902 | Active condition |
| `relapse` | 32902 | Active condition |
| (absent) | 0 | Unknown |

The HL7 IG FML passes the clinicalStatus code directly without concept translation (line 32). ETL-German uses diagnostic confidence (ICD-10-GM extension) for `condition_status_concept_id` instead of clinical status (line 1108-1112). fhir-x-omop uses a different concept set: `active` → 32893, `resolved` → 32897, `inactive` → 32896 (lines 28-32).

### Condition Code Vocabulary Mapping (`code` → `condition_concept_id`)

FHIR `Condition.code` contains a CodeableConcept with one or more codings from source vocabularies. These must be mapped to OMOP standard concepts.

| Source Vocabulary | FHIR System URI | OMOP Vocabulary ID | Notes |
|---|---|---|---|
| SNOMED CT | `http://snomed.info/sct` | SNOMED | Standard vocabulary in OMOP for Condition domain |
| ICD-10-CM | `http://hl7.org/fhir/sid/icd-10-cm` | ICD10CM | US clinical modification; maps to SNOMED via OMOP |
| ICD-10 | `http://hl7.org/fhir/sid/icd-10` | ICD10 | WHO version |
| ICD-10-GM | `http://fhir.de/CodeSystem/bfarm/icd-10-gm` | ICD10GM | German modification (ETL-German only) |
| CPT-4 | `http://www.ama-assn.org/go/cpt` | CPT4 | Procedure codes sometimes found in Condition |
| ORPHA | `http://www.orpha.net` | ORPHA | Orphanet rare disease codes (ETL-German only) |

Mapping workflow:
1. Select best coding from `Condition.code` using vocabulary priority (SNOMED > ICD-10-CM > ICD-10 > CPT-4).
2. Look up the code in OMOP CONCEPT table to get `condition_source_concept_id`.
3. Follow CONCEPT_RELATIONSHIP (relationship_id = 'Maps to') to get `condition_concept_id` (standard concept).
4. Verify the standard concept's `domain_id` = 'Condition'. If not, route to the appropriate table (see domain routing).

Our implementation uses 0 as placeholder for both concept IDs. Production ETLs need Athena vocabulary tables.

## Vocabulary Priority

Code selection via `selectBestCoding`:

1. SNOMED CT (`http://snomed.info/sct`)
2. ICD-10-CM (`http://hl7.org/fhir/sid/icd-10-cm`)
3. ICD-10 (`http://hl7.org/fhir/sid/icd-10`)
4. CPT-4 (`http://www.ama-assn.org/go/cpt`)

The best coding's `.code` goes to `condition_source_value`. In a vocabulary-aware implementation, the code would also be looked up in OMOP CONCEPT to populate `condition_concept_id` and `condition_source_concept_id`.

## Reference Resolution

### `Condition.subject` → `person_id`

Required reference. The FHIR Patient reference must be resolved to an integer `person_id`:
1. Extract the Patient reference (`Condition.subject.reference`).
2. Look up the Patient's `person_id` using the same ID mapping strategy as the Patient mapper.
3. If unresolved, our implementation defaults to 0; omoponfhir throws a FHIRException (line 495-496).

### `Condition.asserter` / `Condition.recorder` → `provider_id`

FHIR has two provenance references; OMOP has a single `provider_id`. Strategy: prefer `asserter` (who stated the condition), fall back to `recorder` (who entered it).

| Implementation | Provider Source | Fallback |
|---|---|---|
| omoponfhir | asserter only | none (null) |
| FhirToCdm | (not mapped) | -- |
| ETL-German | (not mapped) | -- |
| NACHC | (not mapped) | -- |
| fhir-x-omop | recorder only | none |
| This project | asserter | recorder |

### `Condition.encounter` → `visit_occurrence_id`

Single reference. Resolve the Encounter reference to an integer `visit_occurrence_id`. omoponfhir resolves via `fhirContext2OmopVisitOccurrence` (line 600). ETL-German resolves via `getVisitOccId` (line 166). If unresolved, leave null.

## Domain Routing

Some SNOMED condition codes have `domain_id` != 'Condition' in the OMOP vocabulary. A vocabulary-aware implementation should route these to the appropriate table:

| OMOP Domain | Target Table | Example |
|---|---|---|
| Condition | `condition_occurrence` | Most diagnosis codes |
| Observation | `observation` | Some finding/symptom codes |
| Procedure | `procedure_occurrence` | Some procedure-related diagnosis codes |
| Measurement | `measurement` | Some lab-related codes |

Only ETL-German implements domain routing (lines 921-988). It creates `ConditionOccurrence`, `OmopObservation`, `ProcedureOccurrence`, or `Measurement` records based on the OMOP concept's domain_id. All other implementations route everything to `condition_occurrence`.

## Edge Cases

| Case | Handling | Implementation Notes |
|---|---|---|
| Missing onset[x] + missing recordedDate | Skip -- no valid start date. | All implementations agree. ETL-German logs via `noStartDateCounter` (line 171). omoponfhir uses 9999-12-31 sentinel instead of skipping (line 542-546). |
| `onsetAge` = 45 years | Not mapped by most. | ETL-German calculates: birthDate + age = start date via ResourceOnset helper. Requires patient birthDate to be available. |
| `onsetPeriod` with start and end | start → condition_start_date, end → condition_end_date. | omoponfhir maps Period.end to condition_end_date (line 561). This project does not map Period.end. |
| Multiple `code.coding` entries | Select best by vocabulary priority. | ETL-German generates separate condition_occurrence rows per coding system (ICD + SNOMED) (lines 239-332). Our implementation picks best only. FhirToCdm iterates all codings (line 263). |
| `severity` present | Dropped by most. | ETL-German creates a separate observation record with `qualifier_concept_id` = CONCEPT_SEVERITY (lines 452-463, 1491). |
| `bodySite` present | Dropped by most. | ETL-German creates a separate observation record with `qualifier_concept_id` = CONCEPT_FINDING_SITE (lines 441-450, 495-528, 1561-1583). |
| `stage` present | Dropped by most. | ETL-German creates a separate observation record with `qualifier_concept_id` = CONCEPT_STAGE (lines 465-476, 1491). |
| `verificationStatus` = `provisional` | Mapped. | Some implementations skip non-confirmed. ETL-German has an explicit acceptable status list. Our implementation maps provisional. |
| `verificationStatus` = `entered-in-error` | Skip always. | Universal consensus across implementations. |
| SNOMED code with domain_id != Condition | Should route to observation/procedure/measurement. | Requires vocabulary DB. Only ETL-German routes (lines 921-988). Our implementation does not route. |
| `abatementString` longer than 20 chars | Truncated to fit `stop_reason` varchar(20). | Our implementation truncates via `.substring(0, 20)` (line 106). |
| Missing `Condition.code` | Skip -- no concept to map. | Our implementation returns null (line 73). ETL-German increments `noCodeCounter` (line 155). |
| Missing `Condition.subject` | Skip or error. | Our implementation defaults person_id to 0. omoponfhir throws FHIRException (line 495). |
| ICD-10-GM primary + secondary codes | Split into separate rows. | ETL-German-specific: splits codes with spaces into primary/secondary (lines 781-806). |
| Diagnostic confidence (ICD-10-GM extension) | Maps to condition_status_concept_id. | ETL-German-specific: extracts from ICD coding extension (lines 1108-1133). |
| ORPHA rare disease codes | Maps via Orpha-SNOMED lookup. | ETL-German-specific: uses OrphaSnomedMapping (lines 283-285, 413-435). |

## Implementation Comparison

| Aspect | HL7 IG (FML) | omoponfhir (Java) | FhirToCdm (C#) | ETL-German (Java) | NACHC (Java) | fhir-x-omop (Python) | This project (TS) |
|---|---|---|---|---|---|---|---|
| Direction | F→O | F↔O | F→O | F→O | F→O | F↔O | F→O |
| Lines | 48 | 620 | ~55 (method) | 1654 | 66 | 46 | 132 |
| Status filtering | none | none (bidir) | none | yes (verification) | none | none | yes (clinical + verification) |
| onset[x] types | dateTime, recordedDate | dateTime, Period | dateTime only | dateTime, Period, recordedDate, Age | dateTime | dateTime, recordedDate | dateTime, Period, recordedDate |
| Missing onset | no handling | 9999-12-31 sentinel | (crashes) | skip (counter) | (requires date) | (may be null) | skip |
| Domain routing | no | no | no | yes (Condition/Obs/Proc/Meas) | no | no | no |
| Category → type_concept | pass-through code | yes (bidir mapping) | hardcoded 32817 | hardcoded 32817 (CONCEPT_EHR) | hardcoded 32020 | yes (32817/32818/32819) | yes (32840/32817) |
| clinicalStatus → status_concept | pass-through code | yes (bidir) | no | diagnostic confidence instead | no | yes (32893/32897/32896) | yes (32902) |
| Multiple codings | no | no | yes (iterates all) | yes (multi-row, ICD+SNOMED+Orpha) | no | no | no (best only) |
| Severity mapping | no | no | no | yes (→ observation) | no | no | no |
| Stage mapping | no | no | no | yes (→ observation) | no | no | no |
| BodySite mapping | no | no | no | yes (→ observation) | no | no | no |
| Provider source | not mapped | asserter only | not mapped | not mapped | not mapped | recorder only | asserter → recorder |
| Vocabulary lookup | pass-through | yes (ConceptService) | yes (LookupCode) | yes (FindOmopConcepts) | yes (FhirToOmopConceptMapper) | no (hardcoded 0) | no (hardcoded 0) |
| Visit resolution | commented out | yes | yes | yes | no | yes (split reference) | yes (resolveRef) |
| Incremental update | no | yes (update/create) | no | yes (delete + re-create) | no | no | no |
| Abatement fallback | dateTime only | dateTime only | dateTime only | Period end | none | dateTime only | dateTime, Period.end |
| stop_reason source | not mapped | not mapped | not mapped | not mapped | not mapped | note[0].text | abatementString |

## Sources

### Reference implementation files
- HL7 IG FML (normative, minimal, 48 lines): `refs/refs/fhir-omop-ig/input/maps/condition.fml`
  - condition_occurrence_id commented out: line 11
  - code mapping: lines 17-21
  - onset and recordedDate: lines 22-23
  - category: lines 25-29
  - clinicalStatus: lines 30-34
- HL7 IG logical model: `refs/refs/fhir-omop-ig/input/fsh/ConditionOccurrence.fsh` (23 lines)
- omoponfhir Java (bidirectional, 620 lines): `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopCondition.java`
  - constructFHIR (O→F): lines 98-118
  - constructOmop (F→O): lines 466-618
  - Subject resolution: lines 481-496
  - Asserter → provider: lines 499-506
  - Code → concept via fhirCode2OmopConcept: lines 509-512
  - Onset handling (dateTime, Period, 9999-12-31 fallback): lines 537-563
  - Category → type concept via OmopConceptMapping: lines 571-595
  - Encounter → visit: lines 599-603
- FhirToCdm C# (~55 lines in method): `refs/refs/FhirToCdm/FhirToCdmMappings.cs` -- `CreateConditionOccurrence()` starting line 252
  - Iterates all code.Coding: line 263
  - onsetDateTime only (cast): line 265
  - Hardcoded type concept 32817: line 274
  - abatementDateTime: lines 279-282
  - Fallback end date from visit: lines 301-302
- ETL-German Java (most comprehensive, 1654 lines): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ConditionMapper.java`
  - Verification status filtering: lines 142-150
  - Diagnosis coding extraction: lines 152-157
  - Person resolution: lines 159-164
  - Visit resolution: line 166
  - Onset resolution (dateTime, Period, recordedDate): lines 737-773
  - Multiple coding handling (ICD + SNOMED + Orpha): lines 239-332
  - Domain routing switch (Condition/Observation/Procedure/Measurement): lines 921-988
  - condition_occurrence builder: lines 1079-1116
  - Diagnostic confidence → status_concept: lines 1108-1133
  - Severity → observation: lines 452-463, 1627-1652
  - Stage → observation: lines 465-476, 1587-1623
  - BodySite localization → observation: lines 441-450, 495-528, 1561-1583
  - ICD code splitting (primary/secondary): lines 781-806
- NACHC Java (66 lines): `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/condition/OmopConditionOccurrenceBuilder.java`
  - Hardcoded type concept 32020: line 60
  - Concept lookup via FhirToOmopConceptMapper: lines 57-58
  - Start/end date from ConditionParser: lines 54-55
- fhir-x-omop Python (bidirectional, 46 + 72 lines): `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/condition_occurrence.py` (F→O) and `refs/refs/fhir-x-omop/fhir_x_omop/to_fhir/condition.py` (O→F)
  - Type concept mapping (32817/32818/32819): lines 23-27
  - Status concept mapping (32893/32897/32896): lines 28-32
  - stop_reason from note[0].text: line 33
  - Provider from recorder: line 34
  - visit_detail_id from encounter: line 36

### This project
- Mapper implementation (132 lines): `src/mapper/condition.ts`
  - Status filtering (clinical + verification): lines 116-131
  - Valid clinical statuses: line 8
  - Valid verification statuses: line 11
  - Type concept mapping: lines 14-17
  - Status concept mapping: lines 23-27
  - Onset resolution chain: lines 33-47
  - Abatement resolution: lines 53-63
  - Main mapping function: lines 66-114
  - Provider fallback (asserter → recorder): line 94
- FHIR types: `src/types/fhir.ts` -- Condition interface (lines 103-125)
- OMOP types: `src/types/omop.ts` -- ConditionOccurrence interface (lines 67-84)

### OMOP CDM specification
- OMOP CDM v5.4 condition_occurrence: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- HL7 IG ConditionOccurrence FSH logical model: `refs/refs/fhir-omop-ig/input/fsh/ConditionOccurrence.fsh`
- FHIR R4 Condition: https://hl7.org/fhir/R4/condition.html
- OMOP condition concepts: https://athena.ohdsi.org/search-terms/terms?domain=Condition&standardConcept=Standard

### Articles
- [Coded Field Mapping Principles (HL7 IG)](https://build.fhir.org/ig/HL7/fhir-omop-ig/codemappings.html) -- How to map coded FHIR fields to OMOP concept IDs.
- [FHIR-Ontop-OMOP: Building clinical knowledge graphs (2022)](https://pubmed.ncbi.nlm.nih.gov/36089199/) -- 100+ data elements including Condition_occurrence mapping.
- [FHIR to OMOP Cookbook v04 (PDF)](https://confluence.hl7.org/download/attachments/81018297/FHIR%20to%20OMOP%20Cookbook_v04.pdf) -- FHIR Condition mapping decisions and domain routing.
- [An ETL-process design for German real-world data (2022)](https://www.sciencedirect.com/science/article/pii/S1386505622002398) -- ETL-German condition processing with ICD-10-GM and domain routing.
