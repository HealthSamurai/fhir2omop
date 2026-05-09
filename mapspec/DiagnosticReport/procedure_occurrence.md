# DiagnosticReport → procedure_occurrence

OMOP CDM v5.4. When a DiagnosticReport's LOINC code resolves to an OMOP concept with `domain_id = Procedure`, the report itself produces one or more `procedure_occurrence` rows. This occurs primarily for imaging studies (radiology, nuclear medicine), pathology procedures, and certain clinical assessments whose LOINC codes are classified in the Procedure domain by the OMOP vocabulary. Each `conclusionCode` entry generates a separate row. This is independent of the Observation results referenced by `DiagnosticReport.result[]`, which are mapped by the Observation mapper.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `procedure_occurrence_id` | integer | Yes (PK) | Surrogate key. Hash/sequence of `DiagnosticReport.id` + conclusionCode index. Must be unique across all procedure_occurrence sources. |
| `DiagnosticReport.subject` | `person_id` | Reference → integer (FK PERSON) | Yes | Resolve `Patient/{id}` reference to integer `person_id`. Skip row if unresolvable. |
| `DiagnosticReport.code` | `procedure_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | LOINC code looked up in OMOP vocabulary. Must have `domain_id = Procedure`. Use first LOINC coding found. 0 if concept not found. ETL-German uses `loincCodingConcept.getConceptId()` (line 274). |
| `DiagnosticReport.effective[x]` | `procedure_date` | dateTime\|Period → date | Yes | Date component of `effectiveDateTime`, or `effectivePeriod.start`. Skip row if absent (ETL-German behavior). |
| `DiagnosticReport.effective[x]` | `procedure_datetime` | dateTime\|Period → datetime | No | Full timestamp from `effectiveDateTime` or `effectivePeriod.start`. |
| `DiagnosticReport.effectivePeriod.end` | `procedure_end_date` | dateTime → date | No | End date from `effectivePeriod.end`. ETL-German does not set this field for DiagnosticReport (only uses startDateTime). Leave null for `effectiveDateTime`. |
| `DiagnosticReport.effectivePeriod.end` | `procedure_end_datetime` | dateTime → datetime | No | Full timestamp from `effectivePeriod.end`. ETL-German does not set this field. |
| `DiagnosticReport.category` | `procedure_type_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | ETL-German maps category via `SOURCE_VOCABULARY_ID_DIAGNOSTIC_REPORT_CATEGORY` custom concept map (line 273). Common defaults: 32817 (EHR). See Vocabulary Mappings below. |
| `DiagnosticReport.conclusionCode` (interpretation) | `modifier_concept_id` | Coding → integer (FK CONCEPT) | No | ETL-German extracts interpretation codes from composite SNOMED expressions in `conclusionCode` (e.g., the value after `=` in `118247008:{363713009=373068000}`) and resolves them to OMOP concepts (lines 286-297). Set only when conclusionCode contains a `:{` composite expression. 0 if absent or unmapped. |
| (not applicable) | `quantity` | integer | No | DiagnosticReport has no quantity field. Leave null. |
| `DiagnosticReport.performer[0]` | `provider_id` | Reference → integer (FK PROVIDER) | No | First `performer` reference resolved to `provider_id`. Also consider `resultsInterpreter[0]`. ETL-German does not map this field for DiagnosticReport (not set in procedure builder, line 269-285). |
| `DiagnosticReport.encounter` | `visit_occurrence_id` | Reference → integer (FK VISIT_OCCURRENCE) | No | Resolve `Encounter/{id}` to `visit_occurrence_id`. ETL-German sets this (line 272). |
| (not applicable) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | Leave null unless visit details are modeled. ETL-German does not set this. |
| `DiagnosticReport.conclusionCode.coding[0].code` | `procedure_source_value` | string → varchar(50) | No | Verbatim SNOMED code from conclusionCode. ETL-German stores `snomedCoding.getCode()` (line 277). Note: ETL-German has commented-out code that would use `loincCodingConcept.getConceptCode()` instead (line 278). |
| `DiagnosticReport.conclusionCode` | `procedure_source_concept_id` | integer (FK CONCEPT) | No | SNOMED conclusionCode resolved to OMOP concept ID. ETL-German stores `snomedConcept.getConceptId()` (line 276). Has commented-out code that would use `loincCodingConcept.getConceptId()` instead (line 275). |
| `DiagnosticReport.conclusionCode` (interpretation code) | `modifier_source_value` | string → varchar(50) | No | Verbatim interpretation code from composite SNOMED expression. ETL-German stores `interpretationConcept.getConceptCode()` (line 296). Only set when composite SNOMED expression is present. |

