# Medication Resources → drug_exposure

OMOP CDM v5.4. The `drug_exposure` table captures all medication events — prescriptions, dispensing, administration, and self-reported use. Multiple FHIR resources map here, distinguished by `drug_type_concept_id`.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `drug_exposure_id` | integer | Yes (PK) | Surrogate key. Hash/sequence/lookup of FHIR resource id. omoponfhir uses `IdMapping.getOMOPfromFHIR()`; NACHC uses autogen sequence; fhir-to-omop-demo uses FHIR `.id` directly. |
| `*.subject` / `*.patient` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference → integer. See Reference Resolution below. |
| `medication[x]` | `drug_concept_id` | CodeableConcept/ref → integer (FK CONCEPT) | Yes | RxNorm (US) or ATC (EU) code → OMOP standard concept via vocabulary lookup. See Vocabulary Mappings below. Placeholder: 0. |
| (see Date Source table) | `drug_exposure_start_date` | → date | Yes | Source varies by resource type. See Date Source by Resource Type. |
| (see Date Source table) | `drug_exposure_start_datetime` | → datetime | No | Full ISO datetime from the same source as start_date. |
| (see Date Source table) | `drug_exposure_end_date` | → date | Yes | If absent, use start date as fallback. See Date Source by Resource Type. |
| (see Date Source table) | `drug_exposure_end_datetime` | → datetime | No | Full ISO datetime. Null if no end available. |
| (see Date Source table) | `verbatim_end_date` | → date | No | The raw end date from the source, before any inference. HL7 IG FML maps `effectivePeriod.end` here. Most implementations leave null. fhir-to-omop-demo: null. |
| (constant per resource) | `drug_type_concept_id` | integer (FK CONCEPT) | Yes | See Type Concept Mapping table. Distinguishes prescriptions from dispensings, administrations, and self-reports. |
| `statusReason` / `reasonNotTaken` | `stop_reason` | string → varchar(20) | No | Reason for discontinuation. omoponfhir truncates to 20 chars. Only populated when `status = stopped`. Most implementations leave null. |
| `MedicationRequest.dispenseRequest.numberOfRepeatsAllowed` | `refills` | integer | No | Number of refills. MedicationRequest only. omoponfhir reads from `dispenseRequest` fallback when dosageInstruction is empty. |
| `dosage[].doseAndRate[].doseQuantity.value` | `quantity` | decimal → float | No | Dose amount per administration. omoponfhir also reads `dispenseRequest.quantity.value` as fallback. ETL-German computes mean of Range when doseRange is used. |
| `MedicationRequest.dispenseRequest.expectedSupplyDuration` | `days_supply` | integer | No | Days of medication supply. Can be calculated from `expectedSupplyDuration.value` with UCUM unit conversion. This project converts h/d/wk/mo/a units. No reference implementation populates this. |
| `dosage[].text` or `dosage[].patientInstruction` | `sig` | string → varchar(MAX) | No | Free-text dosage instructions. FhirToCdm reads `dosageInstruction[0].text`. fhir-to-omop-demo uses `.note`. |
| `dosage[].route` | `route_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | Administration route (oral, IV, etc.). Requires vocabulary lookup against SNOMED route concepts. See Vocabulary Mappings below. |
| `dosage[].route.text` or `dosage[].route.coding[0].display` | `route_source_value` | string → varchar(50) | No | Raw route code or display text. omoponfhir prefers `route.text`, falls back to `coding[0].display`. |
| (Immunization only: `Immunization.lotNumber`) | `lot_number` | string → varchar(50) | No | Vaccine lot number. Only relevant for Immunization → drug_exposure mapping. |
| `*.requester` / `*.performer` / `*.informationSource` | `provider_id` | ref → integer (FK PROVIDER) | No | Varies by resource type. See Provider Source table and Reference Resolution below. |
| `*.encounter` / `*.context` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Resolve Encounter reference. See Reference Resolution below. |
| (none) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | Null in all reviewed implementations. FhirToCdm sets it equal to `visit_occurrence_id` (non-standard). |
| `medication[x].coding[best].code` | `drug_source_value` | code → varchar(50) | No | Best code by vocabulary priority (RxNorm > ATC > NDC > first). omoponfhir uses `identifier.value` as source value; ETL-German uses ATC code. |
| `medication[x]` | `drug_source_concept_id` | integer (FK CONCEPT) | No | Source vocabulary concept ID (non-standard). Placeholder: 0. fhir-to-omop-demo uses a pre-computed `source_concept_id` from vocabulary lookup. |
| `dosage[].doseAndRate[].doseQuantity.unit` or `.code` | `dose_unit_source_value` | string → varchar(50) | No | Raw dose unit string. omoponfhir prefers `.code`, falls back to `.unit`. |

## Date Source by Resource Type

| FHIR Resource | Start Date Source | End Date Source |
|---|---|---|
| MedicationRequest | `authoredOn` | `dispenseRequest.validityPeriod.end` or start date |
| MedicationDispense | `whenHandedOver` or `whenPrepared` | `daysSupply` + start or start date |
| MedicationAdministration | `effectiveDateTime` or `effectivePeriod.start` | `effectivePeriod.end` or start date |
| MedicationStatement | `effectiveDateTime` or `effectivePeriod.start` (fallback: `dateAsserted`) | `effectivePeriod.end` or start date |

Notes:
- This project's MedicationStatement mapper uses `dateAsserted` as a tertiary fallback when no `effective[x]` is present.
- omoponfhir sets end date = start date when `effectiveDateTime` is used (single point in time).
- FhirToCdm derives dates from the linked VisitOccurrence instead of the medication resource itself.
- NACHC falls back to encounter start date if `authoredOn` is null.

## Type Concept Mapping

| FHIR Resource | OMOP concept_id | OMOP concept_name | Notes |
|---|---|---|---|
| MedicationRequest | 38000177 | Prescription written | omoponfhir, this project. fhir-to-omop-demo uses 32838 (EHR prescription). |
| MedicationDispense | 38000175 | Prescription dispensed in pharmacy | |
| MedicationAdministration | 38000179 | Physician administered drug (identified as procedure) | fhir-to-omop-demo uses 32818 (EHR administration record). |
| MedicationStatement | 44787730 | Patient Self-Reported Medication | omoponfhir also supports dynamic type: if `basedOn` references MedicationRequest, uses 38000177; if `partOf` references MedicationAdministration, uses 38000179. |
| Immunization | 38000179 | Physician administered drug | FhirToCdm uses 32817 (EHR). fhir-x-omop uses 38000175 as default. |

ETL-German uses CONCEPT_CLAIM (32817, "EHR") for all medication resources regardless of source type.

FhirToCdm uses 32817 (EHR) as a universal `drug_type_concept_id` for all resources.

## Vocabulary Mappings

### Drug Concept (`medication[x]` → `drug_concept_id`)

The primary vocabulary for OMOP drug concepts is **RxNorm** (US) or **ATC** (European data). The FHIR `medication[x]` field carries codes from various systems that must be mapped to OMOP standard concepts.

| FHIR Coding System | OMOP Vocabulary | Priority | Notes |
|---|---|---|---|
| `http://www.nlm.nih.gov/research/umls/rxnorm` | RxNorm | 1 (US) | Standard OMOP drug vocabulary. Maps directly to `drug_concept_id`. |
| `http://www.whocc.no/atc` | ATC | 1 (EU) | Used by ETL-German. Maps via OMOP vocabulary tables (`concept_relationship`). |
| `http://hl7.org/fhir/sid/ndc` | NDC | 2 | National Drug Code (US). Maps to RxNorm via `concept_relationship`. |
| `http://snomed.info/sct` | SNOMED | 3 | SNOMED CT product codes. Require mapping to RxNorm via OMOP concept tables. |
| `http://hl7.org/fhir/sid/cvx` | CVX | Immunization | Vaccine codes. FhirToCdm maps via `LookupCode("Cvx")`. |

