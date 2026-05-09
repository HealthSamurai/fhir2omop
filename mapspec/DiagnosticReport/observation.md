# DiagnosticReport → observation

OMOP CDM v5.4. When a DiagnosticReport's LOINC code resolves to an OMOP concept with `domain_id = Observation`, the report itself produces one or more `observation` rows. This applies primarily to clinical document types -- history and physical notes, discharge summaries, evaluation and plan notes, consultation notes -- where the LOINC code represents a document class rather than a quantitative measurement or procedure. Each `conclusionCode` entry generates a separate row. This mapping is independent of the Observation results referenced by `DiagnosticReport.result[]`, which are mapped by the Observation mapper.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `observation_id` | integer | Yes (PK) | Surrogate key. Hash/sequence of `DiagnosticReport.id` + conclusionCode index. Must be unique across all observation sources. |
| `DiagnosticReport.subject` | `person_id` | Reference → integer (FK PERSON) | Yes | Resolve `Patient/{id}` reference to integer `person_id`. Skip row if unresolvable. |
| `DiagnosticReport.code` | `observation_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | LOINC code looked up in OMOP vocabulary. Must have `domain_id = Observation`. Use first LOINC coding found. 0 if concept not found. |
| `DiagnosticReport.effective[x]` | `observation_date` | dateTime\|Period → date | Yes | Date component of `effectiveDateTime`, or `effectivePeriod.start`. Skip row if absent (ETL-German behavior). |
| `DiagnosticReport.effective[x]` | `observation_datetime` | dateTime\|Period → datetime | No | Full timestamp from `effectiveDateTime` or `effectivePeriod.start`. |
| `DiagnosticReport.category` | `observation_type_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | ETL-German maps category via `SOURCE_VOCABULARY_ID_DIAGNOSTIC_REPORT_CATEGORY` custom concept map. Common defaults: 32817 (EHR) or 32856 (Lab result). |
| (not applicable) | `value_as_number` | float | No | DiagnosticReport conclusions are coded, not numeric. Leave null. |
| `DiagnosticReport.conclusionCode.coding[0].display` or `DiagnosticReport.conclusion` | `value_as_string` | string → varchar(60) | No | ETL-German stores the SNOMED code string here (line 409). Recommended: use `conclusionCode` display text, or fall back to `conclusion` free text (truncated to 60 chars). |
| `DiagnosticReport.conclusionCode` | `value_as_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | SNOMED conclusion code resolved to OMOP concept. ETL-German currently stores this in `observation_source_concept_id` instead (see Implementation Comparison). Recommended: store the resolved SNOMED concept here as the clinical value of the report. |
| (not applicable) | `qualifier_concept_id` | integer (FK CONCEPT) | No | ETL-German maps SNOMED composite expression interpretation attributes (from post-coordinated conclusionCode) to this field (line 425). Null if no interpretation is present. |
| (not applicable) | `unit_concept_id` | integer (FK CONCEPT) | No | No units on DiagnosticReport-level observations. Leave null. |
| `DiagnosticReport.performer[0]` | `provider_id` | Reference → integer (FK PROVIDER) | No | First `performer` reference resolved to `provider_id`. Also consider `resultsInterpreter[0]`. |
| `DiagnosticReport.encounter` | `visit_occurrence_id` | Reference → integer (FK VISIT_OCCURRENCE) | No | Resolve `Encounter/{id}` to `visit_occurrence_id`. |
| (not applicable) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | Leave null unless visit details are modeled. |
| `DiagnosticReport.conclusionCode.coding[0].code` | `observation_source_value` | string → varchar(50) | No | Verbatim SNOMED code from conclusionCode. ETL-German stores this (line 405). |
| `DiagnosticReport.conclusionCode` | `observation_source_concept_id` | integer (FK CONCEPT) | No | SNOMED conclusionCode resolved to OMOP concept ID. ETL-German stores the SNOMED concept here (line 404). |
| (not applicable) | `unit_source_value` | varchar(50) | No | No units. Leave null. |
| `DiagnosticReport.conclusionCode` interpretation | `qualifier_source_value` | varchar(50) | No | ETL-German stores the SNOMED interpretation concept code from composite SNOMED expressions (line 426). Null if no composite expression. |
| `DiagnosticReport.conclusionCode.coding[0].code` | `value_source_value` | varchar(50) | No | Verbatim SNOMED code. ETL-German does not explicitly set this field (contrast with measurement mapping which sets it at line 344). Recommended: store the raw conclusionCode string. |
| (not applicable) | `observation_event_id` | integer | No | Can link back to a related OMOP record if needed. Leave null. |
| (not applicable) | `obs_event_field_concept_id` | integer (FK CONCEPT) | No | Leave null. |

FHIR fields with no OMOP target (lost in mapping): `DiagnosticReport.identifier`, `DiagnosticReport.basedOn`, `DiagnosticReport.issued`, `DiagnosticReport.resultsInterpreter` (beyond first performer), `DiagnosticReport.specimen`, `DiagnosticReport.result` (mapped separately), `DiagnosticReport.imagingStudy`, `DiagnosticReport.media`, `DiagnosticReport.conclusion` (maps to `note` table instead, or can contribute to `value_as_string`), `DiagnosticReport.presentedForm`.

## Vocabulary Mappings

### Report Code (`DiagnosticReport.code` → `observation_concept_id`)

DiagnosticReport.code is almost always LOINC. The code is resolved via the OMOP `CONCEPT` table where `vocabulary_id = 'LOINC'`. Only codes with `domain_id = 'Observation'` are routed to this table. Most common DiagnosticReport LOINC codes for clinical documents resolve to the Observation domain, making this the most frequently hit domain for DiagnosticReport resources in real-world EHR data (clinical notes are far more common than lab panel-level reports).

| LOINC Code (example) | OMOP concept_id | Display | Domain |
|---|---|---|---|
| `34117-2` | 3040820 | History and physical note | Observation |
| `51847-2` | 3045440 | Evaluation+Plan note | Observation |
| `18842-5` | 3002340 | Discharge summary | Observation |
| `47039-3` | 3046280 | Hospital Admission history and physical note | Observation |
| `47042-7` | 3046283 | Counseling note | Observation |
| `57133-1` | 3048099 | Referral note | Observation |
| `28570-0` | 3022227 | Procedure note | Observation |
| `11506-3` | 3001832 | Progress note | Observation |
| `34109-9` | 3040812 | Note | Observation |

Note: Lab panel codes (e.g., `24323-8` Comprehensive metabolic panel) resolve to the Measurement domain and are routed to `measurement` instead. Imaging procedure codes may resolve to the Procedure domain.

### Category (`DiagnosticReport.category` → `observation_type_concept_id`)

ETL-German uses a custom `source_to_concept_map` with `source_vocabulary_id = 'DiagnosticReport_Category'` to map category codes to type concepts.

| Category Code | Category System | Suggested OMOP type_concept_id | Notes |
|---|---|---|---|
| `LAB` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32856 (Lab result) | Laboratory studies (unlikely to hit Observation domain) |
| `RAD` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32817 (EHR) | Radiology |
| `PAT` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32817 (EHR) | Pathology |
| `MB` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32817 (EHR) | Microbiology |
| `LP29684-5` | `http://loinc.org` | 32817 (EHR) | Radiology (LOINC category used in US Core) |
| `LP29708-2` | `http://loinc.org` | 32817 (EHR) | Cardiology (LOINC category) |
| (absent) | -- | 32817 (EHR) | Default when no category |