FHIR fields with no OMOP target (lost in mapping): `DiagnosticReport.identifier`, `DiagnosticReport.basedOn`, `DiagnosticReport.issued`, `DiagnosticReport.resultsInterpreter` (beyond first performer), `DiagnosticReport.specimen`, `DiagnosticReport.result` (mapped separately), `DiagnosticReport.imagingStudy`, `DiagnosticReport.media`, `DiagnosticReport.conclusion` (maps to `note` table instead), `DiagnosticReport.presentedForm`.

## Vocabulary Mappings

### Report Code (`DiagnosticReport.code` → `procedure_concept_id`)

DiagnosticReport.code is almost always LOINC. The code is resolved via the OMOP `CONCEPT` table where `vocabulary_id = 'LOINC'`. Only codes with `domain_id = 'Procedure'` are routed to this table. Procedure-domain LOINC codes are less common than Measurement or Observation domain codes and typically represent imaging studies, pathology procedures, and clinical assessments.

| LOINC Code (example) | OMOP concept_id | Display | Domain |
|---|---|---|---|
| `24725-4` | 3027018 | CT Head W contrast IV | Procedure |
| `24566-1` | 3003961 | XR Chest 2 Views | Procedure |
| `24532-3` | 3048098 | MRI Brain WO contrast | Procedure |
| `38269-7` | 3042955 | US Abdomen | Procedure |
| `24627-1` | 3044437 | MR Heart | Procedure |
| `24610-7` | 3018893 | XR Spine Lumbar AP+Lateral | Procedure |

Note: Imaging study LOINC codes (radiology document types like `18748-4` Diagnostic imaging study, `18726-0` Radiology studies) may resolve to Procedure domain. Panel-level codes (e.g., `24323-8` Comprehensive metabolic panel) typically resolve to Measurement domain instead.

### Category (`DiagnosticReport.category` → `procedure_type_concept_id`)

ETL-German uses a custom `source_to_concept_map` with `source_vocabulary_id = 'Diag.Rep Category'` to map category codes to type concepts (line 190).

| Category Code | Category System | Suggested OMOP type_concept_id | Notes |
|---|---|---|---|
| `RAD` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32817 (EHR) | Radiology -- most common category for Procedure-domain reports |
| `PAT` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32817 (EHR) | Pathology |
| `LAB` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32856 (Lab result) | Laboratory (uncommon for Procedure domain) |
| `MB` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 32817 (EHR) | Microbiology |
| (absent) | -- | 32817 (EHR) | Default when no category |

### ConclusionCode (`DiagnosticReport.conclusionCode` → `procedure_source_concept_id` / `modifier_concept_id`)

ConclusionCode uses SNOMED CT. The code is resolved via the OMOP `CONCEPT` table where `vocabulary_id = 'SNOMED'`.

ETL-German handles composite SNOMED expressions (e.g., `118247008:{363713009=373068000}`) by splitting the base code from the post-coordinated attributes. The base code (before `:`) maps to `procedure_source_concept_id`; attributes after `:{` are parsed for interpretation codes mapped to `modifier_concept_id` (lines 256-297, 582-593).

For the Procedure domain, the conclusion code represents the clinical finding or result of the procedure (e.g., a radiology finding), stored in `procedure_source_concept_id` and `procedure_source_value`. The interpretation code from composite expressions maps to `modifier_concept_id` and `modifier_source_value`.

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
3. If unresolvable, log a warning but still create the procedure row with `visit_occurrence_id = null`. ETL-German logs at debug level (line 649).

