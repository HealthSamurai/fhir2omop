# Observation → observation (OMOP)

OMOP CDM v5.4. The OMOP `observation` table stores qualitative clinical findings: social history, lifestyle factors, survey responses, activity data, and other observations that don't fit measurement's quantitative model. One FHIR Observation (or one component) maps to one OMOP `observation` row.

Note: this file documents the FHIR Observation → OMOP observation mapping. The OMOP `observation` table also receives data from other FHIR resources (AllergyIntolerance, FamilyMemberHistory -- see their respective mapspec folders).

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `observation_id` | integer | Yes (PK) | Surrogate key from `Observation.id` (+ `-comp-N` for components). |
| `Observation.subject` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference. |
| `Observation.code` (or component.code) | `observation_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | LOINC/SNOMED → OMOP standard concept. Placeholder: 0. |
| `Observation.effectiveDateTime` | `observation_date` | dateTime → date | Yes | Date portion (YYYY-MM-DD). Falls back to `effectivePeriod.start` if dateTime absent. |
| `Observation.effectiveDateTime` | `observation_datetime` | dateTime | No | Full ISO datetime. Falls back to `effectivePeriod.start`. |
| (constant) | `observation_type_concept_id` | integer | Yes | 32817 (EHR). |
| `valueQuantity.value` | `value_as_number` | decimal → float | No | Numeric result (if applicable -- uncommon for qualitative observations). |
| `valueString` or `valueCodeableConcept` text | `value_as_string` | string → varchar(60) | No | Text result. valueString first; fall back to CodeableConcept source text. |
| `valueCodeableConcept` | `value_as_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | Coded result. Requires vocabulary lookup. Placeholder: null. |
| `interpretation[0].coding[0].code` | `qualifier_source_value` | code → varchar(50) | No | Interpretation code (e.g., "H" for High, "L" for Low). Falls back to `interpretation[0].text`. |
| `interpretation` | `qualifier_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | Requires vocabulary lookup. Placeholder: null. |
| `valueQuantity.unit` | `unit_source_value` | string → varchar(50) | No | Raw unit string. |
| (none) | `unit_concept_id` | integer (FK CONCEPT) | No | UCUM → OMOP unit concept. Placeholder: null. |
| `Observation.performer[0]` | `provider_id` | ref → integer (FK PROVIDER) | No | First performer. |
| `Observation.encounter` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Resolve Encounter reference. |
| (none) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | Not mapped. |
| `code.coding[best].code` | `observation_source_value` | code → varchar(50) | No | Best code by vocabulary priority (LOINC > SNOMED > first). |
| (none) | `observation_source_concept_id` | integer | No | 0. |
| (computed) | `value_source_value` | string → varchar(50) | No | Same construction as measurement: `"{comparator}{value} {unit}"` or valueString or CodeableConcept text. |
| (none) | `observation_event_id` | integer | No | Not mapped. fhir-to-omop-demo sets to encounter.id. |
| (none) | `obs_event_field_concept_id` | integer | No | Not mapped. |

FHIR fields with no OMOP target: same as measurement -- `method`, `bodySite`, `specimen`, `device`, `note`, `dataAbsentReason`, `hasMember`, `derivedFrom`, `referenceRange` (not relevant for qualitative observations but preserved if present), `issued`, `focus`, `partOf`.

## Vocabulary Mappings

### Domain Routing (category-based)

FHIR Observations are routed to OMOP `observation` (vs. `measurement`) based on `Observation.category`. Codes from system `http://terminology.hl7.org/CodeSystem/observation-category`:

| FHIR Category Code | Routes To | Rationale |
|---|---|---|
| `social-history` | **observation** | Qualitative lifestyle/social factors |
| `survey` | **observation** | Questionnaire/survey responses |
| `activity` | **observation** | Physical activity data |
| `laboratory` | measurement | Quantitative lab results |
| `vital-signs` | measurement | Quantitative vitals |
| (absent / unknown) | measurement | Default -- labs are most common |

The HL7 IG FML routes a broader set of categories to the observation table: `social-history`, `imaging`, `survey`, `exam`, `therapy`, `activity`, and `procedure`. This project uses a narrower set (`social-history`, `survey`, `activity`) to avoid routing exam/imaging/therapy data that might be better as measurements.

### Category → Type Concept

| Category Code | This Project | omoponfhir (OMOP → FHIR) |
|---|---|---|
| `social-history` | 32817 (EHR) | N/A |
| `survey` | 32817 (EHR) | 45905771 (Survey) |
| `activity` | 32817 (EHR) | N/A |
| `exam` | N/A (routes to measurement) | 44818701 (From physical examination) |
| `laboratory` | N/A (routes to measurement) | 44818702 (Lab result) |

### Common Social History LOINC Codes

