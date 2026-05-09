# MedicationRequest → drug_exposure

OMOP CDM v5.4. The `drug_exposure` table captures all medication events. `MedicationRequest` represents the **prescription/order stage** and is the richest source of dispense, dosage, and refill metadata. This document is the canonical field map for medication → `drug_exposure`; the other three event resources (`MedicationDispense`, `MedicationAdministration`, `MedicationStatement`) link here for shared OMOP columns and document only their own resource-specific quirks.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `drug_exposure_id` | integer | Yes (PK) | Surrogate key. Hash/sequence/lookup of FHIR resource id. omoponfhir uses `IdMapping.getOMOPfromFHIR()`; NACHC uses autogen sequence; fhir-to-omop-demo uses FHIR `.id` directly. |
| `MedicationRequest.subject` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference → integer. See Reference Resolution below. |
| `MedicationRequest.medication[x]` | `drug_concept_id` | CodeableConcept/ref → integer (FK CONCEPT) | Yes | RxNorm (US) or ATC (EU) code → OMOP standard concept via vocabulary lookup. See Vocabulary Mappings below. Placeholder: 0. |
| `MedicationRequest.authoredOn` | `drug_exposure_start_date` | → date | Yes | The date the prescription was authored. NACHC falls back to encounter start date if null. FhirToCdm derives from VisitOccurrence instead. |
| `MedicationRequest.authoredOn` | `drug_exposure_start_datetime` | → datetime | No | Full ISO datetime from `authoredOn`. |
| `MedicationRequest.dispenseRequest.validityPeriod.end` | `drug_exposure_end_date` | → date | Yes | If absent, fallback to start date. This project also derives end from `dispenseRequest.expectedSupplyDuration` only when `validityPeriod.end` is absent. |
| `MedicationRequest.dispenseRequest.validityPeriod.end` | `drug_exposure_end_datetime` | → datetime | No | Full ISO datetime. Null if no end available. |
| (none for MedicationRequest) | `verbatim_end_date` | → date | No | Most implementations leave null. HL7 IG FML maps this from `effectivePeriod.end` (MedicationStatement only). |
| (constant 38000177) | `drug_type_concept_id` | integer (FK CONCEPT) | Yes | "Prescription written". omoponfhir, this project. fhir-to-omop-demo uses 32838 (EHR prescription). FhirToCdm uses 32817 (EHR). ETL-German uses 32817 (CLAIM). |
| `MedicationRequest.statusReason` | `stop_reason` | string → varchar(20) | No | Reason for discontinuation. omoponfhir truncates to 20 chars. Only populated when `status = stopped`. Most implementations leave null. |
| `MedicationRequest.dispenseRequest.numberOfRepeatsAllowed` | `refills` | integer | No | Number of refills. omoponfhir reads from `dispenseRequest` as fallback when `dosageInstruction` is empty. This project populates directly. |
| `MedicationRequest.dosageInstruction[].doseAndRate[].doseQuantity.value` | `quantity` | decimal → float | No | Dose amount per administration. omoponfhir also reads `dispenseRequest.quantity.value` as fallback. ETL-German computes mean of Range when doseRange is used. |
| `MedicationRequest.dispenseRequest.expectedSupplyDuration` | `days_supply` | integer | No | Days of medication supply. Calculated from `expectedSupplyDuration.value` with UCUM unit conversion. This project converts h/d/wk/mo/a units. No reference implementation populates this. |
| `MedicationRequest.dosageInstruction[].text` or `.patientInstruction` | `sig` | string → varchar(MAX) | No | Free-text dosage instructions. FhirToCdm reads `dosageInstruction[0].text`. fhir-to-omop-demo uses `.note`. |
| `MedicationRequest.dosageInstruction[].route` | `route_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | Administration route. Requires vocabulary lookup against SNOMED route concepts. See Vocabulary Mappings below. |
| `MedicationRequest.dosageInstruction[].route.text` or `.coding[0].display` | `route_source_value` | string → varchar(50) | No | Raw route code or display text. omoponfhir prefers `route.text`, falls back to `coding[0].display`. |
| (Immunization-only field, n/a for MedicationRequest) | `lot_number` | string → varchar(50) | No | Not used for MedicationRequest. |
| `MedicationRequest.requester` | `provider_id` | ref → integer (FK PROVIDER) | No | Prescriber. omoponfhir uses `recorder` instead. This project uses `requester`. |
| `MedicationRequest.encounter` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Resolve Encounter reference. See Reference Resolution below. |
| (none) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | Null in all reviewed implementations. FhirToCdm sets it equal to `visit_occurrence_id` (non-standard). |
| `MedicationRequest.medication[x].coding[best].code` | `drug_source_value` | code → varchar(50) | No | Best code by vocabulary priority (RxNorm > ATC > NDC > first). omoponfhir uses `identifier.value` as source value. |
| `MedicationRequest.medication[x]` | `drug_source_concept_id` | integer (FK CONCEPT) | No | Source vocabulary concept ID (non-standard). Placeholder: 0. fhir-to-omop-demo uses a pre-computed `source_concept_id` from vocabulary lookup. |
| `MedicationRequest.dosageInstruction[].doseAndRate[].doseQuantity.unit` or `.code` | `dose_unit_source_value` | string → varchar(50) | No | Raw dose unit string. omoponfhir prefers `.code`, falls back to `.unit`. |

## Type Concept

| FHIR Resource | OMOP concept_id | OMOP concept_name |
|---|---|---|
| MedicationRequest | 38000177 | Prescription written |

Other implementations:
- fhir-to-omop-demo uses 32838 (EHR prescription).
- FhirToCdm uses 32817 (EHR) for all medication-derived rows.
- ETL-German uses CONCEPT_CLAIM (32817, "EHR") for all medication resources.

## Vocabulary Mappings

### Drug Concept (`medication[x]` → `drug_concept_id`)

The primary vocabulary for OMOP drug concepts is **RxNorm** (US) or **ATC** (European data). The FHIR `medication[x]` field carries codes from various systems that must be mapped to OMOP standard concepts.

| FHIR Coding System | OMOP Vocabulary | Priority | Notes |
|---|---|---|---|
| `http://www.nlm.nih.gov/research/umls/rxnorm` | RxNorm | 1 (US) | Standard OMOP drug vocabulary. Maps directly to `drug_concept_id`. |
| `http://www.whocc.no/atc` | ATC | 1 (EU) | Used by ETL-German. Maps via OMOP vocabulary tables (`concept_relationship`). |
| `http://hl7.org/fhir/sid/ndc` | NDC | 2 | National Drug Code (US). Maps to RxNorm via `concept_relationship`. |
| `http://snomed.info/sct` | SNOMED | 3 | SNOMED CT product codes. Require mapping to RxNorm via OMOP concept tables. |

