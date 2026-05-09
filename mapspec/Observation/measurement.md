# Observation → measurement

OMOP CDM v5.4. The `measurement` table stores structured results from laboratory tests, vital signs, and other quantitative clinical observations. One FHIR Observation (or one component of a multi-component Observation) maps to one `measurement` row.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `measurement_id` | integer | Yes (PK) | Surrogate key from `Observation.id` (+ `-comp-N` suffix for components). |
| `Observation.subject` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference. |
| `Observation.code` (or component.code) | `measurement_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | LOINC/SNOMED → OMOP standard concept via vocabulary lookup. Placeholder: 0. |
| `Observation.effectiveDateTime` | `measurement_date` | dateTime → date | Yes | Date portion (YYYY-MM-DD). Falls back to `effectivePeriod.start` if dateTime absent. |
| `Observation.effectiveDateTime` | `measurement_datetime` | dateTime | No | Full ISO datetime. Falls back to `effectivePeriod.start`. |
| (constant) | `measurement_type_concept_id` | integer | Yes | 32817 (EHR). |
| `valueQuantity.comparator` | `operator_concept_id` | code → integer (FK CONCEPT) | No | See operator mapping below. null if no comparator. |
| `valueQuantity.value` | `value_as_number` | decimal → float | No | Numeric result value. |
| `valueCodeableConcept` | `value_as_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | Coded result. Requires vocabulary lookup. Placeholder: null. |
| `valueQuantity.unit` | `unit_source_value` | string → varchar(50) | No | Raw unit string (e.g., "mg/dL"). |
| (none) | `unit_concept_id` | integer (FK CONCEPT) | No | UCUM → OMOP unit concept. Placeholder: null. |
| `referenceRange[0].low.value` | `range_low` | decimal → float | No | Reference range lower bound. |
| `referenceRange[0].high.value` | `range_high` | decimal → float | No | Reference range upper bound. |
| `Observation.performer[0]` | `provider_id` | ref → integer (FK PROVIDER) | No | First performer (Practitioner). |
| `Observation.encounter` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Resolve Encounter reference. |
| (none) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | Not mapped. FhirToCdm sets this to `visit_occurrence_id`. |
| `code.coding[best].code` | `measurement_source_value` | code → varchar(50) | No | Best code by vocabulary priority (LOINC > SNOMED > first). |
| (none) | `measurement_source_concept_id` | integer | No | 0. |
| (none) | `unit_source_concept_id` | integer | No | 0. |
| (computed) | `value_source_value` | string → varchar(50) | No | Verbatim: `"{comparator}{value} {unit}"` or valueString or valueCodeableConcept text. |

FHIR fields with no OMOP target: `Observation.method`, `Observation.bodySite`, `Observation.specimen`, `Observation.device`, `Observation.interpretation` (mapped as `qualifier_source_value` in the observation table only -- measurement has no qualifier fields), `Observation.note`, `Observation.dataAbsentReason`, `Observation.hasMember`, `Observation.derivedFrom`, `Observation.issued`, `Observation.focus`, `Observation.partOf`.

## Vocabulary Mappings

### Domain Routing (category-based)

FHIR Observations are routed to `measurement` vs. OMOP `observation` based on `Observation.category`. Codes from system `http://terminology.hl7.org/CodeSystem/observation-category`:

| FHIR Category Code | Routes To | Rationale |
|---|---|---|
| `laboratory` | **measurement** | Lab results are quantitative |
| `vital-signs` | **measurement** | Vitals are quantitative |
| `social-history` | observation | Qualitative lifestyle data |
| `survey` | observation | Questionnaire responses |
| `activity` | observation | Physical activity data |
| (absent / unknown) | **measurement** | Default -- labs are most common in clinical data |

The HL7 IG FML uses the same category-based routing (`vital-signs`, `laboratory` for Measurement). The ETL-German implementation uses vocabulary-based domain routing instead: it looks up each LOINC code's `domain_id` in the OMOP vocabulary and routes to Measurement, Observation, or Procedure accordingly. The fhir-to-omop-demo (jq) also uses domain-based routing from pre-joined vocabulary lookups.

### Operator Mapping (`valueQuantity.comparator` → `operator_concept_id`)

| FHIR Comparator | OMOP concept_id | OMOP concept_name |
|---|---|---|
| `<` | 4171756 | Less than |
| `<=` | 4171754 | Less than or equal to |
| `>=` | 4171755 | Greater than or equal to |
| `>` | 4172703 | Greater than |
| (absent) | null | No operator |

