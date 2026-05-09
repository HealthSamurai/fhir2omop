# Immunization → OMOP Mapping

FHIR `Immunization` records vaccine administrations. In OMOP, immunizations are stored in `drug_exposure` -- there is no dedicated immunization table. Immunization records are distinguished from other drug exposures by having a `drug_concept_id` that maps to the CVX (vaccine) vocabulary. Some implementations also recognize SNOMED and ATC vaccine codes.

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `drug_exposure` | One row per vaccination event | Yes |
| `observation` | Only when concept domain is "Observation" instead of "Drug" (ETL-German routing) | Conditional |

## Mapping Strategy

1. **Single-event model.** Immunizations are point-in-time events: `drug_exposure_start_date = drug_exposure_end_date`. No duration, no `days_supply`, no `refills`.

2. **Vaccine code vocabulary.** `Immunization.vaccineCode` primarily uses CVX codes in US implementations. European implementations (ETL-German) use ATC and SNOMED. The vaccine code must be resolved to an OMOP standard concept. CVX concepts are loaded into the OMOP vocabulary tables via Athena. When multiple `vaccineCode.coding[]` entries are present, implementations pick the first recognized vocabulary (ETL-German prefers ATC over SNOMED; omoponfhir takes the first match).

3. **Status filtering.** Only `completed` immunizations should be mapped. `entered-in-error` records must be skipped. `not-done` records are skipped by most implementations (ETL-German, FhirToCdm), though omoponfhir writes them with a `stop_reason`. The `occurrenceString` variant (instead of `occurrenceDateTime`) cannot be mapped because `drug_exposure_start_date` is NOT NULL.

4. **Type concept divergence.** Implementations disagree on `drug_type_concept_id`: 38000179 (Physician administered drug) vs 32817 (EHR) vs 32818 (EHR administration record). The OMOP community is migrating toward 32817 (EHR). When `Immunization.primarySource = false`, consider 44787730 (Patient Self-Reported).

5. **Lot number.** `Immunization.lotNumber` → `drug_exposure.lot_number`. This is one of the few FHIR resources that maps to `lot_number` -- it is primarily designed for vaccine tracking and adverse event investigation.

6. **Route.** `Immunization.route` → `route_concept_id`. Common vaccine routes: intramuscular (IM → 4302612), subcutaneous (SC → 4302357), oral (PO → 4132161), nasal inhalation (NASINHL → 4262914).

7. **Domain routing.** ETL-German checks the resolved concept's `domain_id`. If the concept maps to the "Observation" domain (uncommon for CVX, possible for certain SNOMED codes), the record is routed to the `observation` table instead of `drug_exposure`.

8. **Reference resolution.** Three references must be resolved: `patient` → `person_id` (required -- skip record if unresolvable), `encounter` → `visit_occurrence_id` (optional -- null if unresolvable), `performer[0].actor` → `provider_id` (optional). The HL7 IG FML comments out all three reference resolutions as TODOs.

## Per-Table Docs

- [drug_exposure](./drug_exposure.md) -- Immunization → drug_exposure field mapping, vocabulary mappings, edge cases, implementation comparison

## Reference Implementations

- **fhir-omop-ig** (HL7) -- Normative IG; FML at `refs/refs/fhir-omop-ig/input/maps/ImmunizationMap.fml` (54 lines). Maps vaccineCode, occurrence, doseQuantity, route, lotNumber. Comments out person_id, encounter, and performer. Status: draft.
- **omoponfhir** (Georgia Tech, Java) -- Bidirectional; `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopImmunization.java` (641 lines). Most complete field coverage: CVX vocabulary filter, lot number, route, dose quantity, notes→sig, status/stop_reason, performer→provider_id. Uses 38000179 (Physician administered) as type concept. Status: stale (2022).
- **ETL-German-FHIR-Core** (OHDSI, Java) -- `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ImmunizationMapper.java` (771 lines). ATC/SNOMED vaccine codes (German MII profiles). Domain routing (Drug vs Observation). Date-aware concept lookup. SNOMED compound code splitting. No lot_number or performer mapping. Uses 32817 (EHR) as type concept. Status: maintained.
- **FhirToCdm** (OHDSI, C#) -- `refs/refs/FhirToCdm/FhirToCdmMappings.cs` `CreateDrugExposure()` lines 376-404. Minimal mapping: resolves person_id, looks up vaccine code, sets type=32817, links encounter. No lot_number, route, dose, or performer. Status: low activity.
- **mends-on-fhir** (Whistle, OMOP→FHIR) -- `refs/refs/mends-on-fhir/whistle-mappings/synthea/whistle-functions/Drug_Exposure.wstl` lines 250-349. Reverse direction. Routes CVX drug_exposures to FHIR Immunization (line 15-16). Maps lot_number, route, dose, status from stop_reason. Status: maintained.
- **fhir-x-omop** (Python, OMOP→FHIR) -- `refs/refs/fhir-x-omop/fhir_x_omop/to_fhir/immunization.py` (73 lines). Reverse direction. Hardcoded route code mapping (IM, SC, PO, NASINHL). Maps lot_number, dose, provider. Status: early WIP.

## Status in This Project

Not yet implemented. No `src/mapper/immunization.ts` exists. No `Immunization` type definition in `src/types/fhir.ts`. Implementation should add an `Immunization` interface to the FHIR types and create the mapper following the patterns established by existing mappers.