For Observation-domain DiagnosticReports (clinical notes), the category is most commonly absent or a general document category. The v2-0074 categories like `LAB` are rare in this context.

### ConclusionCode (`DiagnosticReport.conclusionCode` → `value_as_concept_id` / `observation_source_concept_id`)

ConclusionCode uses SNOMED CT. The code is resolved via the OMOP `CONCEPT` table where `vocabulary_id = 'SNOMED'`.

ETL-German handles composite SNOMED expressions (e.g., `118247008:{363713009=373068000}`) by splitting the base code from the post-coordinated attributes and looking each up separately. The base code maps to `observation_source_concept_id`; the interpretation attribute (after `=`) maps to `qualifier_concept_id` and `qualifier_source_value`.

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
3. If unresolvable, log a warning but still create the observation row with `visit_occurrence_id = null`. ETL-German logs at debug level (line 649).

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
| No `conclusionCode` | ETL-German skips the resource (lines 141-147). Without a conclusion, there is no value to store. Only the referenced Observations produce rows. Alternative: create a row with null value fields to record the report's existence. |
| Multiple `conclusionCode` entries | Each code produces a separate `observation` row. The `observation_concept_id` (report LOINC) is the same across all rows; only `observation_source_concept_id`, `observation_source_value`, and `value_as_string` differ. |
| Composite SNOMED in conclusionCode (e.g., `118247008:{363713009=373068000}`) | ETL-German splits composite expressions: base code before `:` maps to `observation_source_concept_id`; the interpretation attribute after `=` maps to `qualifier_concept_id` and `qualifier_source_value` (lines 433-466). |
| SNOMED codes joined with `+` (conjunction) | ETL-German splits on `+` and creates one row per component code (lines 557-580). |
| No `category` | ETL-German skips the resource (lines 125-131). Alternative: default to `observation_type_concept_id = 32817` (EHR). |
| LOINC code resolves to Measurement or Procedure domain | Route to `measurement` or `procedure_occurrence` table instead. See [measurement.md](./measurement.md) and [procedure_occurrence.md](./procedure_occurrence.md). |
| Report with `result[]` but no `code` or `conclusionCode` | No report-level row produced. The Observations in `result[]` are still mapped independently. |
| `subject` references Group (not Patient) | Not supported. OMOP requires a single `person_id`. Skip the resource. |
| Incremental updates (same DiagnosticReport reprocessed) | ETL-German deletes existing OMOP rows by `fhirLogicalId` or `fhirIdentifier` before re-inserting (lines 89-98). |
| `conclusion` text present but no `conclusionCode` | ETL-German skips (requires conclusionCode). Alternative: store `conclusion` text in `value_as_string` and create a row with the LOINC report code. The `conclusion` text can also be mapped to the `note` table instead (see [note.md](./note.md)). |