### Type Concept (`measurement_type_concept_id`)

| Concept ID | Concept Name | Usage |
|---|---|---|
| 32817 | EHR | Default for all implementations mapping from FHIR EHR data. Used by this project, HL7 IG, FhirToCdm, ETL-German, fhir-to-omop-demo. |
| 44818702 | Lab result | omoponfhir maps `laboratory` category to this (OMOP → FHIR direction). |
| 44818701 | From physical examination | omoponfhir maps `exam` category to this. |
| 45905771 | Survey | omoponfhir maps `survey` category to this. |

### Common Vital Signs LOINC Codes

| LOINC Code | Display | OMOP Standard Concept | Notes |
|---|---|---|---|
| `85354-9` | Blood pressure panel | N/A | Parent panel -- expanded via components |
| `8480-6` | Systolic blood pressure | 3004249 | Component of BP panel |
| `8462-4` | Diastolic blood pressure | 3012888 | Component of BP panel |
| `8310-5` | Body temperature | 3020891 | Direct measurement |
| `8867-4` | Heart rate | 3027018 | Direct measurement |
| `9279-1` | Respiratory rate | 3024171 | Direct measurement |
| `2708-6` | Oxygen saturation | 3016502 | Direct measurement |
| `29463-7` | Body weight | 3013762 | Direct measurement |
| `8302-2` | Body height | 3036277 | Direct measurement |
| `39156-5` | Body mass index | 3038553 | Direct measurement |

## Value Source Value Construction

The `value_source_value` field captures the raw value as a readable string:

| value[x] type | Construction | Example |
|---|---|---|
| `valueQuantity` | `"{comparator}{value} {unit}"` | `"<10 mg/dL"`, `"120 mmHg"` |
| `valueString` | Verbatim string | `"Positive"` |
| `valueCodeableConcept` | Source code text | `"Detected"` |
| (none) | null | |

## Component Expansion

For multi-component observations (e.g., blood pressure):

| Parent Observation | Component 0 | Component 1 |
|---|---|---|
| Blood Pressure (85354-9) | Systolic (8480-6) | Diastolic (8462-4) |
| **measurement_id** | `{id}-comp-0` | `{id}-comp-1` |
| **code** | component[0].code | component[1].code |
| **value** | component[0].valueQuantity | component[1].valueQuantity |
| **referenceRange** | component[0].referenceRange | component[1].referenceRange |
| **person_id, date, encounter** | inherited from parent | inherited from parent |

The parent observation itself does NOT produce a measurement row when components are present -- only the components do.

omoponfhir handles BP specially: it stores systolic and diastolic as separate `measurement` rows in OMOP, then reconstructs them as FHIR components when reading back. It uses hardcoded LOINC codes (`8480-6`, `8462-4`) and concept IDs (`3004249`, `3012888`) for this. ETL-German also expands BP components and SOFA score components separately.

## Reference Resolution

### `Observation.subject` → `person_id`

Always a `Patient` reference. Resolve to integer `person_id` via the ID mapping context. If unresolvable, defaults to 0 in this project; ETL-German skips the entire resource; omoponfhir throws an exception.

### `Observation.encounter` → `visit_occurrence_id`

Single `Encounter` reference. Resolve to integer `visit_occurrence_id`. If absent, `visit_occurrence_id = null`. FhirToCdm also sets `visit_detail_id` to the same value. ETL-German logs a debug message if no matching encounter is found.

### `Observation.performer[0]` → `provider_id`

`performer` may reference `Practitioner`, `PractitionerRole`, `Organization`, `CareTeam`, `Patient`, or `RelatedPerson`. OMOP `provider` corresponds to `Practitioner` only. This project takes the first entry. omoponfhir resolves to a provider entity and only maps Practitioner references.

## Edge Cases