Vocabulary lookup strategy:
1. Extract all codings from `medication[x]`.
2. Prefer RxNorm coding if present; use its code for direct lookup in OMOP `CONCEPT` table (`vocabulary_id = 'RxNorm'`).
3. If only ATC/NDC/SNOMED, look up `source_concept_id` and traverse `concept_relationship` to find the standard RxNorm concept.
4. If no mapping found, set `drug_concept_id = 0` and preserve the original code in `drug_source_value`.

### Route Concept (`dosage[].route` → `route_concept_id`)

FHIR route codes (typically SNOMED CT) must be mapped to OMOP route concepts (domain = "Route").

| FHIR Route Code (SNOMED) | Display | OMOP concept_id | OMOP concept_name |
|---|---|---|---|
| 26643006 | Oral route | 4132161 | Oral |
| 47625008 | Intravenous route | 4171047 | Intravenous |
| 78421000 | Intramuscular route | 4302612 | Intramuscular |
| 34206005 | Subcutaneous route | 4142048 | Subcutaneous |
| 46713006 | Nasal route | 4262099 | Nasal |
| 6064005 | Topical route | 4263689 | Topical |
| 37161004 | Rectal route | 4115462 | Rectal |
| 45890007 | Transdermal route | 4262914 | Transdermal |

