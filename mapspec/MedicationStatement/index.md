# MedicationStatement → OMOP Mapping

`MedicationStatement` represents the **patient self-report stage** of the medication lifecycle — what the patient is taking, has taken, or intends to take, regardless of whether it was prescribed in the system. This is the only medication resource for which the HL7 FHIR-to-OMOP IG provides a normative FML mapping.

## Source FHIR Resource

| FHIR Resource | Lifecycle Stage | OMOP target | OMOP type_concept_id |
|---|---|---|---|
| `MedicationStatement` | Patient self-report | `drug_exposure` | 44787730 (Patient Self-Reported Medication) — or dynamic, see below |

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `drug_exposure` | One row per self-reported medication event | Yes |
| `drug_era` | Derived: continuous drug exposure periods | No — computed post-ETL |
| `dose_era` | Derived: continuous dose periods | No — computed post-ETL |

## Mapping Strategy

1. **Status filtering.** `entered-in-error` is always skipped. omoponfhir maps `stopped` and populates `stop_reason` from `statusReason`. This project skips `stopped`, `on-hold`, and other non-active/completed statuses.

2. **Dynamic type concept.** Default is `44787730` ("Patient Self-Reported Medication"). omoponfhir dynamically adjusts:
   - If `basedOn` references a `MedicationRequest`, use `38000177` (Prescription written) instead.
   - If `partOf` references a `MedicationAdministration`, use `38000179` (Physician administered drug).
   - If `partOf` references a `MedicationDispense`, use `38000175` (Prescription dispensed in pharmacy).

3. **Date handling.** `effectiveDateTime` or `effectivePeriod.start` → `drug_exposure_start_date`. Tertiary fallback: `dateAsserted`. omoponfhir sets end = start when `effectiveDateTime` is used. omoponfhir falls back to `new Date()` (current time) if no date found; this project falls back to `dateAsserted`.

4. **Dosage parsing.** `dosage[].doseAndRate[].doseQuantity` → `quantity` + `dose_unit_source_value`. `dosage[].route` → `route_concept_id` + `route_source_value`. `dosage[].text` → `sig`. ETL-German fans out one `drug_exposure` row per `dosage[]` entry; others take the first.

5. **Medication resolution.** Same strategies as MedicationRequest. See [`drug_exposure.md`](./drug_exposure.md#medication-resolution) and `../Medication/index.md`.

6. **Provider.** `informationSource` → `provider_id`. omoponfhir filters to `Practitioner`-typed references only. ETL-German does not map provider for MedicationStatement.

## Per-Table Docs

- [drug_exposure](./drug_exposure.md) — MedicationStatement → drug_exposure field mapping. Cross-references `../MedicationRequest/drug_exposure.md` for shared OMOP columns.

## Reference Implementations

- **HL7 IG FML** (normative) — `refs/refs/fhir-omop-ig/input/maps/medication.fml` (46 lines). The only normative mapping for any FHIR medication resource and it covers **only MedicationStatement**. Maps drug concept, dates, type, and stop_reason. `person_id` and `drug_exposure_id` are commented-out TODOs. Status: draft.
- **omoponfhir-omopv5-r4-mapping** (Georgia Tech, Java) — `OmopMedicationStatement.java` (983 lines). Most complete: RxNorm concept lookup, contained reference resolution, route concept lookup, dosage parsing, dynamic type concept from `basedOn`/`partOf`, stop_reason extraction (truncated to 20 chars). Status: stale (2022).
- **ETL-German-FHIR-Core** (OHDSI, Java) — `MedicationStatementMapper.java` (965 lines). ATC vocabulary, dose form and route mapping, Range mean quantity, fan-out per dosage entry. Pre-indexes Medication resources via `medication_id_map`. Type concept: CONCEPT_CLAIM (32817). Status: maintained.
- **This project** — `src/mapper/medication-statement.ts` (75 lines). Status filtering, inline medication only, `dateAsserted` fallback, dosage parsing.

## Status in This Project

- `src/mapper/medication-statement.ts` — MedicationStatement mapper (75 lines). Status filtering, inline medication only, `dateAsserted` fallback chain, dosage parsing.
- `drug_concept_id` is hardcoded to `0` (no vocabulary lookup).
- `route_concept_id` is hardcoded to null (source value only).
- `medicationReference` resolution is not implemented.
- Dynamic type concept based on `basedOn`/`partOf` is not implemented (uses static 44787730).

## Related Resources

- `../MedicationRequest/` — prescription/order stage.
- `../MedicationDispense/` — pharmacy dispensing stage.
- `../MedicationAdministration/` — inpatient administration stage.
- `../Medication/` — vocabulary/codeable concept resource (not an event).
