# MedicationDispense → OMOP Mapping

`MedicationDispense` represents the **pharmacy dispensing stage** of the medication lifecycle — the act of supplying medication in response to a prescription.

## Source FHIR Resource

| FHIR Resource | Lifecycle Stage | OMOP target | OMOP type_concept_id |
|---|---|---|---|
| `MedicationDispense` | Pharmacy dispensing | `drug_exposure` | 38000175 (Prescription dispensed in pharmacy) |

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `drug_exposure` | One row per dispense event | Yes |
| `drug_era` | Derived: continuous drug exposure periods | No — computed post-ETL |
| `dose_era` | Derived: continuous dose periods | No — computed post-ETL |

## Mapping Strategy

1. **Date handling.** `whenHandedOver` → `drug_exposure_start_date` (fallback: `whenPrepared`). End date computed from `daysSupply` + start, or fallback to start date.
2. **Quantity.** `quantity` → OMOP `quantity` directly (the dispensed amount).
3. **Provider.** `performer[0].actor` → `provider_id`.
4. **Medication resolution.** Same strategies as MedicationRequest (inline `medicationCodeableConcept`, contained reference, external reference). Most implementations handle inline only. See `../Medication/index.md`.
5. **Type concept.** Constant `38000175` ("Prescription dispensed in pharmacy"). FhirToCdm and ETL-German use 32817 (EHR / CLAIM) universally.

## Per-Table Docs

- [drug_exposure](./drug_exposure.md) — MedicationDispense → drug_exposure field mapping. Shared OMOP columns link to `../MedicationRequest/drug_exposure.md`.

## Reference Implementations

**No reviewed reference implementation has full MedicationDispense → drug_exposure coverage.** This is a known gap across the FHIR-to-OMOP ecosystem:

- **omoponfhir-omopv5-r4-mapping** — implements MedicationRequest and MedicationStatement, not MedicationDispense.
- **FhirToCdm** — implements MedicationRequest and Immunization, not MedicationDispense.
- **ETL-German-FHIR-Core** — implements MedicationStatement and MedicationAdministration, not MedicationDispense.
- **fhir-to-omop-demo** — implements MedicationRequest and MedicationAdministration, not MedicationDispense.
- **NACHC** — MedicationRequest only.
- **HL7 IG FML** (`refs/refs/fhir-omop-ig/input/maps/medication.fml`) — MedicationStatement only.
- **This project** — not yet implemented.

See [`drug_exposure.md`](./drug_exposure.md) for the field map and TODO notes.

## Status in This Project

Not yet implemented. Listed in `mapspec/Medication/index.md` (legacy) "Status in This Project" as a planned mapper.