Notes:
- omoponfhir does a full vocabulary lookup via `CodeableConceptUtil.getOmopConceptWithFhirConcept()`.
- ETL-German uses `findOmopConcepts.getConcepts()` with date-aware validity checking.
- fhir-x-omop hardcodes a route_source_value map (IM → "intramuscular", SC → "subcutaneous", etc.).
- This project currently sets `route_concept_id = null` and captures `route_source_value` only.

## Medication Resolution

`medication[x]` has two forms:

1. **medicationCodeableConcept** — inline code with RxNorm/ATC/NDC coding. Extract best coding → `drug_concept_id` + `drug_source_value`.

2. **medicationReference** — Reference to a `Medication` resource containing the code. Must resolve the reference, then extract `Medication.code`. The Medication resource may also carry `form` (dosage form) and `ingredient` (active substance).

Resolution strategies by implementation:

| Implementation | Inline | Reference | Contained | Notes |
|---|---|---|---|---|
| omoponfhir | Yes | Yes (contained only) | Yes | Resolves local `#` references; extracts `Medication.code` from contained resources. Falls back to `Reference.display` as text if code not found. |
| FhirToCdm | Yes | No | No | Only processes `medicationCodeableConcept`. Skips if reference. |
| ETL-German | Yes | Yes | Yes | Resolves via `MedicationMapper` which pre-indexes `Medication` resources into `medication_id_map`. Uses ATC codes from ingredients. |
| fhir-to-omop-demo | Yes | Yes (merge) | No | Produces a partial `drug_exposure` from `MedicationRequest`; a separate `Medication.jq` produces matching partial rows; rows are merged by ID in a post-processing phase. |
| This project | Yes | No | No | Only processes `medicationCodeableConcept`. Returns null if only `medicationReference`. |

## Provider Source by Resource Type

| FHIR Resource | Provider Source | Notes |
|---|---|---|
| MedicationRequest | `requester` (prescriber) | omoponfhir uses `recorder` instead of `requester`. This project uses `requester`. |
| MedicationDispense | `performer[0].actor` | |
| MedicationAdministration | `performer[0].actor` | |
| MedicationStatement | `informationSource` (reporter) | omoponfhir filters to Practitioner-typed references only. |

## Reference Resolution

### `subject` / `patient` → `person_id`

Every medication resource has a `subject` (MedicationRequest, MedicationStatement) or `patient` (Immunization) reference to a Patient resource. This must resolve to an integer `person_id` in the OMOP `person` table.

1. Extract the reference string (e.g., `"Patient/123"` or `"urn:uuid:abc-def"`).
2. Resolve to integer `person_id` via the ID mapping strategy (hash, sequence, or lookup table).
3. If unresolvable, omoponfhir throws `FHIRException`. FhirToCdm skips the record. This project defaults to `0`.

### `encounter` / `context` → `visit_occurrence_id`

- MedicationRequest uses `encounter` field.
- MedicationStatement uses `context` field (R4; renamed to `encounter` in R5).
- Resolve to integer `visit_occurrence_id` via the same ID mapping.
- omoponfhir validates that the referenced VisitOccurrence exists in the database.
- FhirToCdm falls back to using the visit dates as the drug exposure dates when no explicit dates are available.
- This project resolves via `ctx.ids.resolveRef()`.

### `requester` / `informationSource` / `performer` → `provider_id`

- Reference must point to a `Practitioner` resource (or `PractitionerRole`).
- omoponfhir filters by resource type: only resolves if `referenceElement.getResourceType()` equals `"Practitioner"`.
- ETL-German does not map provider for MedicationStatement.
- This project resolves via `ctx.ids.resolveRef()` without type filtering.

## Edge Cases