## Implementation Comparison

ETL-German is the only reference implementation that explicitly routes DiagnosticReport to the OMOP observation table via domain lookup. Other implementations either do not handle DiagnosticReport at all, or handle only the measurement/note case.

| Aspect | ETL-German | fhir-to-omop-demo | NACHC | fhir2omop-cookbook |
|---|---|---|---|---|
| Direction | F→O | F→O | Parser only | Guidance |
| Domain routing to observation | Yes (line 194: `OMOP_DOMAIN_OBSERVATION` case) | No (skeleton, measurement only) | No | Yes (conceptual) |
| Status filtering | `final`, `amended`, `corrected`, `appended` | Not implemented | Parses status but no filtering | Not specified |
| `observation_concept_id` source | LOINC code from `code` (line 403) | -- | -- | `code` (conceptual) |
| `observation_type_concept_id` source | Category via custom concept map (line 402) | -- | -- | Category (conceptual) |
| `value_as_concept_id` source | Not used (commented out at line 408) | -- | -- | `conclusionCode` (conceptual) |
| `value_as_string` source | SNOMED code string from conclusionCode (line 409) | -- | -- | Not specified |
| `observation_source_concept_id` | SNOMED conclusionCode concept (line 404) | -- | -- | `conclusionCode` |
| `observation_source_value` | SNOMED conclusionCode code string (line 405) | -- | -- | `conclusionCode.coding[].code` |
| `qualifier_concept_id` | SNOMED interpretation from composite expression (line 425) | -- | -- | Not specified |
| `qualifier_source_value` | Interpretation concept code (line 426) | -- | -- | Not specified |
| `value_source_value` | Not set (contrast: measurement sets this at line 344) | -- | -- | Not specified |
| `provider_id` | Not mapped | -- | -- | `performer` (conceptual) |
| Date source | `effective[x]` (dateTime or Period, lines 607-634) | -- | -- | `effectiveDateTime` |
| Composite SNOMED handling | Yes (splits `:{}` expressions and `+` conjunctions) | No | No | No |
| Incremental update | Yes (delete-before-insert by fhirLogicalId, lines 89-98) | No | No | No |
| `conclusion` text | Not mapped (only `conclusionCode`) | Separate note mapping file | Not parsed | Not specified |
| `presentedForm` | Not mapped | Separate note mapping file | Not parsed | Not specified |

