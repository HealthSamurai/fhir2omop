# MedicationStatement → drug_exposure

OMOP CDM v5.4. The `drug_exposure` table captures all medication events. `MedicationStatement` represents the patient self-report stage. Each statement produces one `drug_exposure` row, with a `drug_type_concept_id` that defaults to `44787730` ("Patient Self-Reported Medication") but may be dynamically adjusted based on `basedOn` / `partOf` references (omoponfhir behavior).

This is the **only** FHIR medication resource with a normative mapping in the HL7 FHIR-to-OMOP IG: `refs/refs/fhir-omop-ig/input/maps/medication.fml` (46 lines).

For shared OMOP columns (vocabulary lookup, route mapping, person/visit reference resolution), refer to the canonical [`../MedicationRequest/drug_exposure.md`](../MedicationRequest/drug_exposure.md).

## Resource-Specific Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `drug_exposure_id` | integer | Yes (PK) | Surrogate key. HL7 IG FML leaves this as a commented-out TODO. omoponfhir uses `IdMapping.getOMOPfromFHIR()`. |
| `MedicationStatement.subject` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference. HL7 IG FML leaves this as a commented-out TODO. |
| `MedicationStatement.medication[x]` | `drug_concept_id` | CodeableConcept/ref → integer (FK CONCEPT) | Yes | RxNorm / ATC / NDC → OMOP standard concept. HL7 IG FML maps from `medication.concept.coding.code` (line 20). See [`../MedicationRequest/drug_exposure.md#vocabulary-mappings`](../MedicationRequest/drug_exposure.md#vocabulary-mappings). |
| `MedicationStatement.effectiveDateTime` or `effectivePeriod.start` (fallback `dateAsserted`) | `drug_exposure_start_date` | → date | Yes | HL7 IG FML maps from `effective[x]` (lines 24-26). This project's tertiary fallback chain: effectiveDateTime → effectivePeriod.start → dateAsserted. omoponfhir falls back to `new Date()` (current time) if no date found. |
| same | `drug_exposure_start_datetime` | → datetime | No | Full ISO datetime. |
| `MedicationStatement.effectivePeriod.end` (fallback start) | `drug_exposure_end_date` | → date | Yes | HL7 IG FML maps from `effectivePeriod.end` (lines 28-29). When `effectiveDateTime` is used (point in time), omoponfhir sets end = start. This project agrees. |
| `MedicationStatement.effectivePeriod.end` | `drug_exposure_end_datetime` | → datetime | No | Full ISO datetime. Null if no period end. |
| `MedicationStatement.effectivePeriod.end` | `verbatim_end_date` | → date | No | The raw end date from the source, before any inference. HL7 IG FML maps `effectivePeriod.end` here (lines 31-32). Most other implementations leave null. |
| (default 44787730 — dynamic) | `drug_type_concept_id` | integer (FK CONCEPT) | Yes | Default "Patient Self-Reported Medication". omoponfhir dynamically adjusts: `basedOn` → MedicationRequest = 38000177; `partOf` → MedicationAdministration = 38000179; `partOf` → MedicationDispense = 38000175. HL7 IG FML maps from `category.coding.code` (lines 34-38). ETL-German uses 32817 (CLAIM) universally. |
| `MedicationStatement.statusReason` (formerly `reasonNotTaken`) | `stop_reason` | string → varchar(20) | No | Reason for discontinuation. omoponfhir truncates to 20 chars and only populates when `status = stopped` (`OmopMedicationStatement.java` lines 711-748). HL7 IG FML maps from `reason.concept.coding.code` (lines 39-45). |
| (n/a — refills are MedicationRequest-only) | `refills` | integer | No | Leave null. |
| `MedicationStatement.dosage[].doseAndRate[].doseQuantity.value` | `quantity` | decimal → float | No | Dose amount per administration. ETL-German computes mean of Range when `doseRange` is used. |
| (none directly on MedicationStatement) | `days_supply` | integer | No | Not directly available. Could be computed from period length / dosing frequency, but no reference implementation does this for MedicationStatement. |
| `MedicationStatement.dosage[].text` or `.patientInstruction` | `sig` | string → varchar(MAX) | No | Free-text dosage instructions. |
| `MedicationStatement.dosage[].route` | `route_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | SNOMED → OMOP Route lookup. omoponfhir performs full vocabulary lookup. ETL-German uses date-aware concept lookup. |
| `MedicationStatement.dosage[].route.text` or `.coding[0].display` | `route_source_value` | string → varchar(50) | No | Raw route. omoponfhir prefers `route.text`, falls back to `coding[0].display`. |
| (n/a) | `lot_number` | string → varchar(50) | No | Vaccine-only field; not used here. |
| `MedicationStatement.informationSource` | `provider_id` | ref → integer (FK PROVIDER) | No | Reporter. omoponfhir filters to Practitioner-typed references only. ETL-German does not map provider for MedicationStatement. |
| `MedicationStatement.context` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Encounter reference (R4 `context`; renamed to `encounter` in R5). |
| (none) | `visit_detail_id` | integer | No | Null in all reviewed implementations. |
| `MedicationStatement.medication[x].coding[best].code` | `drug_source_value` | code → varchar(50) | No | Best code by vocabulary priority. omoponfhir uses `identifier.value` as source value. ETL-German uses ATC code. |
| `MedicationStatement.medication[x]` | `drug_source_concept_id` | integer (FK CONCEPT) | No | Source vocabulary concept. Placeholder: 0. |
| `MedicationStatement.dosage[].doseAndRate[].doseQuantity.unit` or `.code` | `dose_unit_source_value` | string → varchar(50) | No | Raw dose unit string. omoponfhir prefers `.code`, falls back to `.unit`. |

## Type Concept (Dynamic)

| Condition | OMOP concept_id | OMOP concept_name |
|---|---|---|
| Default (no `basedOn` / `partOf`) | 44787730 | Patient Self-Reported Medication |
| `basedOn` references MedicationRequest | 38000177 | Prescription written |
| `partOf` references MedicationAdministration | 38000179 | Physician administered drug |
| `partOf` references MedicationDispense | 38000175 | Prescription dispensed in pharmacy |

omoponfhir implements this dynamic mapping in `OmopMedicationStatement.java` lines 933-958. Other implementations use static type concepts:
- HL7 IG FML: derives from `category.coding.code` (lines 34-38).
- ETL-German: 32817 (CLAIM) universal.
- This project: static 44787730.

## Date Fallback Chain

MedicationStatement is the only resource with a documented tertiary fallback. This project's chain:
1. `effectiveDateTime` → start = end (point in time).
2. `effectivePeriod.start` / `effectivePeriod.end` → period.
3. `dateAsserted` → start (used when no `effective[x]` is present).

omoponfhir falls back to `new Date()` (current time) instead of `dateAsserted` when no date found.

## Vocabulary Mappings

Identical to MedicationRequest. See [`../MedicationRequest/drug_exposure.md#vocabulary-mappings`](../MedicationRequest/drug_exposure.md#vocabulary-mappings) for:
- Drug Concept (`medication[x]` → `drug_concept_id`) — RxNorm / ATC / NDC / SNOMED priority.
- Route Concept (`dosage[].route` → `route_concept_id`) — SNOMED route codes → OMOP Route domain.

ETL-German specifically uses ATC codes for European data.

## Medication Resolution

Same `medicationCodeableConcept` vs `medicationReference` distinction. omoponfhir resolves contained references (`OmopMedicationStatement.java` lines 751-805). ETL-German pre-indexes Medication resources via `medication_id_map`. This project handles inline only. See [`../MedicationRequest/drug_exposure.md#medication-resolution`](../MedicationRequest/drug_exposure.md#medication-resolution) and `../Medication/index.md`.

## Reference Resolution

- `subject` → `person_id`: same pattern as MedicationRequest. omoponfhir: `OmopMedicationStatement.java` lines 861-882.
- `context` → `visit_occurrence_id`: omoponfhir lines 692-709. R5 renames this field to `encounter`.
- `informationSource` → `provider_id`: omoponfhir filters to Practitioner-typed references only (lines 837-858).

See [`../MedicationRequest/drug_exposure.md#reference-resolution`](../MedicationRequest/drug_exposure.md#reference-resolution) for ID resolution strategy details.

## Edge Cases (MedicationStatement-specific)

| Case | Handling |
|---|---|
| `status` = `entered-in-error` | Skip — do not create drug_exposure row. Consensus across all implementations. |
| `status` = `stopped` | omoponfhir populates `stop_reason` from `statusReason` and still creates the row. This project skips. |
| `status` = `on-hold` / `intended` / `not-taken` / `unknown` | This project skips. omoponfhir maps all statuses except `entered-in-error`. |
| `effectiveDateTime` (point in time) | Start and end date are the same. omoponfhir: `setDrugExposureStartDate(date); setDrugExposureEndDate(date)`. |
| `effectivePeriod` with start but no end | End date = start date. omoponfhir and this project agree. |
| `dateAsserted` but no `effective[x]` | This project falls back to `dateAsserted`. omoponfhir sets `new Date()` (current time) if no date found. |
| `basedOn` references MedicationRequest | omoponfhir dynamically sets `drug_type_concept_id` to 38000177 (Prescription written) instead of 44787730. This project leaves at 44787730. |
| `partOf` references MedicationAdministration / MedicationDispense | omoponfhir dynamically sets `drug_type_concept_id` to 38000179 / 38000175 respectively. |
| `medicationReference` to contained Medication | omoponfhir iterates `contained[]`. ETL-German pre-indexes. This project skips (returns null). |
| Multiple `dosage` entries | This project takes first. ETL-German creates one drug_exposure per dosage entry (fan-out). |
| Multiple codings in `medication[x]` | This project uses `selectBestCoding()` by vocabulary priority. omoponfhir uses `CodeableConceptUtil.searchConcept()`. |
| `drug_source_value` exceeds 50 chars | omoponfhir truncates `medicationCodeableConcept.getText()` to 50 chars. |
| `stop_reason` exceeds 20 chars | omoponfhir truncates to 20 (`OmopMedicationStatement.java` lines 711-748). OMOP CDM field is `varchar(20)`. |

## Sources

### This project
- MedicationStatement mapper: `src/mapper/medication-statement.ts` (75 lines)
  - Status filtering: line 8
  - Date fallback chain (effectiveDateTime → effectivePeriod → dateAsserted): lines 28-34
  - Dosage parsing: lines 52-53
  - Output construction: lines 55-74
- FHIR types: `src/types/fhir.ts` — MedicationStatement (lines 165-181), Dosage (lines 159-163)
- OMOP types: `src/types/omop.ts` — DrugExposure (lines 131-152)

### HL7 IG FML (normative, minimal — only normative mapping for any medication resource)
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
  - Type concept ID 44787730: line 84

### ETL-German-FHIR-Core (OHDSI, Java)
- MedicationStatementMapper: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/MedicationStatementMapper.java` (965 lines)
  - `setUpDrugExposure()`: lines 574-637
  - Drug exposure builder: lines 589-604
  - Route concept lookup: lines 610-621
  - Quantity from doseQuantity or Range mean: lines 622-634
  - Type concept: CONCEPT_CLAIM (32817): line 600
- MedicationMapper (pre-indexes Medication resources): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/MedicationMapper.java` (274 lines) — ATC code extraction and concept lookup.

### OMOP CDM specification
- OMOP CDM v5.4 drug_exposure: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- OMOP CDM docs: https://ohdsi.github.io/CommonDataModel/cdm54.html#DRUG_EXPOSURE
- Drug dose documentation: https://ohdsi.github.io/CommonDataModel/drug_dose.html

### FHIR R4 specification
- MedicationStatement: https://hl7.org/fhir/R4/medicationstatement.html
- Dosage: https://hl7.org/fhir/R4/dosage.html

### Articles
- [MedicationStatement → DrugExposure StructureMap (HL7 IG)](https://build.fhir.org/ig/HL7/fhir-omop-ig/en/StructureMap-MedicationMap.html) — Official FML for medication mapping.
- [Drug Exposure OMOP Table (FHIR IG)](https://build.fhir.org/ig/HL7/fhir-omop-ig/en/StructureDefinition-DrugExposure.html) — FHIR logical model for OMOP drug_exposure.
- [Common Challenges When Transforming FHIR to OMOP](https://build.fhir.org/ig/HL7/fhir-omop-ig/F2OGeneralIssues.html) — Medication resource variety across EHR vendors.