| Case | Handling |
|---|---|
| `medicationReference` to contained Medication | omoponfhir iterates `contained[]` to find matching Medication by ID fragment. ETL-German pre-indexes. This project skips (returns null). |
| `medicationReference` to external Medication | Requires Bundle-level or server-side resolution. fhir-to-omop-demo merges in post-processing. Most implementations skip. |
| Multiple `dosage` / `dosageInstruction` entries | Take first for route and dose. omoponfhir iterates all dosage entries but breaks after first match. ETL-German creates one drug_exposure per dosage entry (fan-out). |
| `status` = `entered-in-error` | Skip — do not create drug_exposure row. All implementations agree. |
| `status` = `stopped` (MedicationStatement) | omoponfhir populates `stop_reason` from `statusReason` and still creates the row. This project skips. |
| `status` = `on-hold` / `draft` / `unknown` | This project skips (only maps `active` and `completed`). omoponfhir maps all statuses except `entered-in-error`. |
| `intent` = `proposal` / `plan` (MedicationRequest) | This project skips — only maps `order`, `original-order`, `reflex-order`, `filler-order`, `instance-order`. omoponfhir maps all intents. |
| No end date available | Use start date as end date. Consensus across all implementations. omoponfhir: `setDrugExposureEndDate(startDate)`. |
| `daysSupply` present but no end date | This project calculates end date from `expectedSupplyDuration` only if `validityPeriod.end` is absent. No reference implementation computes end from days_supply. |
| `effectiveDateTime` (point in time) | Start and end date are the same. omoponfhir: `setDrugExposureStartDate(date); setDrugExposureEndDate(date)`. |
| `effectivePeriod` with start but no end | End date = start date. omoponfhir and this project agree. |
| Quantity > 1 unit but unit unclear | Store in `quantity` with `dose_unit_source_value`. |
| Multiple codings in `medication[x]` | fhir-to-omop-demo warns (`debug("Multiple codings")`). This project uses `selectBestCoding()` by vocabulary priority. omoponfhir uses `CodeableConceptUtil.searchConcept()` which iterates all codings against OMOP concept table. |
| `dateAsserted` but no `effective[x]` (MedicationStatement) | This project falls back to `dateAsserted`. omoponfhir sets `new Date()` (current time) if no date found. |
| No medication code found | This project returns null (skips). omoponfhir throws `FHIRException`. ETL-German skips and increments `noCodeCounter`. |
| `drug_source_value` exceeds 50 chars | omoponfhir truncates `medicationCodeableConcept.getText()` to 50 chars: `.substring(0, 50)`. |
| `stop_reason` exceeds 20 chars | omoponfhir truncates: `.substring(0, 20)`. OMOP CDM field is `varchar(20)`. |
| `basedOn` references MedicationRequest (MedicationStatement) | omoponfhir dynamically sets `drug_type_concept_id` to 38000177 (Prescription written) instead of 44787730. |
| `partOf` references MedicationAdministration/MedicationDispense | omoponfhir dynamically sets `drug_type_concept_id` to 38000179 or 38000175 respectively. |

## Implementation Comparison

| Aspect | HL7 IG (FML) | omoponfhir | FhirToCdm | ETL-German | fhir-to-omop-demo | fhir-x-omop | NACHC | This project |
|---|---|---|---|---|---|---|---|---|
| Resources supported | MedStatement | MedStatement + MedRequest | MedRequest + Immunization | MedStatement + MedAdmin | MedRequest + MedAdmin + Medication | Immunization | MedRequest | MedRequest + MedStatement |
| Direction | F→O | F↔O | F→O | F→O | F→O | F→O | F→O | F→O |
| Language | FML | Java | C# | Java | jq | Python | Java (DSTU3) | TypeScript |
| Medication resolution | inline only | inline + contained ref | inline only | inline + ref (pre-indexed) | inline + merge phase | inline only | inline only | inline only |
| `drug_concept_id` lookup | pass-through code | DB concept search | vocabulary file lookup | DB concept search (ATC→standard) | pre-computed vocab | hardcoded 0 | hardcoded 0 | hardcoded 0 |
| Dosage parsing | no | yes (route, dose, unit) | sig text only | yes (route, dose, range mean) | no | quantity only | no | partial (dose, route text) |
| `days_supply` | no | no | no | no | no | 1 (Immunization) | no | yes (from expectedSupplyDuration) |
| `refills` | no | yes (fallback from dispenseRequest) | no | no | no | 0 | no | yes |
| Route concept lookup | no | yes (DB) | no | yes (DB) | pre-computed | hardcoded 0 | no | no (source value only) |
| `stop_reason` | from `reason` | from `statusReason` (truncated) | no | no | no | no | no | no |
| `sig` | no | no | yes (`dosageInstruction.text`) | no | from `.note` | from `vaccineCode.display` | no | yes (`dosageInstruction.text`) |
| `lot_number` | no | no | no | no | no | yes (`lotNumber`) | no | no |
| `verbatim_end_date` | yes (from period.end) | no | no | no | no | yes | no | no |
| `visit_detail_id` | no | no | = visit_occurrence_id | no | no | = visit_occurrence_id | no | no |
| Status filter | none | all except entered-in-error | none visible | configurable list | none | none | none | active + completed |
| Intent filter | n/a | none | none | n/a | none | n/a | none | order-type intents only |
| `drug_type_concept_id` | from `category` code | dynamic (basedOn/partOf aware) | 32817 (EHR) | 32817 (CLAIM) | 32838/32818 (EHR subtypes) | 38000175/38000179 | n/a | 38000177/44787730 |
| Provider source | no | yes (Practitioner only) | no | no | yes (`requester.id`) | yes (`performer`) | no | yes (`requester`/`informationSource`) |
| End date fallback | period.end or null | start date | visit end date | start date | null | same as start | encounter start | start date |
| `drug_source_value` truncation | no | yes (50 chars) | no | no | no | no | no | no |

