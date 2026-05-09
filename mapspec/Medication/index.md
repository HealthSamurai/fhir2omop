# Medication Resources → OMOP Mapping

Four FHIR medication resources converge onto a single OMOP table: `drug_exposure`. They represent different stages of the medication lifecycle — prescription, dispensing, administration, and patient self-report. Each resource type produces one `drug_exposure` row per medication event, distinguished by `drug_type_concept_id`.

## Source FHIR Resources

| FHIR Resource | Lifecycle Stage | OMOP type_concept_id |
|---|---|---|
| `MedicationRequest` | Prescription/order | 38000177 (Prescription written) |
| `MedicationDispense` | Pharmacy dispensing | 38000175 (Prescription dispensed) |
| `MedicationAdministration` | Inpatient administration | 38000179 (Physician administered drug) |
| `MedicationStatement` | Patient self-report | 44787730 (Patient Self-Reported Medication) |

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `drug_exposure` | One row per medication event | Yes |
| `drug_era` | Derived: continuous drug exposure periods | No — computed post-ETL |
| `dose_era` | Derived: continuous dose periods | No — computed post-ETL |

## Mapping Strategy

1. **Medication resolution.** `medication[x]` can be a CodeableConcept (inline code) or a Reference to a Medication resource. If Reference, the Medication resource must be resolved to extract the code. RxNorm is the standard OMOP drug vocabulary (US); ATC is used in European data (ETL-German). omoponfhir resolves contained references; fhir-to-omop-demo uses a merge phase for external references; most implementations skip references and handle inline codes only. See [drug_exposure.md](./drug_exposure.md#medication-resolution).

2. **Vocabulary lookup.** The `drug_concept_id` requires mapping FHIR medication codes (RxNorm, ATC, NDC, SNOMED) to OMOP standard concepts via the OMOP vocabulary tables. Route codes (SNOMED → OMOP Route domain) also require lookup. Only omoponfhir and ETL-German perform runtime concept lookups; FhirToCdm uses pre-built vocabulary files; this project and others use placeholder `0`.

3. **Date handling.** Each resource type has a different date field:
   - `MedicationRequest.authoredOn` → start date (end date from `dispenseRequest.validityPeriod.end`)
   - `MedicationDispense.whenHandedOver` → start date
   - `MedicationAdministration.effectiveDateTime` or `effectivePeriod` → start/end
   - `MedicationStatement.effectiveDateTime` or `effectivePeriod` → start/end (fallback: `dateAsserted`)

   When end date is absent, all implementations use start date as fallback. FhirToCdm derives dates from the linked VisitOccurrence. NACHC falls back to encounter start date.

4. **Dosage parsing.** FHIR dosage instructions are complex (`dosage[].doseAndRate[].doseQuantity`, `timing`, `route`, `method`). OMOP captures only: `quantity` (dose per administration), `days_supply`, `sig` (free-text instructions), `route_concept_id`. Most implementations extract dose quantity and route, ignoring timing complexity. ETL-German creates one `drug_exposure` row per dosage entry (fan-out); others take the first dosage only.

5. **Days supply.** Not directly available in FHIR. Can be calculated from `MedicationRequest.dispenseRequest.expectedSupplyDuration` or inferred from quantity / daily dose. This project converts UCUM duration units (d, wk, mo, a, h). No reference implementation populates this field.

6. **Refills.** `MedicationRequest.dispenseRequest.numberOfRepeatsAllowed` → `refills`. omoponfhir reads this from the dispenseRequest block. Only applicable to MedicationRequest.

7. **Status and intent filtering.** Not all FHIR resources should produce drug_exposure rows. `entered-in-error` should always be skipped. This project also skips `stopped`, `on-hold`, `draft`, and `unknown` statuses. For MedicationRequest, non-order intents (`proposal`, `plan`) are filtered out. omoponfhir maps all statuses and intents except `entered-in-error`.

8. **Type concept selection.** The `drug_type_concept_id` distinguishes the data source. omoponfhir dynamically adjusts: if a MedicationStatement has `basedOn` referencing a MedicationRequest, it uses 38000177 instead of 44787730. ETL-German and FhirToCdm use a universal 32817 (EHR). fhir-to-omop-demo uses newer concepts: 32838 (EHR prescription) and 32818 (EHR administration record).

## Per-Table Docs

- [drug_exposure](./drug_exposure.md) — Medication resources → drug_exposure field mapping, vocabulary mappings, reference resolution, edge cases, implementation comparison

## Reference Implementations

- **fhir-omop-ig** (HL7) — Normative IG; FML at `refs/refs/fhir-omop-ig/input/maps/medication.fml` (46 lines). Maps MedicationStatement only. Minimal: drug concept, dates, type, stop_reason. `person_id` and `drug_exposure_id` are commented-out TODOs. Status: draft.
- **omoponfhir-omopv5-r4-mapping** (Georgia Tech, Java) — Bidirectional; `OmopMedicationStatement.java` (983 lines), `OmopMedicationRequest.java` (746 lines). Most complete: RxNorm concept lookup, contained reference resolution, route concept lookup, dosage parsing (quantity + unit), dynamic type concept from basedOn/partOf, stop_reason extraction. Status: stale (2022).
- **FhirToCdm** (OHDSI, C#) — `refs/refs/FhirToCdm/FhirToCdmMappings.cs` `CreateDrugExposure()` (lines 310-405). MedicationRequest + Immunization. Uses vocabulary file lookup. Derives dates from VisitOccurrence. Sig from dosageInstruction text. Status: low activity.
- **ETL-German-FHIR-Core** (OHDSI, Java) — `MedicationStatementMapper.java` (965 lines), `MedicationMapper.java` (274 lines), `MedicationAdministrationMapper.java`. ATC vocabulary, dose form and route mapping, Range mean quantity, fan-out per dosage entry. Pre-indexes Medication resources via `medication_id_map`. Status: maintained.
- **fhir-to-omop-demo** (jq) — `MedicationRequest.jq` (81 lines), `MedicationAdministration.jq` (59 lines), `Medication.jq` (71 lines). Notable for two-phase merge approach: partial rows from Medication and MedicationRequest are joined by ID. Pre-computed vocabulary concepts. Uses newer type concept IDs (32838, 32818). Status: maintained.
- **fhir-x-omop** (Python) — `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/drug_exposure.py` (54 lines). Immunization only. Hardcoded concept_id = 0. Route source value map (IM/SC/PO/NASINHL). Status: early WIP.
- **NACHC-fhir-to-omop** (Java, DSTU3) — `MedicationRequestParser.java` (155 lines). Parses medication code, status, intent, dates. Falls back to encounter start date when `authoredOn` is null. Status: active.

## Status in This Project

Partially implemented:
- `src/mapper/medication.ts` — MedicationRequest mapper (93 lines). Status/intent filtering, inline medication only, days_supply from expectedSupplyDuration, refills, sig, route source value.
- `src/mapper/medication-statement.ts` — MedicationStatement mapper (75 lines). Status filtering, inline medication only, dateAsserted fallback, dosage parsing.
- MedicationDispense and MedicationAdministration are not yet implemented.
- `drug_concept_id` is hardcoded to 0 (no vocabulary lookup).
- `route_concept_id` is hardcoded to null (source value only).
- `medicationReference` resolution is not implemented (returns null).
