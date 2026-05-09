# MedicationAdministration → drug_exposure

OMOP CDM v5.4. The `drug_exposure` table captures all medication events. `MedicationAdministration` represents the inpatient administration stage and is the primary source of real-world route information. Each administration event produces one `drug_exposure` row distinguished by `drug_type_concept_id = 38000179` ("Physician administered drug").

For shared OMOP columns (vocabulary lookup, person/visit reference resolution, generic medication resolution), refer to the canonical [`../MedicationRequest/drug_exposure.md`](../MedicationRequest/drug_exposure.md).

## Resource-Specific Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `drug_exposure_id` | integer | Yes (PK) | Surrogate key. See `../MedicationRequest/drug_exposure.md`. |
| `MedicationAdministration.subject` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference. |
| `MedicationAdministration.medication[x]` | `drug_concept_id` | CodeableConcept/ref → integer (FK CONCEPT) | Yes | RxNorm / ATC / NDC → OMOP standard concept. See [`../MedicationRequest/drug_exposure.md#vocabulary-mappings`](../MedicationRequest/drug_exposure.md#vocabulary-mappings). |
| `MedicationAdministration.effectiveDateTime` or `effectivePeriod.start` | `drug_exposure_start_date` | → date | Yes | Point-in-time or period start. |
| same | `drug_exposure_start_datetime` | → datetime | No | Full ISO datetime. |
| `MedicationAdministration.effectivePeriod.end` (fallback: start date) | `drug_exposure_end_date` | → date | Yes | When `effectiveDateTime` is used (single point), end = start. omoponfhir general rule: `setDrugExposureEndDate(startDate)` when no period end. |
| `MedicationAdministration.effectivePeriod.end` | `drug_exposure_end_datetime` | → datetime | No | Full ISO datetime. Null if no period end. |
| (none for MedicationAdministration) | `verbatim_end_date` | → date | No | Most implementations leave null. |
| (constant 38000179) | `drug_type_concept_id` | integer (FK CONCEPT) | Yes | "Physician administered drug (identified as procedure)". fhir-to-omop-demo uses 32818 (EHR administration record). FhirToCdm uses 32817 (EHR). ETL-German uses 32817 (CLAIM). |
| (none) | `stop_reason` | string → varchar(20) | No | MedicationAdministration does not commonly carry a discontinuation reason. Leave null. |
| (n/a — refills are MedicationRequest-only) | `refills` | integer | No | Leave null. |
| `MedicationAdministration.dosage.dose.value` | `quantity` | decimal → float | No | Dose amount given. ETL-German computes mean of Range when `doseRange` is used. |
| (none directly on MedicationAdministration) | `days_supply` | integer | No | Not applicable to a single administration event. Leave null. |
| `MedicationAdministration.dosage.text` | `sig` | string → varchar(MAX) | No | Free-text dosage instructions. |
| `MedicationAdministration.dosage.route` | `route_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | Administration route via SNOMED → OMOP Route domain lookup. MedicationAdministration carries the richest route data of the four resources. |
| `MedicationAdministration.dosage.route.text` or `.coding[0].display` | `route_source_value` | string → varchar(50) | No | Raw route. |
| (n/a) | `lot_number` | string → varchar(50) | No | Vaccine-only field; not used here. |
| `MedicationAdministration.performer[0].actor` | `provider_id` | ref → integer (FK PROVIDER) | No | Administering clinician. |
| `MedicationAdministration.context` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Encounter reference. |
| (none) | `visit_detail_id` | integer | No | Null. FhirToCdm sets it equal to `visit_occurrence_id` (non-standard). |
| `MedicationAdministration.medication[x].coding[best].code` | `drug_source_value` | code → varchar(50) | No | Best code by vocabulary priority (RxNorm > ATC > NDC > first). ETL-German uses ATC code. |
| `MedicationAdministration.medication[x]` | `drug_source_concept_id` | integer (FK CONCEPT) | No | Source vocabulary concept. Placeholder: 0. fhir-to-omop-demo uses pre-computed `source_concept_id`. |
| `MedicationAdministration.dosage.dose.unit` or `.code` | `dose_unit_source_value` | string → varchar(50) | No | Raw dose unit string. |

## Type Concept

| FHIR Resource | OMOP concept_id | OMOP concept_name |
|---|---|---|
| MedicationAdministration | 38000179 | Physician administered drug (identified as procedure) |

Implementation variants:
- fhir-to-omop-demo: 32818 (EHR administration record).
- FhirToCdm: 32817 (EHR) — universal across medication resources.
- ETL-German: 32817 (CLAIM) — universal across medication resources.

## Vocabulary Mappings

### Drug Concept

Identical to MedicationRequest. ETL-German specifically uses ATC codes for European data. See [`../MedicationRequest/drug_exposure.md#drug-concept-medicationx--drug_concept_id`](../MedicationRequest/drug_exposure.md#drug-concept-medicationx--drug_concept_id).

### Route Concept (`dosage.route` → `route_concept_id`)

MedicationAdministration's `dosage.route` is the highest-fidelity source of administration route. Same SNOMED → OMOP Route mapping table as the other event resources.

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
- ETL-German uses `findOmopConcepts.getConcepts()` with date-aware validity checking.
- fhir-to-omop-demo pre-computes route concepts in vocabulary lookups.

## Dosage Parsing

MedicationAdministration has a single `dosage` element (not an array, unlike MedicationRequest's `dosageInstruction[]`). Extract:
- `dosage.dose.value` → `quantity`
- `dosage.dose.unit`/`code` → `dose_unit_source_value`
- `dosage.route` → `route_concept_id` + `route_source_value`
- `dosage.text` → `sig`

ETL-German handles `doseRange` by computing the mean of the range. Other implementations would leave `quantity` null in that case.

## Medication Resolution

Same `medicationCodeableConcept` vs `medicationReference` distinction. ETL-German pre-indexes Medication resources via `medication_id_map` and resolves references before mapping. fhir-to-omop-demo would need a similar merge phase (its current `Medication.jq` only merges with MedicationRequest). See [`../MedicationRequest/drug_exposure.md#medication-resolution`](../MedicationRequest/drug_exposure.md#medication-resolution) and `../Medication/index.md`.

## Reference Resolution

- `subject` → `person_id`: same pattern as MedicationRequest.
- `context` → `visit_occurrence_id`: same as MedicationStatement.
- `performer[0].actor` → `provider_id`.

See [`../MedicationRequest/drug_exposure.md#reference-resolution`](../MedicationRequest/drug_exposure.md#reference-resolution).

## Edge Cases (MedicationAdministration-specific)

| Case | Handling |
|---|---|
| `status` = `entered-in-error` | Skip — do not create drug_exposure row. Consensus across all implementations. |
| `status` = `not-done` | Skip (medication was not administered). |
| `status` = `stopped` | Implementation-dependent. ETL-German maps; this project would skip. |
| `effectiveDateTime` (point in time) | Start and end date are the same. omoponfhir general rule: `setDrugExposureStartDate(date); setDrugExposureEndDate(date)`. |
| `effectivePeriod` with start but no end | End date = start date. |
| `dosage` absent | Leave `quantity`, `route_concept_id`, `route_source_value`, `dose_unit_source_value`, `sig` all null. |
| `doseRange` (Range instead of Quantity) | ETL-German computes the mean. Others leave null. |
| Multiple codings in `medication[x]` | Best by vocabulary priority. See `../MedicationRequest/drug_exposure.md`. |
| No medication code found | Skip (consensus across implementations). |

For shared edge cases (medication resolution, source-value truncation, multiple codings, etc.), see [`../MedicationRequest/drug_exposure.md#edge-cases`](../MedicationRequest/drug_exposure.md#edge-cases).

## Sources

### ETL-German-FHIR-Core (OHDSI, Java)
- MedicationAdministrationMapper: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/MedicationAdministrationMapper.java`
- MedicationMapper (pre-indexes Medication resources for reference resolution): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/MedicationMapper.java` (274 lines) — ATC code extraction and concept lookup.

### fhir-to-omop-demo (jq)
- MedicationAdministration: `refs/refs/fhir-to-omop-demo/demo/translate/map/MedicationAdministration.jq` (59 lines)
  - `drug_type_concept_id`: 32818 (EHR administration record): line 39

### OMOP CDM specification
- OMOP CDM v5.4 drug_exposure: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- OMOP CDM docs: https://ohdsi.github.io/CommonDataModel/cdm54.html#DRUG_EXPOSURE
- Drug dose documentation: https://ohdsi.github.io/CommonDataModel/drug_dose.html

### FHIR R4 specification
- MedicationAdministration: https://hl7.org/fhir/R4/medicationadministration.html
- Dosage: https://hl7.org/fhir/R4/dosage.html

### Articles
- [Drug Exposure OMOP Table (FHIR IG)](https://build.fhir.org/ig/HL7/fhir-omop-ig/en/StructureDefinition-DrugExposure.html) — FHIR logical model for OMOP drug_exposure.
- [Common Challenges When Transforming FHIR to OMOP](https://build.fhir.org/ig/HL7/fhir-omop-ig/F2OGeneralIssues.html) — Medication resource variety across EHR vendors.