### `performer[0]` → `provider_id`

`DiagnosticReport.performer` can reference `Practitioner`, `PractitionerRole`, `Organization`, or `CareTeam`. Only `Practitioner` references map to OMOP `provider`. Strategy:
1. Filter to `Practitioner`-typed references.
2. Resolve the first one to integer `provider_id`.
3. `resultsInterpreter` is an alternative source if `performer` is absent.
4. ETL-German does not map `provider_id` for DiagnosticReport procedure_occurrence rows (the field is not set in the builder at lines 269-285). This is a gap -- a complete implementation should populate it.

### `result[]` → (delegated to Observation mapper)

`DiagnosticReport.result` references individual `Observation` resources. These are NOT mapped here -- they are mapped independently by the Observation mapper. The DiagnosticReport provides grouping context (panel membership) that has no standard OMOP representation.

## Edge Cases

| Case | Handling |
|---|---|
| No `effectiveDateTime` or `effectivePeriod` | ETL-German skips the resource entirely (lines 118-123). Alternative: fall back to `issued` timestamp. `procedure_date` is required in OMOP. |
| Status is `registered`, `preliminary`, `cancelled`, `entered-in-error`, or `unknown` | ETL-German rejects these (accepts only `final`, `amended`, `corrected`, `appended`). Rationale: preliminary results may change and should not be committed to the CDM (lines 596-605). |
| No `conclusionCode` | ETL-German skips the resource (lines 141-147). Without a conclusion, there is no SNOMED finding to store in `procedure_source_concept_id`. Only the referenced Observations produce rows. |
| Multiple `conclusionCode` entries | Each code produces a separate `procedure_occurrence` row. The `procedure_concept_id` (report LOINC) is the same across all rows; only `procedure_source_concept_id` and `procedure_source_value` differ (lines 255-300). |
| Composite SNOMED in conclusionCode (e.g., `118247008:{363713009=373068000}`) | ETL-German splits composite expressions: base code before `:` maps to `procedure_source_concept_id`; attributes after `:{` are parsed, and the interpretation code (value after `=`) is resolved to `modifier_concept_id` (lines 256, 286-297, 433-466). |
| SNOMED codes joined with `+` (conjunction) | ETL-German splits on `+` and creates one row per component code (lines 557-580). Each component is processed independently. |
| No `category` | ETL-German skips the resource (lines 125-131). Alternative: default to `procedure_type_concept_id = 32817` (EHR). |
| LOINC code resolves to Measurement or Observation domain | Route to `measurement` or `observation` table instead. See [measurement.md](./measurement.md) and [observation.md](./observation.md). |
| `effectivePeriod` with both start and end | ETL-German only uses `startDateTime` for procedure date/datetime (line 281-282). `procedure_end_date` and `procedure_end_datetime` are not populated. A complete implementation should use `effectivePeriod.end` for the end date fields. |
| Report with `result[]` but no `code` or `conclusionCode` | No report-level row produced. The Observations in `result[]` are still mapped independently. |
| `subject` references Group (not Patient) | Not supported. OMOP requires a single `person_id`. Skip the resource. |
| Incremental updates (same DiagnosticReport reprocessed) | ETL-German deletes existing OMOP rows from `procedure_occurrence`, `measurement`, and `observation` tables by `fhirLogicalId` or `fhirIdentifier` before re-inserting (lines 89-98; `DiagnosticReportMapperServiceImpl.java` lines 29-33). |
| `provider_id` not populated by ETL-German | The ETL-German procedure builder does not set `provider_id`. A complete implementation should resolve `performer[0]` or `resultsInterpreter[0]` to a provider. |

## Implementation Comparison