Vocabulary lookup strategy:
1. Extract all codings from `medication[x]`.
2. Prefer RxNorm coding if present; use its code for direct lookup in OMOP `CONCEPT` table (`vocabulary_id = 'RxNorm'`).
3. If only ATC/NDC/SNOMED, look up `source_concept_id` and traverse `concept_relationship` to find the standard RxNorm concept.
4. If no mapping found, set `drug_concept_id = 0` and preserve the original code in `drug_source_value`.

### Route Concept (`dosageInstruction[].route` → `route_concept_id`)

FHIR route codes (typically SNOMED CT) must be mapped to OMOP route concepts (domain = "Route"). MedicationRequest carries route inside each `dosageInstruction[]` entry.

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
- This project currently sets `route_concept_id = null` and captures `route_source_value` only.

## Medication Resolution

`MedicationRequest.medication[x]` has two forms:

1. **medicationCodeableConcept** — inline code with RxNorm/ATC/NDC coding. Extract best coding → `drug_concept_id` + `drug_source_value`.
2. **medicationReference** — Reference to a `Medication` resource containing the code. Must resolve, then extract `Medication.code`. The Medication resource may also carry `form` (dosage form) and `ingredient` (active substance).

Resolution strategies by implementation (applies to MedicationRequest specifically):

| Implementation | Inline | Reference | Contained | Notes |
|---|---|---|---|---|
| omoponfhir | Yes | Yes (contained only) | Yes | Resolves local `#` references; extracts `Medication.code` from contained resources. Falls back to `Reference.display` as text if code not found. |
| FhirToCdm | Yes | No | No | Only processes `medicationCodeableConcept`. Skips if reference. |
| fhir-to-omop-demo | Yes | Yes (merge) | No | Produces a partial `drug_exposure` from `MedicationRequest`; a separate `Medication.jq` produces matching partial rows; rows are merged by ID in a post-processing phase. |
| NACHC | Yes | No | No | Inline only. |
| This project | Yes | No | No | Only processes `medicationCodeableConcept`. Returns null if only `medicationReference`. |

See also `../Medication/index.md` for the canonical description of medication resource resolution strategies.

## Reference Resolution

### `subject` → `person_id`

Every MedicationRequest has a `subject` reference to a Patient resource. This must resolve to an integer `person_id` in the OMOP `person` table.

1. Extract the reference string (e.g., `"Patient/123"` or `"urn:uuid:abc-def"`).
2. Resolve to integer `person_id` via the ID mapping strategy (hash, sequence, or lookup table).
3. If unresolvable, omoponfhir throws `FHIRException`. FhirToCdm skips the record. This project defaults to `0`.

### `encounter` → `visit_occurrence_id`

- MedicationRequest uses the `encounter` field.
- Resolve to integer `visit_occurrence_id` via the same ID mapping.
- omoponfhir validates that the referenced VisitOccurrence exists in the database.
- FhirToCdm falls back to using the visit dates as the drug exposure dates when no explicit dates are available.
- This project resolves via `ctx.ids.resolveRef()`.

### `requester` → `provider_id`

- Reference must point to a `Practitioner` resource (or `PractitionerRole`).
- omoponfhir filters by resource type: only resolves if `referenceElement.getResourceType()` equals `"Practitioner"`. omoponfhir uses `recorder` instead of `requester`.
- This project resolves via `ctx.ids.resolveRef()` without type filtering.