| Case | Handling | Implementations |
|---|---|---|
| Missing `effectiveDateTime` | Skip -- measurement_date is required. | This project, ETL-German, omoponfhir (falls back to `Date(0)`). |
| `effectivePeriod` instead of dateTime | Use `period.start`. | This project (line 74-75), HL7 IG FML (line 30-32), ETL-German (lines 279-291), omoponfhir (lines 1062-1067). |
| `effectiveInstant` | Not mapped. | HL7 IG FML maps it (line 29); others ignore. |
| `issued` as date fallback | Not mapped. | ETL-German uses `issued` when `effectiveDateTime` is absent (lines 273-276). |
| `valueQuantity` with no `.value` | `value_as_number = null`. `value_source_value` may still have unit info. | All implementations. |
| `valueCodeableConcept` | `value_as_concept_id` needs vocab lookup (placeholder null). Text → `value_source_value`. | This project. omoponfhir performs the lookup (lines 963-990). FhirToCdm performs lookup (lines 538-547). |
| `valueString` | Not applicable for measurement (no `value_as_string`). Captured in `value_source_value`. omoponfhir attempts to map known strings ("detected", "not detected") to concept IDs. | This project, omoponfhir (lines 991-1003). |
| `valueBoolean`, `valueInteger`, `valueRange`, `valueRatio` | Not mapped. Could be coerced to `value_as_number` or `value_source_value`. | No implementation handles these. |
| `dataAbsentReason` present | Dropped. Could be used to populate `value_source_value`. | ETL-German checks for data-absent-reason extensions on status and effective fields. |
| Multiple `referenceRange` entries | Only first range used. | This project, omoponfhir, ETL-German. |
| Multiple `performer` entries | Only first used for `provider_id`. | This project. omoponfhir also takes first. |
| LOINC code not in OMOP vocabulary | `measurement_concept_id = 0`. Code preserved in `measurement_source_value`. | All implementations. |
| UCUM unit not mapped | `unit_concept_id = null`. Unit preserved in `unit_source_value`. | This project. omoponfhir and FhirToCdm perform UCUM → concept lookup. |
| `status` not in {final, amended, corrected} | Skip entire observation. | This project (line 64). ETL-German uses a similar acceptable status list. omoponfhir maps all statuses. |
| Missing `code.coding` | Skip entire observation. | This project (line 69). |
| Unit concept inferred from reference range | Not implemented. | omoponfhir falls back to unit from range quantity if `valueQuantity.unit` is absent (lines 1013-1055). |
| Blood pressure panel code (85354-9) | Expanded via component mechanism. | This project (generic), omoponfhir (hardcoded BP handling, line 871), ETL-German (GECCO-specific BP codes). |

## Implementation Comparison

| Aspect | HL7 IG (FML) | omoponfhir | FhirToCdm | ETL-German | fhir-to-omop-demo | HealthcareLakeETL | fhir-x-omop | This project |
|---|---|---|---|---|---|---|---|---|
| Direction | F→O | F↔O | F→O | F→O | F→O | F→O | F→O | F→O |
| Language | FML | Java | C# | Java | jq | PySpark | Python | TypeScript |
| Status filter | none | none | none | yes | none | none | none | yes (final/amended/corrected) |
| Routing | category (vital-signs, laboratory) | category | measurement only | domain lookup (LOINC → concept → domain) | domain lookup | valueCodeableConcept null check | observation only | category (laboratory, vital-signs) |
| effectivePeriod | yes (start) | yes (start) | no (dateTime only) | yes (start + end) | no | no | no | yes (start) |
| issued fallback | no | no | no | yes | no | no | no | no |
| Components | no | yes (BP hardcoded) | no | yes (BP + SOFA) | no | yes (BP columns) | no | yes (generic) |
| Operator mapping | no | no | no | yes (interpretation → operator) | no | no | no | yes (comparator → concept) |
| Reference range | no | yes | yes | yes | no | no | no | yes |
| Unit concept lookup | no | yes (UCUM vocab) | yes (vocab lookup) | yes (vocab lookup) | yes (pre-joined) | no | no (hardcoded 0) | no (null) |
| value_source_value | no | yes (Quantity.value toString) | yes (ValueAsNumber toString) | yes | no | no | yes (composite) | yes (comparator+value+unit) |
| value_as_concept_id | code passthrough | yes (vocab lookup) | yes (vocab lookup) | yes (vocab lookup) | no | no | yes (code passthrough) | no (null) |
| measurement_source_value | issued or note | identifier.value | no | LOINC code | concept_code | no | coding[0].code | best coding code |
| visit_detail_id | no | no | yes (= visit_occ_id) | no | no | no | yes (= visit_occ_id) | no |
| Notes handling | yes (→ source_value) | yes (via FactRelationship → Note) | no | no | no | no | no | no |

## Sources

