# Condition → OMOP Mapping

FHIR `Condition` represents diagnoses, problems, and health concerns. It maps primarily to `condition_occurrence` -- the OMOP table for clinical diagnoses linked to a person, time period, and encounter. Unlike `Patient`, which maps stably across implementations, `Condition` mapping has significant variation in onset handling, vocabulary lookup, category-to-type-concept translation, and domain routing.

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `condition_occurrence` | One row per active diagnosis/problem | Yes |
| `observation` | Domain-routed observations; severity/bodySite/stage side records | Conditional -- only with domain routing or ETL-German-style meta-info extraction |
| `procedure_occurrence` | Domain-routed procedures | Conditional -- only with domain routing |
| `measurement` | Domain-routed measurements | Conditional -- only with domain routing |
| `condition_era` | Derived: continuous periods of a condition | No -- computed post-ETL from condition_occurrence |

**Domain routing note**: Some SNOMED condition codes may have `domain_id` = Observation, Procedure, or Measurement in the OMOP vocabulary. A full vocabulary-aware implementation should route these to the appropriate table. Only ETL-German implements domain routing for Conditions (lines 921-988 of ConditionMapper.java). Our current implementation routes all Conditions to `condition_occurrence`.

## Mapping Strategy

1. **Status filtering.** FHIR Condition has two status axes: `clinicalStatus` (active/inactive/resolved) and `verificationStatus` (confirmed/refuted/entered-in-error). Only active, verified conditions should produce rows. `entered-in-error` and `refuted` are always skipped. `inactive`/`remission`/`resolved` are skipped (they represent historical state). Missing statuses are permissive -- FHIR allows omission. ETL-German and this project are the only implementations that perform status filtering; omoponfhir, FhirToCdm, NACHC, and fhir-x-omop do not filter.

2. **Onset polymorphism.** `onset[x]` can be dateTime, Period, Age, Range, or string. Only dateTime and Period.start yield a usable date. Age/Range require the patient's birthDate for calculation (ETL-German does this via ResourceOnset helper). String is free text. Fallback: `recordedDate`. If no date can be resolved at all, the condition is skipped -- `condition_start_date` is required in OMOP. Notable exception: omoponfhir uses 9999-12-31 as a sentinel date when onset is missing (line 542-546).

3. **Type concepts.** FHIR `category` distinguishes `problem-list-item` (→ 32840, "Problem list from EHR") from `encounter-diagnosis` (→ 32817, "EHR"). This distinction matters for analytics -- problem list items represent chronic/longitudinal conditions while encounter diagnoses are point-in-time. Implementation variation is high: FhirToCdm and ETL-German hardcode 32817; NACHC uses 32020; fhir-x-omop uses a different concept set (32817/32818/32819).

4. **Provider resolution.** FHIR has both `asserter` (who stated the condition) and `recorder` (who entered it). OMOP has a single `provider_id`. Strategy varies: omoponfhir uses asserter only, fhir-x-omop uses recorder only, this project prefers asserter with recorder fallback. Most implementations (FhirToCdm, ETL-German, NACHC) do not map provider at all.

5. **Vocabulary mapping.** `condition_concept_id` requires SNOMED/ICD-10 → OMOP standard concept lookup. Our implementation uses 0 as placeholder. Production ETLs need Athena vocabulary tables. omoponfhir, FhirToCdm, ETL-German, and NACHC all perform actual vocabulary lookups using concept service layers.

6. **Multiple codings and domain routing.** When `Condition.code` contains multiple coding entries (e.g., both ICD-10 and SNOMED), implementations differ: ETL-German generates separate rows per coding system and routes each to the appropriate OMOP domain table. FhirToCdm iterates all codings and creates a row per coding. Our implementation and most others select only the best coding by vocabulary priority.

## Reference Implementations

| Implementation | File Path | Lines | Language | Direction | Status |
|---|---|---|---|---|---|
| HL7 IG (FML) | `refs/refs/fhir-omop-ig/input/maps/condition.fml` | 48 | FML | F→O | Draft |
| HL7 IG (FSH model) | `refs/refs/fhir-omop-ig/input/fsh/ConditionOccurrence.fsh` | 23 | FSH | -- | Draft |
| omoponfhir | `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopCondition.java` | 620 | Java | F↔O | Stale (2022) |
| FhirToCdm | `refs/refs/FhirToCdm/FhirToCdmMappings.cs` (`CreateConditionOccurrence()` line 252) | ~55 | C# | F→O | Low activity |
| ETL-German | `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ConditionMapper.java` | 1654 | Java | F→O | Maintained |
| NACHC | `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/condition/OmopConditionOccurrenceBuilder.java` | 66 | Java | F→O | Active |
| fhir-x-omop (F→O) | `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/condition_occurrence.py` | 46 | Python | F→O | Early WIP |
| fhir-x-omop (O→F) | `refs/refs/fhir-x-omop/fhir_x_omop/to_fhir/condition.py` | 72 | Python | O→F | Early WIP |
| This project | `src/mapper/condition.ts` | 132 | TypeScript | F→O | Active |

**Implementation highlights:**
- **HL7 IG FML** -- Maps code, onset, recordedDate, category, clinicalStatus. Minimal; person_id and encounter commented out. No status filtering.
- **omoponfhir** -- Most complete bidirectional implementation. ICD-10 and SNOMED support via ConceptService. Category-based type concepts. Asserter-based provider mapping. Uses 9999-12-31 sentinel for missing onset.
- **FhirToCdm** -- Minimal: only onsetDateTime, hardcoded type concept 32817. Iterates all code.Coding entries. Falls back to visit end date for missing abatement.
- **ETL-German** -- Most comprehensive F→O. Domain routing, ICD-10-GM diagnostic certainty, severity/bodySite/stage as separate observations, multiple codings → multiple records, Orpha code support, incremental updates, primary/secondary ICD code splitting.
- **NACHC** -- Simple mapper with DB-backed concept lookup via FhirToOmopConceptMapper. Uses non-standard type concept 32020.
- **fhir-x-omop** -- Declarative Python mapper. Uses different status concept IDs (32893/32897/32896) and type concept IDs (32817/32818/32819) than other implementations. stop_reason from note[0].text instead of abatementString.

## Status in This Project

Implemented: `src/mapper/condition.ts` (132 lines). Full status filtering (clinicalStatus + verificationStatus), onset[x] polymorphism (dateTime + Period + recordedDate fallback), category-based type concepts (32840/32817), clinicalStatus → status_concept_id (32902), asserter/recorder provider fallback, abatementString → stop_reason truncation.

Not implemented: domain routing, onsetAge/onsetRange calculation, severity/bodySite/stage → observation, multiple codings → multiple rows, vocabulary lookup (concept_id hardcoded to 0), diagnostic confidence, Orpha code support, incremental updates.