| LOINC Code | Display | Category | Notes |
|---|---|---|---|
| `72166-2` | Tobacco smoking status | social-history | Most common social history observation |
| `11367-0` | History of tobacco use | social-history | Detailed smoking history |
| `74013-4` | Alcoholic drinks per day | social-history | Alcohol consumption |
| `11331-6` | History of alcohol use | social-history | Alcohol use narrative |
| `76689-9` | Sex assigned at birth | social-history | Demographic observation |

### Interpretation Mapping (`interpretation` → `qualifier_concept_id` / `qualifier_source_value`)

| FHIR Interpretation Code | Display | OMOP qualifier_source_value | Notes |
|---|---|---|---|
| `H` | High | `"H"` | Above reference range |
| `L` | Low | `"L"` | Below reference range |
| `N` | Normal | `"N"` | Within reference range |
| `A` | Abnormal | `"A"` | Outside reference range |
| `HH` | Critical high | `"HH"` | Critically above range |
| `LL` | Critical low | `"LL"` | Critically below range |

System: `http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation`

The `qualifier_concept_id` requires a vocabulary lookup to map these codes to OMOP concepts. Currently set to null (placeholder). ETL-German maps interpretation to `operator_concept_id` in the measurement table instead.

## Differences from Measurement

| Aspect | measurement | observation (OMOP) |
|---|---|---|
| `value_as_string` | not available | yes -- text results |
| `qualifier_concept_id` | not available | yes -- interpretation |
| `qualifier_source_value` | not available | yes -- raw interpretation code |
| `operator_concept_id` | yes (comparators) | not available |
| `range_low` / `range_high` | yes | not available |
| `observation_event_id` | N/A | yes -- links to related event |
| `obs_event_field_concept_id` | N/A | yes -- field concept of linked event |

## Reference Resolution

### `Observation.subject` → `person_id`

Always a `Patient` reference. Resolve to integer `person_id` via the ID mapping context. If unresolvable, defaults to 0 in this project; ETL-German skips the entire resource.

### `Observation.encounter` → `visit_occurrence_id`

Single `Encounter` reference. Resolve to integer `visit_occurrence_id`. If absent, `visit_occurrence_id = null`.

### `Observation.performer[0]` → `provider_id`

Same as measurement -- takes the first performer reference. Only `Practitioner` references are meaningful for OMOP `provider`.

## Component Expansion

The OMOP observation table supports component expansion identically to measurement. Each component produces its own `observation` row with an ID suffix (`-comp-N`). The parent metadata (person, encounter, date, provider) is inherited; each component uses its own code, value, and interpretation.

This is less common for observation-routed data (most social history / survey items are not multi-component), but is supported for completeness.

## Edge Cases

| Case | Handling | Implementations |
|---|---|---|
| `valueString` present | → `value_as_string` directly. | This project (line 187), HL7 IG FML (line 49), fhir-to-omop-demo (line 160), HealthcareLakeETL (line 31). |
| `valueCodeableConcept` with no matching OMOP concept | `value_as_concept_id = null`. Text → `value_as_string`. | This project (lines 188-189). |
| `valueBoolean` | Not mapped to a specific field. Could use `value_as_string` = "true"/"false" or `value_as_concept_id` with yes/no concepts (4188539 = Yes, 4188540 = No). | No implementation handles this. |
| `valueInteger` | Not mapped. Could use `value_as_number`. | No implementation handles this. |
| `interpretation` with multiple codings | Only first coding used for `qualifier_source_value`. Falls back to `interpretation[0].text` if no coding. | This project (lines 56-58). |
| Social history observation (e.g., smoking status) | Maps correctly via category routing. LOINC code → `observation_concept_id`. | This project, omoponfhir, ETL-German. |
| Survey/questionnaire item | Each item becomes a separate observation row. Consider `QuestionnaireResponse` mapper for structured surveys. | All implementations. |
| Missing `effectiveDateTime` | Skip -- `observation_date` is required. | This project (lines 78-80). |
| `effectivePeriod` instead of dateTime | Use `period.start`. | This project (lines 74-75), HL7 IG FML (lines 31-33). |
| `issued` as date fallback | Not mapped. | ETL-German uses `issued` when effective is absent. |
| `status` not in {final, amended, corrected} | Skip entire observation. | This project (line 64). |
| Missing `code.coding` | Skip entire observation. | This project (line 69). |
| `dataAbsentReason` present | Dropped. Could populate `value_as_string`. | No implementation maps this. |
| Categories not in routing set (exam, imaging, therapy, procedure) | Route to measurement (default). | This project. HL7 IG routes these to observation. ETL-German uses domain lookup. |
| LOINC code with Observation domain but lab category | Category wins (→ measurement). | This project. ETL-German: domain wins. |

