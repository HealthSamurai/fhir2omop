# MedicationAdministration → OMOP Mapping

`MedicationAdministration` represents the **inpatient administration stage** of the medication lifecycle — a clinician giving a medication dose to a patient. It carries the richest route and dose-event timing information of the four medication resources.

## Source FHIR Resource

| FHIR Resource | Lifecycle Stage | OMOP target | OMOP type_concept_id |
|---|---|---|---|
| `MedicationAdministration` | Inpatient administration | `drug_exposure` | 38000179 (Physician administered drug) |

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `drug_exposure` | One row per administration event | Yes |
| `drug_era` | Derived: continuous drug exposure periods | No — computed post-ETL |
| `dose_era` | Derived: continuous dose periods | No — computed post-ETL |

## Mapping Strategy

1. **Date handling.** `effectiveDateTime` (point in time) → start = end. `effectivePeriod.start` / `effectivePeriod.end` → start / end. omoponfhir's general rule: when `effectiveDateTime` is used, end = start.
2. **Dosage / quantity.** `dosage.dose.value` → OMOP `quantity`. ETL-German computes the mean of a `Range` if `doseRange` is used. ETL-German fans out one `drug_exposure` row per dosage entry (although MedicationAdministration has a single `dosage`).
3. **Route.** `dosage.route` → `route_concept_id` via SNOMED → OMOP Route domain lookup. MedicationAdministration carries the most reliable real-world route data among the four event resources.
4. **Provider.** `performer[0].actor` → `provider_id`.
5. **Visit.** `context` → `visit_occurrence_id`.
6. **Medication resolution.** Same strategies as MedicationRequest. See `../Medication/index.md`.
7. **Type concept.** Constant `38000179` ("Physician administered drug"). fhir-to-omop-demo uses `32818` (EHR administration record). FhirToCdm/ETL-German use `32817` (EHR / CLAIM) universally.

## Per-Table Docs

- [drug_exposure](./drug_exposure.md) — MedicationAdministration → drug_exposure field mapping. Shared OMOP columns link to `../MedicationRequest/drug_exposure.md`.

## Reference Implementations

- **ETL-German-FHIR-Core** (OHDSI, Java) — `MedicationAdministrationMapper.java`. ATC vocabulary, dose form and route mapping, Range mean quantity, fan-out per dosage entry. Pre-indexes Medication resources via `medication_id_map`. Status: maintained.
- **fhir-to-omop-demo** (jq) — `MedicationAdministration.jq` (59 lines). `drug_type_concept_id = 32818` (EHR administration record). Pre-computed vocabulary concepts. Status: maintained.

Other implementations (omoponfhir, FhirToCdm, NACHC, HL7 IG, this project) do NOT cover MedicationAdministration.

## Status in This Project

Not yet implemented. Listed in `mapspec/Medication/index.md` (legacy) "Status in This Project" as a planned mapper. `route_concept_id` lookup and dosage parsing helpers from `src/mapper/medication.ts` would be reusable.

## Related Resources

- `../MedicationRequest/` — prescription/order stage.
- `../MedicationDispense/` — pharmacy dispensing stage.
- `../MedicationStatement/` — patient self-report stage.
- `../Medication/` — vocabulary/codeable concept resource (not an event).