## Sources

### This project
- MedicationRequest mapper: `src/mapper/medication.ts` (93 lines)
  - Status/intent filtering: lines 8-11
  - Date handling (authoredOn, validityPeriod): lines 35-47
  - Days supply calculation with UCUM unit conversion: lines 49-52, 84-93
  - Dosage parsing (quantity, route, sig): lines 54-58
  - Output construction: lines 60-81
- MedicationStatement mapper: `src/mapper/medication-statement.ts` (75 lines)
  - Status filtering: lines 8
  - Date fallback chain (effectiveDateTime → effectivePeriod → dateAsserted): lines 28-34
  - Dosage parsing: lines 52-53
  - Output construction: lines 55-74
- FHIR types: `src/types/fhir.ts` — MedicationRequest (lines 208-226), MedicationStatement (lines 165-181), Dosage (lines 159-163)
- OMOP types: `src/types/omop.ts` — DrugExposure (lines 131-152)

### HL7 IG FML (normative, minimal)
- `refs/refs/fhir-omop-ig/input/maps/medication.fml` (46 lines)
  - Maps MedicationStatement only
  - `drug_concept_id` from `medication.concept.coding.code`: line 20
  - `drug_exposure_start_date` from `effective[x]`: lines 24-26
  - `drug_exposure_end_date` from `effectivePeriod.end`: lines 28-29
  - `verbatim_end_date` from `effectivePeriod.end`: lines 31-32
  - `drug_type_concept_id` from `category.coding.code`: lines 34-38
  - `stop_reason` from `reason.concept.coding.code`: lines 39-45
  - `person_id` and `drug_exposure_id` mapping commented out (TODO): lines 11-16

### omoponfhir (Georgia Tech, Java, bidirectional)
- MedicationRequest: `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopMedicationRequest.java` (746 lines)
  - `constructOmop()`: lines 492-745
  - Patient resolution: lines 497-508
  - Medication resolution (inline + contained ref): lines 547-597
  - Concept search: lines 599-614
  - Type concept (38000177): lines 616-619
  - Start/end date from `authoredOn`: lines 622-623
  - Encounter → visit_occurrence: lines 626-638
  - Dosage route concept lookup: lines 641-672
  - Dosage quantity + unit: lines 674-699
  - Dispense request fallback (refills, quantity): lines 701-731
  - Provider from `recorder`: lines 733-742
- MedicationStatement: `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopMedicationStatement.java` (983 lines)
  - `constructOmop()`: lines 657-982
  - Context → visit_occurrence: lines 692-709
  - Stop reason from `statusReason` (truncated to 20): lines 711-748
  - Medication resolution (inline + contained ref): lines 751-805
  - Effective date handling (DateTime vs Period): lines 808-834
  - Information source → provider: lines 837-858
  - Subject → person: lines 861-882
  - Dosage (quantity, unit, route): lines 885-931
  - Dynamic type concept (basedOn/partOf aware): lines 933-958
  - Default null-safety: lines 960-979
  - Type concept IDs: line 84 (44787730), line 77 of OmopMedicationRequest (38000177)