| Aspect | ETL-German | fhir-to-omop-demo | NACHC | fhir2omop-cookbook |
|---|---|---|---|---|
| Direction | F→O | F→O | Parser only | Guidance |
| Domain routing (Procedure branch) | Yes -- full Measurement/Observation/Procedure switch (lines 192-236) | No (no procedure mapping file) | No | Yes (conceptual, line 162) |
| Status filtering | `final`, `amended`, `corrected`, `appended` | Not implemented | Parses status but no filtering | Not specified |
| `procedure_concept_id` source | LOINC code from `code` via vocabulary lookup | -- | -- | `code` (conceptual) |
| `procedure_type_concept_id` source | Category via custom concept map (`Diag.Rep Category`) | -- | -- | Category (conceptual) |
| `procedure_source_concept_id` source | SNOMED conclusionCode concept (line 276) | -- | -- | Not specified |
| `procedure_source_value` source | SNOMED conclusionCode code string (line 277) | -- | -- | Not specified |
| `modifier_concept_id` source | Interpretation code from composite SNOMED expression (lines 286-297) | -- | -- | Not specified |
| `modifier_source_value` source | Interpretation concept code (line 296) | -- | -- | Not specified |
| `provider_id` | Not mapped | -- | -- | `performer` (conceptual) |
| `procedure_end_date` / `procedure_end_datetime` | Not mapped (only start date used) | -- | -- | Not specified |
| Date source | `effective[x]` (dateTime or Period start only) | -- | -- | `effectiveDateTime` |
| Composite SNOMED handling | Yes (splits `:{` expressions and `+` conjunctions) | No | No | No |
| Incremental update | Yes (delete-before-insert from procedure_occurrence, measurement, observation by fhirLogicalId) | No | No | No |
| `conclusion` text | Not mapped (only `conclusionCode`) | Separate note mapping file | Not parsed | Not specified |
| `presentedForm` | Not mapped | Separate note mapping file | Not parsed | Not specified |

ETL-German is the only reference implementation that explicitly handles the Procedure domain routing for DiagnosticReport. The fhir-to-omop-demo has no procedure-specific DiagnosticReport mapping file. NACHC only parses DiagnosticReport fields without mapping to OMOP procedure_occurrence. The fhir2omop-cookbook mentions Procedure domain routing conceptually but provides no field-level mapping for DiagnosticReport-to-procedure_occurrence.

## Sources

- ETL-German Java (primary reference): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/DiagnosticReportMapper.java`
  - Domain routing switch: lines 192-236
  - Procedure branch entry (`OMOP_DOMAIN_PROCEDURE` case): lines 220-231
  - `createDiagnosticReportProcedureOcc()`: lines 239-301
  - SNOMED conclusion code splitting (conjunction `+`): lines 557-580
  - Composite SNOMED modification (stripping `:{` attributes): lines 582-593
  - Interpretation code extraction from composite SNOMED: lines 433-466
  - ProcedureOccurrence builder (field assignment): lines 269-285
  - Interpretation → `modifier_concept_id`/`modifier_source_value`: lines 286-297
  - LOINC concept lookup: lines 177-186
  - Category concept lookup: lines 187-191
  - ConclusionCode extraction: lines 468-497
  - Status filtering: lines 596-605
  - Date extraction (effective[x]): lines 607-634
  - Person resolution: lines 655-669
  - Visit resolution: lines 636-653
  - Acceptable statuses constant: `Constants.java` lines 132-133 (`final`, `amended`, `corrected`, `appended`)
  - Domain constant: `Constants.java` line 102 (`OMOP_DOMAIN_PROCEDURE = "Procedure"`)
- ETL-German service layer (delete logic): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/repository/service/DiagnosticReportMapperServiceImpl.java`
  - `deleteExistingDiagnosticReportByFhirLogicalId()`: lines 29-33 (deletes from procedure_occurrence, measurement, and observation)
  - `deleteExistingDiagnosticReportByFhirIdentifier()`: lines 40-44
- ETL-German ProcedureOccurrence model: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/model/omop/ProcedureOccurrence.java`
  - All 16 OMOP fields defined: lines 30-103
- fhir2omop-cookbook (guidance): `refs/fhir2omop-cookbook.md` lines 160-162 (domain routing mention), 528-575 (DiagnosticReport mapping guidance)
- FHIR R4 DiagnosticReport: https://hl7.org/fhir/R4/diagnosticreport.html
- OMOP CDM v5.4 procedure_occurrence spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
