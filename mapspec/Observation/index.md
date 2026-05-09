# Observation → OMOP Mapping

FHIR `Observation` is the most versatile clinical resource — it covers lab results, vital signs, social history, surveys, activity data, and more. In OMOP, these split into two tables based on the nature of the data: `measurement` (quantitative lab/vital results) and `observation` (qualitative findings, social history, surveys).

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `measurement` | Labs and vitals with numeric/coded results | Conditional — when category is `laboratory` or `vital-signs` |
| `observation` | Social history, surveys, activity, other clinical findings | Conditional — when category is `social-history`, `survey`, or `activity` |

## Mapping Strategy

1. **Domain routing.** The central design decision. FHIR uses a single `Observation` resource for everything; OMOP separates measurements from observations. Routing is based on `Observation.category`:
   - `laboratory`, `vital-signs` → **measurement**
   - `social-history`, `survey`, `activity` → **observation**
   - No category → **measurement** (default, since labs are most common)

   A vocabulary-aware implementation would instead look up the OMOP `domain_id` of the observation's LOINC/SNOMED code. The category-based approach is a pragmatic approximation that works for most data.

2. **Status filtering.** Only `final`, `amended`, and `corrected` observations produce rows. `preliminary`, `registered`, `cancelled`, `entered-in-error`, and `unknown` are dropped. This is stricter than some implementations (omoponfhir maps everything in bidirectional mode).

3. **Component expansion.** Observations with `component[]` (e.g., blood pressure with systolic + diastolic) are expanded: each component produces its own OMOP row. The parent observation's metadata (person, encounter, date, provider) is inherited; each component uses its own code and value. Component rows get suffixed IDs (`{id}-comp-0`, `{id}-comp-1`).

4. **Value polymorphism.** FHIR `value[x]` can be Quantity, CodeableConcept, string, boolean, integer, Range, Ratio, SampledData, time, dateTime, or Period. OMOP measurement handles Quantity (→ `value_as_number` + `unit_source_value`) and CodeableConcept (→ `value_as_concept_id`). OMOP observation additionally has `value_as_string`. Other types are captured in `value_source_value` as a verbatim string.

5. **Operator mapping.** `valueQuantity.comparator` (`<`, `<=`, `>=`, `>`) maps to `operator_concept_id` in measurement. This captures results like "<10 mg/dL".

6. **Date requirement.** `effectiveDateTime` is required — OMOP date fields are NOT NULL. `effectivePeriod` is not currently handled but could use `period.start`.

## Per-Table Docs

- [measurement](./measurement.md) — Observation (labs/vitals) → measurement
- [observation](./observation.md) — Observation (social/survey) → observation

## Reference Implementations

- **fhir-omop-ig** (HL7) — Two FML files: `refs/refs/fhir-omop-ig/input/maps/Measurement.fml` (53 lines) and `refs/refs/fhir-omop-ig/input/maps/Observation.fml` (52 lines). Separate profiles for each target table.
- **omoponfhir** (Georgia Tech, Java) — `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopObservation.java` (264 lines). Bidirectional. Category-based routing. Component support.
- **FhirToCdm** (OHDSI, C#) — `refs/refs/FhirToCdm/FhirToCdmMappings.cs` `CreateMeasurement()`. Measurement only; no observation routing.
- **ETL-German-FHIR-Core** (Java) — `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ObservationMapper.java`. Domain-based routing via vocabulary lookup. LOINC and SNOMED. Reference range handling.
- **NACHC-fhir-to-omop** (Java) — `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/`. Observation parsing.
- **fhir-to-omop-demo** (jq) — `refs/refs/fhir-to-omop-demo/demo/translate/map/Observation.jq`.
- **fhir-x-omop** (Python) — `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/measurement.py` and `observation.py`.

## Status in This Project

Implemented: `src/mapper/observation.ts` (194 lines). Category-based routing, component expansion, operator mapping, value polymorphism (Quantity, String, CodeableConcept), reference ranges, interpretation → qualifier. Does not handle effectivePeriod, specimen references, method, bodySite, or vocabulary-based domain routing.