### FhirToCdm (OHDSI, C#)
- `refs/refs/FhirToCdm/FhirToCdmMappings.cs` (624 lines)
  - `CreateDrugExposure()`: lines 310-405
  - MedicationRequest processing: lines 322-373
  - Medication CodeableConcept extraction: lines 325-327
  - Vocabulary lookup via `LookupCode()`: lines 361-363, 596-622
  - `sig` from `dosageInstruction[0].text`: lines 352-354
  - Visit-derived dates (start/end from VisitOccurrence): lines 366-369
  - Type concept: 32817 (EHR) for all: line 338
  - Immunization processing: lines 376-404
  - Vocabulary system mapping (SNOMED, RxNorm, CVX, LOINC): lines 596-622

### ETL-German-FHIR-Core (OHDSI, Java)
- MedicationStatementMapper: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/MedicationStatementMapper.java` (965 lines)
  - `setUpDrugExposure()`: lines 574-637
  - Drug exposure builder: lines 589-604
  - Route concept lookup: lines 610-621
  - Quantity from doseQuantity or Range mean: lines 622-634
  - Type concept: CONCEPT_CLAIM (32817): line 600
- MedicationMapper: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/MedicationMapper.java` (274 lines)
  - Pre-indexes Medication resources for reference resolution
  - ATC code extraction and concept lookup
- MedicationAdministrationMapper: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/MedicationAdministrationMapper.java`

### fhir-to-omop-demo (jq)
- MedicationRequest: `refs/refs/fhir-to-omop-demo/demo/translate/map/MedicationRequest.jq` (81 lines)
  - Drug concept from pre-computed vocabulary: lines 10-24
  - `drug_type_concept_id`: 32838 (EHR prescription): line 61
  - Provider from `requester.id`: line 69
  - Visit from `encounter.id`: line 70
  - All 23 drug_exposure columns output as TSV: lines 52-76
- MedicationAdministration: `refs/refs/fhir-to-omop-demo/demo/translate/map/MedicationAdministration.jq` (59 lines)
  - `drug_type_concept_id`: 32818 (EHR administration record): line 39
- Medication (reference merge): `refs/refs/fhir-to-omop-demo/demo/translate/map/Medication.jq` (71 lines)
  - Produces partial drug_exposure rows with concept info only, merged with MedicationRequest rows by ID

### fhir-x-omop (Python)
- `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/drug_exposure.py` (54 lines)
  - Maps Immunization only (not MedicationRequest/Statement)
  - `drug_concept_id`: hardcoded 0: line 18
  - `drug_type_concept_id`: dynamic by vaccine system: lines 24-27
  - Route source value mapping (IM, SC, PO, NASINHL): lines 40-45
  - `days_supply`: 1 (single dose): line 31

### NACHC (Java, DSTU3)
- MedicationRequestParser: `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/fhir/parser/medicationrequest/MedicationRequestParser.java` (155 lines)
  - Medication code extraction: lines 50-56
  - Start date from `authoredOn` with encounter fallback: lines 140-153
  - Encounter reference parsing: lines 111-122

### OMOP CDM specification
- OMOP CDM v5.4 drug_exposure: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- OMOP CDM docs: https://ohdsi.github.io/CommonDataModel/cdm54.html#DRUG_EXPOSURE
- Drug dose documentation: https://ohdsi.github.io/CommonDataModel/drug_dose.html

### FHIR R4 specification
- MedicationRequest: https://hl7.org/fhir/R4/medicationrequest.html
- MedicationStatement: https://hl7.org/fhir/R4/medicationstatement.html
- MedicationDispense: https://hl7.org/fhir/R4/medicationdispense.html
- MedicationAdministration: https://hl7.org/fhir/R4/medicationadministration.html
- Dosage: https://hl7.org/fhir/R4/dosage.html

### Articles
- [MedicationStatement → DrugExposure StructureMap (HL7 IG)](https://build.fhir.org/ig/HL7/fhir-omop-ig/en/StructureMap-MedicationMap.html) — Official FML for medication mapping.
- [Drug Exposure OMOP Table (FHIR IG)](https://build.fhir.org/ig/HL7/fhir-omop-ig/en/StructureDefinition-DrugExposure.html) — FHIR logical model for OMOP drug_exposure.
- [Common Challenges When Transforming FHIR to OMOP](https://build.fhir.org/ig/HL7/fhir-omop-ig/F2OGeneralIssues.html) — Medication resource variety (MedicationStatement, MedicationRequest, etc.) across EHR vendors.
