# Procedure → OMOP Mapping

FHIR `Procedure` represents surgical, diagnostic, and therapeutic procedures performed on a patient. It maps primarily to `procedure_occurrence`, though domain routing may redirect some coded procedures to `drug_exposure`, `device_exposure`, `measurement`, or `observation` based on the concept's `domain_id` in the OMOP vocabulary.

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `procedure_occurrence` | One row per procedure event | Yes (primary target) |
| `drug_exposure` | If procedure code has Drug domain | Conditional -- vocabulary-dependent |
| `device_exposure` | If procedure involves a device (`usedCode`) | Conditional -- ETL-German creates rows from `Procedure.usedCode` |
| `observation` | If procedure code has Observation domain | Conditional -- vocabulary-dependent |
| `measurement` | If procedure code has Measurement domain | Conditional -- vocabulary-dependent |

## Mapping Strategy

1. **Domain routing.** Some SNOMED/CPT/OPS procedure codes have `domain_id` != Procedure in the OMOP vocabulary (e.g., Drug, Observation, Measurement). A full implementation looks up the standard concept's domain and routes accordingly. ETL-German is the most comprehensive, routing to `procedure_occurrence`, `observation`, `measurement`, and `drug_exposure`. NACHC additionally routes to `condition_occurrence`. The HL7 IG and omoponfhir do not implement domain routing.

2. **Date handling.** `performed[x]` is polymorphic: `performedDateTime` or `performedPeriod`. For `performedDateTime`, the date part goes to `procedure_date`/`procedure_datetime`; end date is either the same date (NACHC) or null (ETL-German). For `performedPeriod`, `start` maps to `procedure_date`/`procedure_datetime` and `end` maps to `procedure_end_date`/`procedure_end_datetime`. OMOP requires at least `procedure_date` -- skip the resource if no date is available.

3. **Status filtering.** Recommended: only `completed` procedures should produce rows. ETL-German is more permissive, accepting `in-progress`, `on-hold`, `completed`, and `unknown`. Statuses `not-done`, `entered-in-error`, `stopped`, and `preparation` should always be skipped. omoponfhir does not filter by status at all.

4. **Body site.** `Procedure.bodySite` → `modifier_concept_id`. Requires SNOMED body site → OMOP concept lookup. Take first `bodySite[0]` entry; remaining entries are lost. ETL-German additionally handles German OPS site localization extensions. Most implementations (omoponfhir, FhirToCdm, HL7 IG) do not map body site at all.

5. **Provider.** `Procedure.performer[].actor` -- iterate performers and take the first Practitioner-typed reference for `provider_id`. Ignore non-Practitioner performers (Organization, Device, etc.). NACHC defaults `provider_id` to 1 when absent.

6. **Vocabulary mapping.** Procedure codes come from multiple vocabularies: SNOMED CT (preferred, direct standard concepts), CPT-4 (US billing, standard in OMOP), ICD-10-PCS (US inpatient, non-standard -- requires Maps-to relationship), OPS (German, requires custom lookup), and HCPCS. When multiple `code.coding` entries exist, implementations differ: ETL-German selects by vocabulary priority (OPS > DICOM > SNOMED), FhirToCdm creates one row per coding, HL7 IG takes the first coding.

7. **Device exposure from usedCode.** ETL-German is the only implementation that creates `device_exposure` rows from `Procedure.usedCode` codings. Other implementations ignore this field entirely.

## Per-Table Docs

- [procedure_occurrence](./procedure_occurrence.md) -- Procedure → procedure_occurrence field mapping, vocabulary mappings, reference resolution, edge cases, implementation comparison

## Reference Implementations

- **fhir-omop-ig** (HL7) -- Normative IG; FML at `refs/refs/fhir-omop-ig/input/maps/Procedure.fml` (29 lines). Maps `code` and `performed[x]` only. `procedure_occurrence_id` and `person_id` are commented-out TODOs. No status filtering, no body site, no provider, no domain routing. Status: draft.
- **omoponfhir** (Georgia Tech, Java) -- Bidirectional; `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopProcedure.java` (515 lines). `constructOmop()` handles code concept lookup, person, encounter, performer (with specialty update), and performed date. Uses type concept 44786630 (Primary Procedure). No status filtering, no body site, no domain routing. Status: stale (2022).
- **FhirToCdm** (OHDSI, C#) -- `refs/refs/FhirToCdm/FhirToCdmMappings.cs` `CreateProcedureOccurrence()` (lines 407-451). Creates one row per `code.coding`. Uses type concept 32817 (EHR). Checks domain for Measurement routing. Always casts `performed` to Period (fails for `performedDateTime`). Status: low activity.
- **ETL-German-FHIR-Core** (OHDSI, Java) -- `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ProcedureMapper.java` (1140 lines). Most complete implementation: OPS/SNOMED/DICOM vocabulary support, full domain routing (Procedure/Observation/Measurement/Drug), body site + OPS localization extension, device exposure from `usedCode`, status filtering, incremental updates with delete-and-reinsert. German MII profile-specific. Status: maintained.
- **NACHC-fhir-to-omop** (Java, DSTU3) -- `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/procedure/OmopProcedureBuilder.java` (136 lines). Domain routing to Procedure/Measurement/Observation/Condition. Uses DB-backed concept mapper. Defaults: `provider_id=1`, `quantity=1`, `modifier_concept_id=0`. DSTU3 (not R4). Status: active.
- **fhir-x-omop** (Python) -- `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/procedure_occurrence.py` (34 lines). Minimal mapper with all concept_ids hardcoded to 0. Handles `performedDateTime` only (no Period). Status: early WIP.
- **HealthcareLakeETL** (PySpark) -- `refs/refs/HealthcareLakeETL/mappings/procedure_occurrence.py` (44 lines). PySpark column-level transformation. Period.start only. No concept mapping. Status: abandoned.

## Status in This Project

Not yet implemented. No `src/mapper/procedure.ts` exists.
