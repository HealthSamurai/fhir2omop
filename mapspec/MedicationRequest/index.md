# MedicationRequest → OMOP Mapping

`MedicationRequest` represents the **prescription/order stage** of the medication lifecycle. It is the richest of the four FHIR medication-event resources for OMOP purposes because it carries dispense, refill, and supply-duration metadata that the other three lack.

## Source FHIR Resource

| FHIR Resource | Lifecycle Stage | OMOP target | OMOP type_concept_id |
|---|---|---|---|
| `MedicationRequest` | Prescription/order | `drug_exposure` | 38000177 (Prescription written) |

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `drug_exposure` | One row per prescription event | Yes |
| `drug_era` | Derived: continuous drug exposure periods | No — computed post-ETL |
| `dose_era` | Derived: continuous dose periods | No — computed post-ETL |

## Mapping Strategy

1. **Status / intent filtering.** `entered-in-error` should always be skipped. This project also skips `stopped`, `on-hold`, `draft`, and `unknown`. Non-order intents (`proposal`, `plan`) are filtered out — only `order`, `original-order`, `reflex-order`, `filler-order`, `instance-order` produce rows. omoponfhir maps all statuses and intents except `entered-in-error`.

2. **Medication resolution.** `medication[x]` can be a CodeableConcept (inline code) or a Reference to a Medication resource. omoponfhir resolves contained `#`-references; fhir-to-omop-demo merges by ID in a post-processing phase; this project and most others handle inline codes only. RxNorm is the standard OMOP drug vocabulary (US); ATC is used in European data. See [`drug_exposure.md`](./drug_exposure.md#medication-resolution) and `../Medication/index.md` for resolution strategies.

3. **Vocabulary lookup.** The `drug_concept_id` requires mapping FHIR medication codes (RxNorm, ATC, NDC, SNOMED) to OMOP standard concepts via the OMOP vocabulary tables. Route codes (SNOMED → OMOP Route domain) also require lookup. Only omoponfhir performs runtime concept lookups for MedicationRequest; FhirToCdm uses pre-built vocabulary files; this project uses placeholder `0`.

4. **Date handling.** `authoredOn` → `drug_exposure_start_date`. `dispenseRequest.validityPeriod.end` → `drug_exposure_end_date` (fallback to start date when absent). FhirToCdm derives dates from the linked VisitOccurrence. NACHC falls back to encounter start date when `authoredOn` is null.

5. **Dosage parsing.** OMOP captures only: `quantity` (dose per administration), `days_supply`, `sig` (free-text instructions), `route_concept_id`. Most implementations extract dose quantity and route from the first `dosageInstruction[]`, ignoring timing complexity.

6. **Days supply.** Calculated from `MedicationRequest.dispenseRequest.expectedSupplyDuration`. This project converts UCUM duration units (h, d, wk, mo, a). No reference implementation populates this field.

7. **Refills.** `MedicationRequest.dispenseRequest.numberOfRepeatsAllowed` → `refills`. omoponfhir reads this from the `dispenseRequest` block. Only applicable to MedicationRequest.

8. **Type concept.** Constant `38000177` ("Prescription written"). fhir-to-omop-demo uses 32838 (EHR prescription); FhirToCdm and ETL-German use 32817 (EHR / CLAIM).

## Per-Table Docs

- [drug_exposure](./drug_exposure.md) — MedicationRequest → drug_exposure field mapping, vocabulary mappings, reference resolution, edge cases.

## Reference Implementations

- **omoponfhir-omopv5-r4-mapping** (Georgia Tech, Java) — `OmopMedicationRequest.java` (746 lines). Most complete: RxNorm concept lookup, contained reference resolution, route concept lookup, dosage parsing, dispense-request fallback for refills/quantity, provider from `recorder`. Status: stale (2022).
- **FhirToCdm** (OHDSI, C#) — `FhirToCdmMappings.cs` `CreateDrugExposure()` (lines 310-405, MedicationRequest branch lines 322-373). Vocabulary file lookup. Dates derived from VisitOccurrence. Sig from `dosageInstruction[0].text`. Status: low activity.
- **fhir-to-omop-demo** (jq) — `MedicationRequest.jq` (81 lines). Two-phase merge approach: partial rows from MedicationRequest are joined with partial rows from `Medication.jq` by ID. Pre-computed vocabulary concepts. Type concept `32838` (EHR prescription). Status: maintained.
- **NACHC-fhir-to-omop** (Java, DSTU3) — `MedicationRequestParser.java` (155 lines). Parses medication code, status, intent, dates. Falls back to encounter start date when `authoredOn` is null. Status: active.

## Status in This Project

- `src/mapper/medication.ts` — MedicationRequest mapper (93 lines). Implements: status/intent filtering, inline medication only, days_supply from `expectedSupplyDuration`, refills, sig, route source value.
- `drug_concept_id` is hardcoded to `0` (no vocabulary lookup).
- `route_concept_id` is hardcoded to null (source value only).
- `medicationReference` resolution is not implemented (returns null).

## Related Resources

- `../MedicationDispense/` — pharmacy dispensing stage.
- `../MedicationAdministration/` — inpatient administration stage.
- `../MedicationStatement/` — patient self-report stage.
- `../Medication/` — vocabulary/codeable concept resource (not an event).
