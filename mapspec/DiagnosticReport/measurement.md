# DiagnosticReport → measurement

OMOP CDM v5.4. When a DiagnosticReport's LOINC code resolves to an OMOP concept with `domain_id = Measurement`, the report itself produces one or more `measurement` rows. Each `conclusionCode` entry generates a separate row. This is independent of the Observation results referenced by `DiagnosticReport.result[]`, which are mapped by the Observation mapper.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `measurement_id` | integer | Yes (PK) | Surrogate key. Hash/sequence of `DiagnosticReport.id` + conclusionCode index. Must be unique across all measurement sources. |
| `DiagnosticReport.subject` | `person_id` | Reference → integer (FK PERSON) | Yes | Resolve `Patient/{id}` reference to integer `person_id`. Skip row if unresolvable. |
| `DiagnosticReport.code` | `measurement_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | LOINC code looked up in OMOP vocabulary. Must have `domain_id = Measurement`. Use first LOINC coding found. 0 if concept not found. |
| `DiagnosticReport.effective[x]` | `measurement_date` | dateTime\|Period → date | Yes | Date component of `effectiveDateTime`, or `effectivePeriod.start`. Skip row if absent (ETL-German behavior). |
| `DiagnosticReport.effective[x]` | `measurement_datetime` | dateTime\|Period → datetime | No | Full timestamp from `effectiveDateTime` or `effectivePeriod.start`. |
| (not used) | `measurement_time` | varchar(10) | No | Legacy field. Leave null. |
| `DiagnosticReport.category` | `measurement_type_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | ETL-German maps category via `SOURCE_VOCABULARY_ID_DIAGNOSTIC_REPORT_CATEGORY` custom concept map. Common defaults: 32817 (EHR) or 32856 (Lab result). |
| (not applicable) | `operator_concept_id` | integer (FK CONCEPT) | No | ETL-German maps SNOMED conclusion interpretation codes to operator. Typically null for DiagnosticReport. |
| (not applicable) | `value_as_number` | float | No | DiagnosticReport conclusions are coded, not numeric. Leave null. |
| `DiagnosticReport.conclusionCode` | `value_as_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | SNOMED conclusion code resolved to OMOP concept. ETL-German currently stores this in `measurement_source_concept_id` instead (see Implementation Comparison). |
| (not applicable) | `unit_concept_id` | integer (FK CONCEPT) | No | No units on DiagnosticReport-level measurements. Leave null. |
| (not applicable) | `range_low` | float | No | No reference ranges on DiagnosticReport. Leave null. |
| (not applicable) | `range_high` | float | No | No reference ranges on DiagnosticReport. Leave null. |
| `DiagnosticReport.performer[0]` | `provider_id` | Reference → integer (FK PROVIDER) | No | First `performer` reference resolved to `provider_id`. Also consider `resultsInterpreter[0]`. |
| `DiagnosticReport.encounter` | `visit_occurrence_id` | Reference → integer (FK VISIT_OCCURRENCE) | No | Resolve `Encounter/{id}` to `visit_occurrence_id`. |
| (not applicable) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | Leave null unless visit details are modeled. |
| `DiagnosticReport.conclusionCode.coding[0].code` | `measurement_source_value` | string → varchar(50) | No | Verbatim SNOMED code from conclusionCode. ETL-German uses this field. |
| `DiagnosticReport.conclusionCode` | `measurement_source_concept_id` | integer (FK CONCEPT) | No | SNOMED conclusionCode resolved to OMOP concept ID. ETL-German stores the SNOMED concept here (line 339). |
| (not applicable) | `unit_source_value` | varchar(50) | No | No units. Leave null. |
| (not applicable) | `unit_source_concept_id` | integer (FK CONCEPT) | No | No units. Leave null. |
| `DiagnosticReport.conclusionCode.coding[0].code` | `value_source_value` | varchar(50) | No | Verbatim SNOMED code. ETL-German stores this (line 344). |
| (not applicable) | `measurement_event_id` | integer | No | Can link back to a related OMOP record if needed. Leave null. |
| (not applicable) | `meas_event_field_concept_id` | integer (FK CONCEPT) | No | Leave null. |

FHIR fields with no OMOP target (lost in mapping): `DiagnosticReport.identifier`, `DiagnosticReport.basedOn`, `DiagnosticReport.issued`, `DiagnosticReport.resultsInterpreter` (beyond first performer), `DiagnosticReport.specimen`, `DiagnosticReport.result` (mapped separately), `DiagnosticReport.imagingStudy`, `DiagnosticReport.media`, `DiagnosticReport.conclusion` (maps to `note` table instead), `DiagnosticReport.presentedForm`.

## Vocabulary Mappings

### Report Code (`DiagnosticReport.code` → `measurement_concept_id`)

DiagnosticReport.code is almost always LOINC. The code is resolved via the OMOP `CONCEPT` table where `vocabulary_id = 'LOINC'`. Only codes with `domain_id = 'Measurement'` are routed to this table.

| LOINC Code (example) | OMOP concept_id | Display | Domain |
|---|---|---|---|
| `24323-8` | 3004410 | Comprehensive metabolic panel | Measurement |
| `24357-6` | 3002385 | Urinalysis macro panel | Measurement |
| `58410-2` | 3016502 | CBC panel (blood) | Measurement |

Note: Most common DiagnosticReport LOINC codes (e.g., `34117-2` History and physical note, `51847-2` Evaluation+Plan note) resolve to the Observation or Note domain, not Measurement. Lab panels (e.g., `24323-8`) are the primary Measurement-domain codes.

### Category (`DiagnosticReport.category` → `measurement_type_concept_id`)

ETL-German uses a custom `source_to_concept_map` with `source_vocabulary_id = 'DiagnosticReport_Category'` to map category codes to type concepts.

| Category Code | Category System | Suggested OMOP type_concept_id | Notes |
|---|---|---|---|
| `LAB` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32856 (Lab result) | Laboratory studies |
| `RAD` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32817 (EHR) | Radiology |
| `PAT` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32817 (EHR) | Pathology |
| `MB` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32817 (EHR) | Microbiology |
| (absent) | -- | 32817 (EHR) | Default when no category |

### ConclusionCode (`DiagnosticReport.conclusionCode` → `value_as_concept_id` / `measurement_source_concept_id`)

ConclusionCode uses SNOMED CT. The code is resolved via the OMOP `CONCEPT` table where `vocabulary_id = 'SNOMED'`.

ETL-German handles composite SNOMED expressions (e.g., `118247008:{363713009=373068000}`) by splitting the base code from the post-coordinated attributes and looking each up separately.

## Reference Resolution

### `subject` → `person_id`

`DiagnosticReport.subject` references a `Patient`. Strategy:
1. Extract the reference ID (e.g., `Patient/123` -> `123`).
2. Look up `person_id` from the Patient mapper's output or a pre-built lookup table.
3. If unresolvable, skip the entire DiagnosticReport. ETL-German increments `noPersonIdCounter` and returns null (lines 109-116).

### `encounter` → `visit_occurrence_id`

`DiagnosticReport.encounter` references an `Encounter`. Strategy:
1. Extract the reference ID.
2. Look up `visit_occurrence_id` from the Encounter/Visit mapper.
3. If unresolvable, log a warning but still create the measurement row with `visit_occurrence_id = null`. ETL-German logs at debug level (line 649).

### `performer[0]` → `provider_id`

`DiagnosticReport.performer` can reference `Practitioner`, `PractitionerRole`, `Organization`, or `CareTeam`. Only `Practitioner` references map to OMOP `provider`. Strategy:
1. Filter to `Practitioner`-typed references.
2. Resolve the first one to integer `provider_id`.
3. `resultsInterpreter` is an alternative source if `performer` is absent.

### `result[]` → (delegated to Observation mapper)

`DiagnosticReport.result` references individual `Observation` resources. These are NOT mapped here -- they are mapped independently by the Observation mapper. The DiagnosticReport provides grouping context (panel membership) that has no standard OMOP representation.

## Edge Cases

| Case | Handling |
|---|---|
| No `effectiveDateTime` or `effectivePeriod` | ETL-German skips the resource entirely (lines 118-123). Alternative: fall back to `issued` timestamp. |
| Status is `registered`, `preliminary`, `cancelled`, `entered-in-error`, or `unknown` | ETL-German rejects these (accepts only `final`, `amended`, `corrected`, `appended`). Rationale: preliminary results may change and should not be committed to the CDM. |
| No `conclusionCode` | ETL-German skips the resource (lines 141-147). Without a conclusion, there is no value to store. Only the referenced Observations produce rows. |
| Multiple `conclusionCode` entries | Each code produces a separate `measurement` row. The `measurement_concept_id` (report LOINC) is the same across all rows; only `measurement_source_concept_id` and `value_source_value` differ. |
| Composite SNOMED in conclusionCode (e.g., `118247008:{363713009=373068000}`) | ETL-German splits composite expressions: base code before `:` maps to `measurement_source_concept_id`; attributes after `:{` are parsed for interpretation codes mapped to `operator_concept_id` (lines 433-466, 582-593). |
| SNOMED codes joined with `+` (conjunction) | ETL-German splits on `+` and creates one row per component code (lines 557-580). |
| No `category` | ETL-German skips the resource (lines 125-131). Alternative: default to `measurement_type_concept_id = 32817` (EHR). |
| LOINC code resolves to Observation or Procedure domain | Route to `observation` or `procedure_occurrence` table instead. See [observation.md](./observation.md) and [procedure_occurrence.md](./procedure_occurrence.md). |
| Report with `result[]` but no `code` or `conclusionCode` | No report-level row produced. The Observations in `result[]` are still mapped independently. |
| `subject` references Group (not Patient) | Not supported. OMOP requires a single `person_id`. Skip the resource. |
| Incremental updates (same DiagnosticReport reprocessed) | ETL-German deletes existing OMOP rows by `fhirLogicalId` or `fhirIdentifier` before re-inserting (lines 89-98). |

## Implementation Comparison

| Aspect | ETL-German | fhir-to-omop-demo | NACHC | fhir2omop-cookbook |
|---|---|---|---|---|
| Direction | F→O | F→O | Parser only | Guidance |
| Domain routing | Yes (Measurement/Observation/Procedure) | No (skeleton) | No | Yes (conceptual) |
| Status filtering | `final`, `amended`, `corrected`, `appended` | Not implemented | Parses status but no filtering | Not specified |
| `measurement_concept_id` source | LOINC code from `code` | null | -- | `code` (conceptual) |
| `measurement_type_concept_id` source | Category via custom concept map | null | -- | Category (conceptual) |
| `value_as_concept_id` source | Not used (stored in `measurement_source_concept_id` instead) | null | -- | `conclusionCode` (conceptual) |
| `measurement_source_concept_id` | SNOMED conclusionCode concept | null | -- | `conclusionCode` |
| `measurement_source_value` | SNOMED conclusionCode code string | null | -- | `conclusionCode.coding[].code` |
| `provider_id` | Not mapped | null | -- | `performer` (conceptual) |
| Date source | `effective[x]` (dateTime or Period) | null | `effectivePeriod.start` | `effectiveDateTime` |
| Composite SNOMED handling | Yes (splits `:{}` expressions and `+` conjunctions) | No | No | No |
| Incremental update | Yes (delete-before-insert by fhirLogicalId) | No | No | No |
| `conclusion` text | Not mapped (only `conclusionCode`) | Separate note mapping file | Not parsed | Not specified |
| `presentedForm` | Not mapped | Separate note mapping file | Not parsed | Not specified |

## Sources

- ETL-German Java (primary reference): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/DiagnosticReportMapper.java`
  - Domain routing switch: lines 192-236
  - Measurement creation: lines 303-365
  - LOINC concept lookup: lines 177-186
  - Category concept lookup: lines 187-191
  - ConclusionCode extraction: lines 468-497
  - Composite SNOMED splitting: lines 557-593
  - Status filtering: lines 596-605
  - Date extraction (effective[x]): lines 607-634
  - Person resolution: lines 655-669
  - Visit resolution: lines 636-653
  - Acceptable statuses constant: `Constants.java` line 132-133 (`final`, `amended`, `corrected`, `appended`)
- fhir-to-omop-demo Bash: `refs/refs/fhir-to-omop-demo/data/convert/mapping/009-DiagnosticReport-measurement.sh`
  - All 23 measurement fields listed with null mappings
- NACHC Java (parser only): `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/fhir/parser/r4/diagnosticreport/DiagnosticReportParser.java`
  - Code extraction: lines 41-53
  - Status extraction: lines 103-110
  - Date extraction: lines 112-119
- fhir2omop-cookbook (guidance): `refs/fhir2omop-cookbook.md` lines 528-575
- FHIR R4 DiagnosticReport: https://hl7.org/fhir/R4/diagnosticreport.html
- OMOP CDM v5.4 measurement spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
