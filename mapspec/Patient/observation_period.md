# Patient → observation_period

OMOP CDM v5.4. The `observation_period` table defines spans during which a person is observable — i.e., absence of records means absence of events. This is **not** a direct field-level mapping from `Patient`; it is **derived per-person** from data availability.

`Patient` itself contains no observation-period information. The Patient mapper either:
1. Skips this table (most implementations), or
2. Emits a placeholder/full-window row at person-creation time, with end dates fixed up by a post-processing pass.

## Why this is in the Patient pack

`observation_period` requires a `person_id` and is logically owned by Patient creation. Most ETLs cannot defer it because OMOP cohort tools (Atlas, Hades) require a non-empty `observation_period` to consider a person eligible for any analysis.

## Field Mapping

There is no FHIR Patient field that drives `observation_period`. All values are either generated, derived from Bundle-level event scanning, or fixed.

| OMOP Field | Type | Required | Source |
|---|---|---|---|
| `observation_period_id` | integer | Yes (PK) | Sequence/hash |
| `person_id` | integer | Yes (FK PERSON) | Same as `person.person_id` |
| `observation_period_start_date` | date | Yes | Earliest event date for this person across all OMOP tables, OR fixed start, OR Patient registration date |
| `observation_period_end_date` | date | Yes | Latest event date OR fixed end, OR `min(today, deceasedDate)` |
| `period_type_concept_id` | integer (FK CONCEPT.Type Concept) | Yes | Default `44814724` ("Period covering healthcare encounters") — used by NACHC |

## Strategies

### Strategy A: Wide fixed window (NACHC)

Write `1900-01-01` to `2100-01-01` at person-creation time. Trades correctness for simplicity — every person is eligible for every cohort regardless of data sparsity, which is wrong but avoids implementation complexity.

```java
// refs/refs/NACHC-fhir-to-omop/.../WriteOmopPersonToDatabase.java lines 69-82
dvo.setObservationPeriodStartDate(TimeUtil.getDateForYyyy_Mm_Dd("1900-01-01"));
dvo.setObservationPeriodEndDate(TimeUtil.getDateForYyyy_Mm_Dd("2100-01-01"));
dvo.setPeriodTypeConceptId(44814724);
```

### Strategy B: Min/max over events (FhirToCdm, ETL-German)

After all event tables are written, compute per-person `min(start_date)` and `max(end_date)` across `visit_occurrence`, `condition_occurrence`, `drug_exposure`, `procedure_occurrence`, `measurement`, `observation`, `device_exposure`. Optionally with a gap-merging policy (FhirToCdm uses a configurable `gap` parameter to split into multiple periods when there are large data gaps).

```csharp
// refs/refs/FhirToCdm/CdmPersonBuilder.cs ~lines 463-475
public virtual IEnumerable<ObservationPeriod> BuildObservationPeriods(int gap, EraEntity[] observationPeriods)
```

ETL-German runs this as a SQL post-processing step:

```sql
-- refs/refs/ETL-German-FHIR-Core/src/main/resources/post_processing/post_process_observation_period.sql
```

### Strategy C: Use bundle-level Period (rare)

If the source FHIR Bundle includes a `meta.period` or a `Provenance` resource describing the data window, use that. No surveyed implementation actually does this for Patient.

### Strategy D: Skip (omoponfhir, omopfhirmap, fhir-to-omop-demo, fhir-x-omop)

Don't populate `observation_period`. Cohort tooling will treat the person as having zero observable time.

## Edge Cases

| Case | Handling |
|---|---|
| Person has zero events | Skip the row (Strategy B) or use fixed window (Strategy A) |
| Person is deceased | `observation_period_end_date = min(latest_event, death_date)` |
| Multiple disjoint observation windows (e.g., enrolled, dropped, re-enrolled) | OMOP supports multiple rows per person — Strategy B with gap parameter |
| Incremental loads | Re-derive end dates after each batch; rewrite affected rows. ETL-German does this. |
| Strict cohort hygiene | Strategy A's `1900-2100` window is **wrong** for any real analysis — correct ETLs must use Strategy B |

## period_type_concept_id

| concept_id | Name |
|---|---|
| 44814724 | Period covering healthcare encounters (NACHC default) |
| 44814723 | Period while enrolled in insurance |
| 44814725 | Period inferred by algorithm |
| 32817 | EHR (also seen in some pipelines, technically incorrect) |

## Implementation Comparison

| Project | Strategy | When written | period_type_concept_id |
|---|---|---|---|
| HL7 IG | n/a (ObservationPeriod.fsh defines fields, no FML) | — | — |
| NACHC | A — fixed `1900-2100` | Same transaction as person insert | 44814724 |
| FhirToCdm | B — min/max with gap merging | Post-processing | configurable |
| ETL-German | B — SQL post-processing | After all events loaded | derived |
| omoponfhir | D — skip | — | — |
| omopfhirmap | D — skip | — | — |
| fhir-to-omop-demo | D — skip (no `005-Patient-observation_period.sh`) | — | — |
| mends-on-fhir | n/a (reverse direction) | — | — |
| fhir-x-omop | D — skip | — | — |

## Recommendation

For a generic FHIR→OMOP mapper, **defer** observation_period derivation to a post-processing pass (Strategy B). Computing min/max requires knowing all event dates, which the per-Patient mapper does not have. If a placeholder is needed during single-pass conversion, write a row with `start = year_of_birth-01-01` (or the earliest known event) and `end = death_date or today`, then rewrite from event aggregates afterward.

Strategy A (`1900-2100`) is **not recommended** for production — it makes cohort definitions meaningless.

## Sources

- HL7 IG logical model: `refs/refs/fhir-omop-ig/input/fsh/ObservationPeriod.fsh`
- NACHC fixed-window approach: `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/write/singlepatient/WriteOmopPersonToDatabase.java` lines 69-82
- FhirToCdm gap-aware builder: `refs/refs/FhirToCdm/CdmPersonBuilder.cs` lines 463-475 (`BuildObservationPeriods`)
- ETL-German post-process SQL: `refs/refs/ETL-German-FHIR-Core/src/main/resources/post_processing/post_process_observation_period.sql` (referenced from `PostProcessTask.java` line 64)
- ETL-German wrapper: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/model/omop/ObservationPeriod.java`
- OMOP CDM v5.4 spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- OMOP Themis conventions: https://ohdsi.github.io/Themis/observation_period.html