## Edge Cases

| Case | Handling |
|---|---|
| `medicationReference` to contained Medication | omoponfhir iterates `contained[]` to find matching Medication by ID fragment. This project skips (returns null). |
| `medicationReference` to external Medication | Requires Bundle-level or server-side resolution. fhir-to-omop-demo merges in post-processing. Most implementations skip. |
| Multiple `dosageInstruction` entries | Take first for route and dose. omoponfhir iterates all entries but breaks after first match. |
| `status` = `entered-in-error` | Skip — do not create drug_exposure row. All implementations agree. |
| `status` = `stopped` | omoponfhir populates `stop_reason` from `statusReason` and still creates the row. This project skips. |
| `status` = `on-hold` / `draft` / `unknown` | This project skips (only maps `active` and `completed`). omoponfhir maps all statuses except `entered-in-error`. |
| `intent` = `proposal` / `plan` | This project skips — only maps `order`, `original-order`, `reflex-order`, `filler-order`, `instance-order`. omoponfhir maps all intents. |
| No end date available | Use start date as end date. Consensus across all implementations. omoponfhir: `setDrugExposureEndDate(startDate)`. |
| `dispenseRequest` absent | No `validityPeriod.end`, no `expectedSupplyDuration`, no `numberOfRepeatsAllowed` available. Fall back to start = end and null `days_supply`/`refills`. |
| `expectedSupplyDuration` UCUM units | This project converts `h`, `d`, `wk`, `mo`, `a` to days. Other UCUM duration codes are not supported. |
| `authoredOn` null | NACHC falls back to encounter start date. FhirToCdm derives from VisitOccurrence. This project leaves null. |
| Quantity > 1 unit but unit unclear | Store in `quantity` with `dose_unit_source_value`. |
| Multiple codings in `medication[x]` | fhir-to-omop-demo warns (`debug("Multiple codings")`). This project uses `selectBestCoding()` by vocabulary priority. omoponfhir uses `CodeableConceptUtil.searchConcept()` which iterates all codings against OMOP concept table. |
| No medication code found | This project returns null (skips). omoponfhir throws `FHIRException`. |
| `drug_source_value` exceeds 50 chars | omoponfhir truncates `medicationCodeableConcept.getText()` to 50 chars: `.substring(0, 50)`. |
| `stop_reason` exceeds 20 chars | omoponfhir truncates: `.substring(0, 20)`. OMOP CDM field is `varchar(20)`. |

## Sources

### This project
- MedicationRequest mapper: `src/mapper/medication.ts` (93 lines)
  - Status/intent filtering: lines 8-11
  - Date handling (authoredOn, validityPeriod): lines 35-47
  - Days supply calculation with UCUM unit conversion: lines 49-52, 84-93
  - Dosage parsing (quantity, route, sig): lines 54-58
  - Output construction: lines 60-81
- FHIR types: `src/types/fhir.ts` — MedicationRequest (lines 208-226), Dosage (lines 159-163)
- OMOP types: `src/types/omop.ts` — DrugExposure (lines 131-152)

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

### FhirToCdm (OHDSI, C#)
- `refs/refs/FhirToCdm/FhirToCdmMappings.cs` (624 lines)
  - `CreateDrugExposure()`: lines 310-405
  - MedicationRequest processing: lines 322-373
  - Medication CodeableConcept extraction: lines 325-327
  - Vocabulary lookup via `LookupCode()`: lines 361-363, 596-622
  - `sig` from `dosageInstruction[0].text`: lines 352-354
  - Visit-derived dates (start/end from VisitOccurrence): lines 366-369
  - Type concept: 32817 (EHR) for all: line 338
  - Vocabulary system mapping (SNOMED, RxNorm, CVX, LOINC): lines 596-622

### fhir-to-omop-demo (jq)
- MedicationRequest: `refs/refs/fhir-to-omop-demo/demo/translate/map/MedicationRequest.jq` (81 lines)
  - Drug concept from pre-computed vocabulary: lines 10-24
  - `drug_type_concept_id`: 32838 (EHR prescription): line 61
  - Provider from `requester.id`: line 69
  - Visit from `encounter.id`: line 70
  - All 23 drug_exposure columns output as TSV: lines 52-76
- Medication (reference merge): `refs/refs/fhir-to-omop-demo/demo/translate/map/Medication.jq` (71 lines)
  - Produces partial drug_exposure rows with concept info only, merged with MedicationRequest rows by ID

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
- Dosage: https://hl7.org/fhir/R4/dosage.html

### Articles
- [Drug Exposure OMOP Table (FHIR IG)](https://build.fhir.org/ig/HL7/fhir-omop-ig/en/StructureDefinition-DrugExposure.html) — FHIR logical model for OMOP drug_exposure.
- [Common Challenges When Transforming FHIR to OMOP](https://build.fhir.org/ig/HL7/fhir-omop-ig/F2OGeneralIssues.html) — Medication resource variety across EHR vendors.
