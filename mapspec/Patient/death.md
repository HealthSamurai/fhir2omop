# Patient.deceased[x] → death

OMOP CDM v5.4. The `death` table holds at most one row per person. A FHIR Patient with a `deceasedDateTime` produces one `death` record.

## Trigger

`Patient.deceased[x]` is a polymorphic field with two variants:

| FHIR variant | Type | Behavior |
|---|---|---|
| `Patient.deceasedBoolean = true` | boolean | Person is deceased but date unknown — **cannot create death row** (see below) |
| `Patient.deceasedBoolean = false` | boolean | Person is alive — no death row |
| `Patient.deceasedDateTime` | dateTime | Create death row |
| (absent) | — | No death row |

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (`person_id` from Patient) | `person_id` | integer (FK PERSON) | Yes (PK) | Same surrogate as `person.person_id` |
| `Patient.deceasedDateTime` (date part) | `death_date` | dateTime → date | **Yes (NOT NULL)** | Extract YYYY-MM-DD |
| `Patient.deceasedDateTime` | `death_datetime` | dateTime | No | Full timestamp; null if FHIR value is date-only |
| (constant) | `death_type_concept_id` | integer (FK CONCEPT.Type Concept) | No | Default `32817` (EHR). See type concept table below. |
| (rare) | `cause_concept_id` | integer (FK CONCEPT) | No | Patient resource has no cause-of-death field — leave 0 unless paired with an `Observation` for cause of death. |
| (rare) | `cause_source_value` | varchar(50) | No | null |
| (rare) | `cause_source_concept_id` | integer | No | 0 |

## The `deceasedBoolean = true` problem

`death.death_date` is NOT NULL in OMOP. With only `deceasedBoolean = true`, no date is available.

| Strategy | Used by | Verdict |
|---|---|---|
| Drop the death row, log warning | this project, ETL-German | Recommended — preserves analytic integrity |
| Substitute placeholder date (e.g., `1900-01-01` or extraction date) | (none seen) | Skews mortality analytics |
| Use last `meta.lastUpdated` as proxy | (theoretical) | Not used in practice |

**Recommendation:** drop the row. Boolean-only deceased is a known FHIR-OMOP impedance mismatch.

## death_type_concept_id

OMOP type concepts identify provenance:

| concept_id | Name | When |
|---|---|---|
| 32817 | EHR | Default for FHIR-sourced data |
| 32887 | EHR record patient status "Deceased" | ETL-German uses `CONCEPT_EHR_RECORD_STATUS_DECEASED` |
| 32815 | Claim | If FHIR source is from claims |
| 32885 | Death Certificate | If linked to a vital records source |

ETL-German uses 32887 (`EHR record patient status "Deceased"`); most others use the generic 32817.

## Cause of death

`Patient.deceased[x]` carries no cause. To populate `cause_concept_id`, look for an associated FHIR resource:

- `Observation` with `code` LOINC `69453-9` ("Cause of death") → `cause_concept_id` from `valueCodeableConcept`
- `Condition` with `category = encounter-diagnosis` and `clinicalStatus = resolved` and `Patient.deceasedDateTime` set — heuristic, not reliable

This linkage is out-of-scope for the Patient mapper itself — handle in Observation/Condition mappers and update `death.cause_concept_id` in a post-processing step.

## Edge Cases

| Case | Handling |
|---|---|
| `deceasedBoolean = true` only | No row created; log warning |
| `deceasedBoolean = false` | No row |
| `deceasedDateTime` is partial (e.g., `2024-03`) | Pad to last day of month (`2024-03-31`) per OMOP Themis convention; `death_datetime` left null |
| Patient updated to alive (incremental) | Delete existing death row by `person_id` (ETL-German pattern: `deleteExistingDeath` before insert) |
| Multiple Patient resources with deceased | Last write wins by `meta.lastUpdated`; OMOP allows max 1 death per person |
| `birthDate` after `deceasedDateTime` | Data quality error — log and skip |

## Implementation Comparison

| Project | Creates death row? | Source field | type_concept_id | Notes |
|---|---|---|---|---|
| HL7 IG (PersonMap.fml) | No | — | — | Death is in scope of the IG (Death.fsh exists) but no FML rule maps to it |
| omoponfhir | Yes | `deceasedDateTime` | 32817 | Bidirectional |
| ETL-German | Yes (deferred) | `deceasedDateTime` | 32887 | Via `post_process_map` row, table=DEATH |
| mends-on-fhir | Yes (reverse: OMOP→FHIR) | `Person.death_date` | — | Maps to `Patient.deceasedDateTime` |
| FhirToCdm | **No** | — | — | Death not implemented |
| omopfhirmap | **No** | — | — | Death not implemented |
| NACHC | **No** | — | — | Death not implemented; loss of mortality data |
| fhir-to-omop-demo | **No** | — | — | Patient.jq does not emit death |
| fhir-x-omop | No | — | — | Death table not in mapped resource list |

Six of nine implementations silently lose mortality data — this is the single biggest interoperability gap in the Patient mapping.

## Sources

- HL7 IG logical model: `refs/refs/fhir-omop-ig/input/fsh/Death.fsh` (defines fields, no FML)
- omoponfhir Java: `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java`
- ETL-German Java death staging: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/PatientMapper.java` lines 653-675
- ETL-German constant `CONCEPT_EHR_RECORD_STATUS_DECEASED`: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/Constants.java`
- mends-on-fhir Whistle reverse mapping: `refs/refs/mends-on-fhir/whistle-mappings/synthea/whistle-functions/Person_Patient.wstl`
- OMOP CDM v5.4 death spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