- HL7 IG FML: `refs/refs/fhir-omop-ig/input/maps/Measurement.fml` (53 lines)
  - Category routing: line 11 (`vital-signs`, `laboratory`)
  - effective[x] mapping: lines 28-32 (dateTime, instant, Period.start)
  - valueQuantity: lines 40-43
  - valueCodeableConcept: lines 44-48
  - valueString → value_source_value: line 49
  - interpretation → value_as_concept_id: line 50
- omoponfhir Java: `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopObservation.java` (2164+ lines)
  - BP constants: lines 85-90 (SYSTOLIC_CONCEPT_ID = 3004249, DIASTOLIC = 3012888)
  - constructOmopMeasurement: lines 863-1109
  - BP special handling: lines 456-601 (handleBloodPressure)
  - valueQuantity mapping: lines 928-961
  - valueCodeableConcept mapping: lines 963-990
  - valueString → known concepts: lines 991-1003
  - Reference range: lines 1006-1056
  - effectiveDateTime / Period: lines 1058-1071
  - Category → type concept: lines 1080-1104
  - Unit concept (UCUM): lines 932-961
- FhirToCdm C#: `refs/refs/FhirToCdm/FhirToCdmMappings.cs`
  - CreateMeasurement: lines 482-558
  - Reference range: lines 507-513
  - Unit lookup: lines 526-531
  - ValueAsNumber: line 533
  - ValueCodeableConcept: lines 538-547
  - visit_detail_id = visit_occurrence_id: lines 517-518
- ETL-German Java: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ObservationMapper.java` (1700+ lines)
  - Domain-based routing via LoincStandardDomainLookup: lines 542-605
  - Domain switch (Procedure / Observation / Measurement): lines 674-731
  - setUpMeasurement: lines 1167-1226
  - createBasisMeasurement (with interpretation → operator): lines 1597-1638
  - setReferenceRange: lines 1646-1665
  - setValueQuantityInMeasurement: lines 1529-1554
  - setValueCodeableConceptInMeasurement: lines 1474-1517
  - Status filtering: lines 157-166 (FHIR_RESOURCE_OBSERVATION_ACCEPTABLE_STATUS_LIST)
  - effectivePeriod fallback: lines 279-291
  - issued fallback: lines 273-276
  - Component handling (BP, SOFA): lines 1229-1315
- fhir-to-omop-demo jq: `refs/refs/fhir-to-omop-demo/demo/translate/map/Observation.jq` (203 lines)
  - Domain-based routing via code_concept: lines 14-23
  - measurement output: lines 124-149
  - operator_concept_id: line 133 (null -- not mapped)
  - range_low / range_high: lines 137-138 (null -- not mapped)
- HealthcareLakeETL PySpark: `refs/refs/HealthcareLakeETL/mappings/measurement.py` (61 lines)
  - Routing by valueCodeableConcept null check: line 14
  - BP component handling (distolic/systolic columns): lines 51-59
- fhir-x-omop Python: `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/observation.py` (45 lines)
  - All observations → observation table only (no measurement routing)
- This project: `src/mapper/observation.ts` (201 lines)
  - VALID_STATUSES: line 8
  - MEASUREMENT_CATEGORIES: line 14
  - COMPARATOR_CONCEPTS: lines 20-25
  - routeObservation: lines 31-41
  - effectivePeriod.start fallback: lines 74-75
  - buildMeasurement: lines 125-162
  - Component expansion: lines 97-122
- OMOP CDM v5.4 measurement spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 Observation: https://hl7.org/fhir/R4/observation.html
- LOINC to OMOP: https://athena.ohdsi.org/search-terms/terms?vocabulary=LOINC&standardConcept=Standard

### Articles

- [Coded Field Mapping Principles (HL7 IG)](https://build.fhir.org/ig/HL7/fhir-omop-ig/codemappings.html) -- How coded FHIR fields map to OMOP concepts.
- [MENDS-on-FHIR: OMOP CDM and FHIR for chronic disease surveillance (2024)](https://academic.oup.com/jamiaopen/article/7/2/ooae045/7685048) -- Both OMOP observations and measurements represented as FHIR Observation.
- [FHIR to OMOP Cookbook -- mCODE mapping (OHDSI 2024)](https://www.ohdsi.org/wp-content/uploads/2024/10/16-Terry-May_FHIR-to-OMOP-Cookbook-Mapping-mCODE-FHIR-Resources-for-Observational-Research_2024symposium-May-Terry.pdf) -- FHIR Observation may yield Measurement, Condition, or Procedure in OMOP depending on codes.
