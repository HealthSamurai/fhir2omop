# MedicationDispense → drug_exposure

OMOP CDM v5.4. The `drug_exposure` table captures all medication events. `MedicationDispense` represents the pharmacy dispensing stage. Each dispense event produces one `drug_exposure` row distinguished by `drug_type_concept_id = 38000175` ("Prescription dispensed in pharmacy").

> **Coverage gap.** None of the reviewed reference implementations covers MedicationDispense → drug_exposure (see `index.md`). The mapping below is reconstructed from the OMOP `drug_exposure` schema and FHIR R4 `MedicationDispense` definition. For shared OMOP columns (vocabulary lookup, route mapping, person/visit reference resolution, edge cases), refer to the canonical [`../MedicationRequest/drug_exposure.md`](../MedicationRequest/drug_exposure.md).

## Resource-Specific Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `drug_exposure_id` | integer | Yes (PK) | Surrogate key. See `../MedicationRequest/drug_exposure.md`. |
| `MedicationDispense.subject` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference. See `../MedicationRequest/drug_exposure.md#subject--person_id`. |
| `MedicationDispense.medication[x]` | `drug_concept_id` | CodeableConcept/ref → integer (FK CONCEPT) | Yes | RxNorm / ATC / NDC → OMOP standard concept. See [`../MedicationRequest/drug_exposure.md#vocabulary-mappings`](../MedicationRequest/drug_exposure.md#vocabulary-mappings). |
| `MedicationDispense.whenHandedOver` (fallback `whenPrepared`) | `drug_exposure_start_date` | → date | Yes | The date the medication was supplied. |
| `MedicationDispense.whenHandedOver` | `drug_exposure_start_datetime` | → datetime | No | Full ISO datetime. |
| `MedicationDispense.daysSupply` + start, or start | `drug_exposure_end_date` | → date | Yes | If `daysSupply` is present, end = start + daysSupply. Otherwise fallback to start date. |
| (computed) | `drug_exposure_end_datetime` | → datetime | No | Null if no `daysSupply`. |
| (none for MedicationDispense) | `verbatim_end_date` | → date | No | Leave null. |
| (constant 38000175) | `drug_type_concept_id` | integer (FK CONCEPT) | Yes | "Prescription dispensed in pharmacy". |
| (none) | `stop_reason` | string → varchar(20) | No | MedicationDispense does not carry a discontinuation reason that maps here. Leave null. |
| (n/a — refills are MedicationRequest-only) | `refills` | integer | No | Leave null. Refills are tracked on the originating MedicationRequest. |
| `MedicationDispense.quantity.value` | `quantity` | decimal → float | No | Dispensed quantity (the total handed over). |
| `MedicationDispense.daysSupply.value` | `days_supply` | integer | No | Days of medication supplied. Direct FHIR field on MedicationDispense, unlike MedicationRequest. |
| `MedicationDispense.dosageInstruction[].text` or `.patientInstruction` | `sig` | string → varchar(MAX) | No | Free-text dosage instructions. Same shape as MedicationRequest. |
| `MedicationDispense.dosageInstruction[].route` | `route_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | Same SNOMED → OMOP Route mapping as MedicationRequest. See [`../MedicationRequest/drug_exposure.md#route-concept-dosageinstructionroute--route_concept_id`](../MedicationRequest/drug_exposure.md#route-concept-dosageinstructionroute--route_concept_id). |
| `MedicationDispense.dosageInstruction[].route.text` or `.coding[0].display` | `route_source_value` | string → varchar(50) | No | Raw route. |
| (n/a) | `lot_number` | string → varchar(50) | No | Not used. |
| `MedicationDispense.performer[0].actor` | `provider_id` | ref → integer (FK PROVIDER) | No | The dispensing pharmacist or actor. |
| `MedicationDispense.context` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Encounter reference. Resolve as for MedicationRequest. |
| (none) | `visit_detail_id` | integer | No | Null. |
| `MedicationDispense.medication[x].coding[best].code` | `drug_source_value` | code → varchar(50) | No | Best code by vocabulary priority. |
| `MedicationDispense.medication[x]` | `drug_source_concept_id` | integer (FK CONCEPT) | No | Source vocabulary concept. Placeholder: 0. |
| `MedicationDispense.dosageInstruction[].doseAndRate[].doseQuantity.unit` or `.code` | `dose_unit_source_value` | string → varchar(50) | No | Raw dose unit string. |

## Type Concept

| FHIR Resource | OMOP concept_id | OMOP concept_name |
|---|---|---|
| MedicationDispense | 38000175 | Prescription dispensed in pharmacy |

ETL-German would use `32817` (CLAIM/EHR) and FhirToCdm would use `32817` (EHR) if they implemented MedicationDispense — neither does today.

## Vocabulary Mappings

Identical to MedicationRequest. See [`../MedicationRequest/drug_exposure.md#vocabulary-mappings`](../MedicationRequest/drug_exposure.md#vocabulary-mappings) for:
- Drug Concept (`medication[x]` → `drug_concept_id`) — RxNorm / ATC / NDC / SNOMED priority.
- Route Concept (`dosageInstruction[].route` → `route_concept_id`) — SNOMED route codes → OMOP Route domain.

## Medication Resolution

Same `medicationCodeableConcept` vs `medicationReference` distinction as MedicationRequest. See [`../MedicationRequest/drug_exposure.md#medication-resolution`](../MedicationRequest/drug_exposure.md#medication-resolution) and `../Medication/index.md`.

## Reference Resolution

- `subject` → `person_id`: same as MedicationRequest.
- `context` → `visit_occurrence_id`: equivalent to MedicationRequest's `encounter`.
- `performer[0].actor` → `provider_id`: pharmacist or dispensing actor (typically Practitioner / PractitionerRole / Organization).

See [`../MedicationRequest/drug_exposure.md#reference-resolution`](../MedicationRequest/drug_exposure.md#reference-resolution).

## Edge Cases (MedicationDispense-specific)

| Case | Handling |
|---|---|
| `status` = `entered-in-error` | Skip — do not create drug_exposure row. Consensus across implementations. |
| `status` = `cancelled` / `declined` / `stopped` | TODO — no reference implementation precedent for MedicationDispense. Recommended: skip. |
| `whenHandedOver` absent, `whenPrepared` present | Use `whenPrepared` as start. |
| Both `whenHandedOver` and `whenPrepared` absent | Fallback to `context` (encounter) start, or null. |
| `daysSupply` absent | End date = start date. |
| `quantity` absent | Leave null. |
| Multiple `dosageInstruction` entries | Take first (consistent with other medication resources). |
| Cross-reference to originating MedicationRequest via `authorizingPrescription` | Currently no implementation links these for OMOP. Could be used to inherit dosage/refill metadata. |

For shared edge cases (medication resolution, multiple codings, source-value truncation, etc.), see [`../MedicationRequest/drug_exposure.md#edge-cases`](../MedicationRequest/drug_exposure.md#edge-cases).

## Sources

### Reference implementations

**No reviewed reference implementation covers MedicationDispense.** Confirmed gaps:
- `refs/refs/omoponfhir-omopv5-r4-mapping/` — MedicationRequest + MedicationStatement only.
- `refs/refs/FhirToCdm/` — MedicationRequest + Immunization only.
- `refs/refs/ETL-German-FHIR-Core/` — MedicationStatement + MedicationAdministration only.
- `refs/refs/fhir-to-omop-demo/` — MedicationRequest + MedicationAdministration only.
- `refs/refs/NACHC-fhir-to-omop/` — MedicationRequest only.
- `refs/refs/fhir-omop-ig/input/maps/medication.fml` — MedicationStatement only.

### OMOP CDM specification
- OMOP CDM v5.4 drug_exposure: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- OMOP CDM docs: https://ohdsi.github.io/CommonDataModel/cdm54.html#DRUG_EXPOSURE

### FHIR R4 specification
- MedicationDispense: https://hl7.org/fhir/R4/medicationdispense.html
- Dosage: https://hl7.org/fhir/R4/dosage.html
