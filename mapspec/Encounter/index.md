# Encounter → OMOP Mapping

FHIR `Encounter` represents a patient interaction with a healthcare provider. It maps primarily to `visit_occurrence` — the OMOP anchor for linking clinical events to a specific care context. Every OMOP event table (`condition_occurrence`, `measurement`, `drug_exposure`, etc.) carries a `visit_occurrence_id` foreign key, making Encounter processing a prerequisite for all downstream mappings.

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `visit_occurrence` | One row per encounter (inpatient stay, outpatient visit, ER visit) | Yes |
| `visit_detail` | Sub-encounters: transfers, department moves within a parent visit | Optional — only when `Encounter.partOf` or internal transfers present |

## Mapping Strategy

The Encounter → visit_occurrence mapping is straightforward for simple cases but has several non-trivial aspects:

1. **Visit type classification.** FHIR `Encounter.class` uses the ActEncounterCode value set (`IMP`, `AMB`, `EMER`, `HH`, etc.) which must map to OMOP visit concepts (9201 Inpatient, 9202 Outpatient, 9203 ER, 581476 Home Visit). The mapping is a small lookup table with 9–12 entries, and every implementation agrees on the core four. Edge codes (`SS`, `OBSENC`, `FLD`, `VR`) are less standardized — our implementation routes them all to 9202 (Outpatient); ETL-German has a different table.

2. **Status filtering.** OMOP has no concept of a cancelled or planned visit. Only `finished` and `in-progress` encounters should produce `visit_occurrence` rows. Planned/cancelled encounters are dropped. Some implementations (omoponfhir) don't filter at all because they serve bidirectionally.

3. **Date handling.** `Encounter.period.start` → `visit_start_date`/`visit_start_datetime`. If `period.end` is absent (ongoing encounter), `visit_end_date` = `visit_start_date` is the common convention. OMOP requires both start and end dates.

4. **Admit/discharge.** `hospitalization.admitSource` → `admitted_from_concept_id` and `hospitalization.dischargeDisposition` → `discharged_to_concept_id` require vocabulary lookup (SNOMED/HL7 discharge codes → OMOP concepts). Our current implementation leaves these at 0; omoponfhir and ETL-German map them.

5. **Nested encounters.** FHIR `Encounter.partOf` links child encounters to a parent. OMOP models this via `visit_detail` (child) → `visit_occurrence` (parent), plus `visit_detail.visit_detail_parent_id` for multi-level nesting. Our implementation does not yet handle `visit_detail`. ETL-German is the most complete reference for department transfers.

6. **Provider resolution.** `Encounter.participant[].individual` → `provider_id`. Multiple participants are common (admitting physician, attending, consulting). OMOP has a single `provider_id` — take the first participant with a `Practitioner` reference.

## Per-Table Docs

- [visit_occurrence](./visit_occurrence.md) — Encounter → visit_occurrence field mapping

## Reference Implementations

- **fhir-omop-ig** (HL7) — FML at `refs/refs/fhir-omop-ig/input/maps/EncounterVisit.fml` (44 lines). Maps class→visit_concept_id, period→dates. Minimal; no hospitalization details.
- **omoponfhir** (Georgia Tech, Java) — `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopEncounter.java` (425 lines). Bidirectional. Supports visit_detail via `partOf`, hospitalization mapping, multiple class codes.
- **FhirToCdm** (OHDSI, C#) — `refs/refs/FhirToCdm/FhirToCdmMappings.cs` `CreateVisitOccurrence()`. Minimal F→O.
- **ETL-German-FHIR-Core** (Java) — `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/EncounterDepartmentCaseMapper.java` (706 lines). German encounter classification, department transfers via visit_detail, incremental updates.
- **NACHC-fhir-to-omop** (Java) — `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/encounter/EncounterParser.java` (70 lines). Encounter parsing into visit_occurrence.
- **fhir-to-omop-demo** (jq) — `refs/refs/fhir-to-omop-demo/demo/translate/map/Encounter.jq` (146 lines). Lightweight jq transform.
- **fhir-x-omop** (Python) — `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/visit_occurrence.py` (89 lines). Bidirectional with lossless round-trip.
- **omopfhirmap** (Java) — `refs/refs/omopfhirmap/src/main/java/com/canehealth/omopfhirmap/mapping/EncounterMapper.java`. Bidirectional.

## Status in This Project

Implemented: `src/mapper/encounter.ts` (58 lines). Maps class→visit_concept_id (9 codes), period→dates, participant→provider_id, serviceProvider→care_site_id. Does not handle hospitalization details, visit_detail, or admit/discharge concepts.