## Implementation Comparison

| Aspect | HL7 IG (FML) | omoponfhir | ETL-German | fhir-to-omop-demo | HealthcareLakeETL | fhir-x-omop | This project |
|---|---|---|---|---|---|---|---|
| Direction | F→O | F↔O | F→O | F→O | F→O | F→O | F→O |
| Language | FML | Java | Java | jq | PySpark | Python | TypeScript |
| Routing to observation | category (7 codes) | category | domain lookup | domain lookup | valueCodeableConcept not-null | all → observation | category (3 codes) |
| value_as_string | yes (valueString) | yes (via FObservationView) | yes | yes (valueString) | yes (CC text) | yes (valueString) | yes (valueString or CC text) |
| value_as_concept_id | yes (code passthrough) | yes (vocab lookup) | yes (vocab lookup) | no (null) | no | yes (code passthrough) | no (null) |
| qualifier_concept_id | no | no | no | no | no | no | no (null) |
| qualifier_source_value | no | no | no | no | no | yes (code display) | yes (interpretation code) |
| value_as_number | yes (Quantity) | yes | yes | yes (Quantity) | no | yes (Quantity) | yes (Quantity) |
| unit_concept_id | yes (unit passthrough) | yes (vocab lookup) | yes (vocab lookup) | yes (pre-joined) | no | no (0) | no (null) |
| observation_source_value | issued or note | identifier.value | LOINC code | concept_code | no | coding[0].code | best coding code |
| value_source_value | no | no | no | Quantity.value | no | composite | yes (comparator+value+unit) |
| observation_event_id | no | no | no | yes (encounter.id) | no | no | no |
| Components | no | yes (via measurement) | yes | no | no | no | yes |
| Status filter | none | none | yes | none | none | none | yes (final/amended/corrected) |
| effectivePeriod | yes (start) | yes (start) | yes (start + end) | no | no | no | yes (start) |
| Note: HL7 IG observation categories | `social-history`, `imaging`, `survey`, `exam`, `therapy`, `activity`, `procedure` | -- | -- | -- | -- | -- | `social-history`, `survey`, `activity` |

## Sources

- HL7 IG FML: `refs/refs/fhir-omop-ig/input/maps/Observation.fml` (52 lines)
  - Category routing: line 12 (`social-history`, `imaging`, `survey`, `exam`, `therapy`, `activity`, `procedure`)
  - effective[x] mapping: lines 29-33 (dateTime, instant, Period.start)
  - valueQuantity: lines 40-42
  - valueCodeableConcept: lines 44-48
  - valueString → value_as_string: line 49
  - note → observation_source_value: line 50
- omoponfhir Java: `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopObservation.java` (2164+ lines)
  - constructOmopObservation: lines 1111-1390
  - Code concept lookup (LOINC priority): lines 1142-1159
  - valueQuantity mapping: lines 1197-1230
  - valueCodeableConcept mapping: lines 1232-1280
  - valueString mapping: lines 1282-1290
  - Category → routing decision: lines 1353-1390 (constructOmopMeasurementObservation)
  - Category → type concept mapping: lines 1082-1104
- ETL-German Java: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ObservationMapper.java` (1700+ lines)
  - Domain routing to Observation: line 692 (OMOP_DOMAIN_OBSERVATION case)
  - setUpObservation: lines 692-707
  - Domain lookup via LoincStandardDomainLookup: lines 542-605
  - History of travel special handling: lines 297-398
- fhir-to-omop-demo jq: `refs/refs/fhir-to-omop-demo/demo/translate/map/Observation.jq` (203 lines)
  - Domain-based routing: lines 31-44 (excludes Condition, Device, Drug, Measurement, Procedure)
  - observation output: lines 151-174
  - valueString → value_as_string: line 160
  - observation_event_id = encounter.id: line 172
- HealthcareLakeETL PySpark: `refs/refs/HealthcareLakeETL/mappings/observation.py` (44 lines)
  - Routing by valueCodeableConcept not-null: line 14
  - value_as_string from CC text: line 31
- fhir-x-omop Python: `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/observation.py` (45 lines)
  - All observations → observation table (no routing): lines 14-39
  - qualifier_source_value = code display (unusual choice): line 36
  - value_source_value from composite: line 37
  - type_concept_id varies by code system (LOINC=32817, SNOMED=32818): lines 21-24
- This project: `src/mapper/observation.ts` (201 lines)
  - OBSERVATION_CATEGORIES: line 17
  - buildObservation: lines 165-201
  - value_as_string construction: lines 187-189
  - qualifier_source_value from interpretation: lines 176-177, 198
  - Component expansion: lines 97-122
- OMOP CDM v5.4 observation spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 Observation: https://hl7.org/fhir/R4/observation.html