### Key Differences from Measurement Mapping

The ETL-German observation creation (lines 367-431) closely parallels the measurement creation (lines 303-365), with these structural differences:

| Field | Measurement (lines 303-365) | Observation (lines 367-431) |
|---|---|---|
| Concept ID | `measurementConceptId` = LOINC concept | `observationConceptId` = LOINC concept |
| Source concept | `measurementSourceConceptId` = SNOMED | `observationSourceConceptId` = SNOMED |
| Source value | `measurementSourceValue` = SNOMED code | `observationSourceValue` = SNOMED code |
| Value storage | `valueSourceValue` = SNOMED code (line 344) | `valueAsString` = SNOMED code (line 409) |
| Interpretation | `operatorConceptId` (line 361) | `qualifierConceptId` (line 425) + `qualifierSourceValue` (line 426) |

## Sources

- ETL-German Java (primary reference): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/DiagnosticReportMapper.java`
  - Domain routing switch: lines 192-236 (line 194: `OMOP_DOMAIN_OBSERVATION` case)
  - Observation creation (`createDiagnosticReportObservation`): lines 367-431
  - `observationConceptId` from LOINC: line 403
  - `observationTypeConceptId` from category: line 402
  - `observationSourceConceptId` from SNOMED conclusionCode: line 404
  - `observationSourceValue` from SNOMED code: line 405
  - `valueAsString` from SNOMED code: line 409
  - `qualifierConceptId` from interpretation: line 425
  - `qualifierSourceValue` from interpretation: line 426
  - LOINC concept lookup: lines 177-186
  - Category concept lookup: lines 187-191
  - ConclusionCode extraction: lines 468-497
  - Composite SNOMED splitting: lines 557-593
  - Interpretation extraction from composite SNOMED: lines 433-466
  - Status filtering: lines 596-605
  - Date extraction (effective[x]): lines 607-634
  - Person resolution: lines 655-669
  - Visit resolution: lines 636-653
  - Acceptable statuses constant: `Constants.java` lines 132-133 (`final`, `amended`, `corrected`, `appended`)
- OmopObservation model: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/model/omop/OmopObservation.java`
  - Note: model lacks `value_source_value` and `observation_event_id` / `obs_event_field_concept_id` fields (not mapped by ETL-German)
- fhir-to-omop-demo Bash: `refs/refs/fhir-to-omop-demo/data/convert/mapping/009-DiagnosticReport-measurement.sh`
  - Skeleton only -- no observation-specific mapping file exists; all 23 measurement fields listed with null mappings
  - Example resource uses LOINC `34117-2` (History and physical note) which resolves to Observation domain, but demo maps it to measurement table
- NACHC Java (parser only): `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/fhir/parser/r4/diagnosticreport/DiagnosticReportParser.java`
  - Code extraction: lines 41-53
  - Status extraction: lines 103-110
  - Date extraction: lines 112-119
- fhir2omop-cookbook (guidance): `refs/fhir2omop-cookbook.md` lines 528-575
  - Conceptual domain routing: lines 563-567
- FHIR R4 DiagnosticReport: https://hl7.org/fhir/R4/diagnosticreport.html
- OMOP CDM v5.4 observation spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
