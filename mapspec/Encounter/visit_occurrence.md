# Encounter → visit_occurrence

OMOP CDM v5.4. The `visit_occurrence` table captures each distinct interaction between a patient and the healthcare system. One FHIR Encounter maps to one `visit_occurrence` row.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `visit_occurrence_id` | integer | Yes (PK) | Surrogate key from `Encounter.id`. HL7 IG FML has this commented out as TODO. NACHC uses auto-increment; omoponfhir uses IdMapping; our project hashes `Encounter.id`. |
| `Encounter.subject` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference. omoponfhir throws FHIRException if absent. ETL-German looks up by identifier or logical ID. |
| `Encounter.class.code` | `visit_concept_id` | code → integer (FK CONCEPT) | Yes | See visit type mapping below. Small lookup table; 3-9 entries depending on implementation. |
| `Encounter.period.start` | `visit_start_date` | dateTime → date | Yes | Date portion (YYYY-MM-DD). Skip encounter if absent (our project, ETL-German). omoponfhir writes epoch 0 if absent. |
| `Encounter.period.start` | `visit_start_datetime` | dateTime | No | Full ISO datetime. omoponfhir copies the start Date object directly. |
| `Encounter.period.end` | `visit_end_date` | dateTime → date | Yes | If absent, use `visit_start_date` (our project, NACHC, FhirToCdm). ETL-German uses `LocalDate.now()` for still-admitted patients. |
| `Encounter.period.end` | `visit_end_datetime` | dateTime | No | Full ISO datetime; null if absent. ETL-German uses `LocalDateTime.now()` for CONCEPT_STILL_PATIENT cases. |
| (constant) | `visit_type_concept_id` | integer | Yes | **32817** (EHR) in our project and FhirToCdm. **44818518** (Visit derived from EHR) in omoponfhir and fhir-to-omop-demo. fhir-x-omop also uses 44818518. ETL-German derives from status via concept lookup. |
| `Encounter.participant[0].individual` | `provider_id` | ref → integer (FK PROVIDER) | No | First Practitioner-typed participant (our project). omoponfhir uses `getParticipantFirstRep()`. fhir-to-omop-demo filters for PPRF (primary performer). fhir-x-omop filters for ATND (attending). NACHC defaults to 1. |
| `Encounter.serviceProvider` | `care_site_id` | ref → integer (FK CARE_SITE) | No | Organization reference. omoponfhir resolves via IdMapping. NACHC defaults to 1. FhirToCdm creates a Provider from serviceProvider.display. fhir-to-omop-demo uses `location[0].location.id`. |
| `Encounter.class.code` | `visit_source_value` | code → varchar(50) | No | Verbatim FHIR class code (our project, FhirToCdm). omoponfhir stores `Encounter.id`. NACHC stores encounter ID. ETL-German stores the encounter identifier. |
| (none) | `visit_source_concept_id` | integer | No | 0 in most implementations. NACHC maps via concept lookup when visitConcept has a Visit domain. |
| `Encounter.hospitalization.admitSource` | `admitted_from_concept_id` | CodeableConcept → integer | No | Requires vocabulary lookup. 0 if unmapped (our project, FhirToCdm). ETL-German stores in `post_process_map` for deferred resolution. HL7 IG FML passes through the code directly. NACHC defaults to a constant. |
| `Encounter.hospitalization.admitSource` | `admitted_from_source_value` | varchar(50) | No | Raw admit source code. Our project extracts via `getSourceValue()` and truncates to 50 chars. NACHC stores "Not Available". HL7 IG FML copies the code. |
| `Encounter.hospitalization.dischargeDisposition` | `discharged_to_concept_id` | CodeableConcept → integer | No | Requires vocabulary lookup. 0 if unmapped (our project). fhir-x-omop maps `home→8536`, `snf→8676`, `rehab→8615`, `exp→4216643`. ETL-German uses `post_process_map`. |
| `Encounter.hospitalization.dischargeDisposition` | `discharged_to_source_value` | varchar(50) | No | Raw discharge code. Our project extracts via `getSourceValue()`. fhir-x-omop uses the display. NACHC stores "Not Available". |
| `Encounter.partOf` | `preceding_visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Previous encounter in a chain. Not widely used for this field; most implementations use `partOf` to link child encounters via `visit_detail` instead. |

Fields with no FHIR source: `admitted_from_concept_id`, `discharged_to_concept_id` default to `0`.

FHIR fields with no OMOP target: `Encounter.type` (specific encounter type codes), `Encounter.serviceType`, `Encounter.priority`, `Encounter.reasonCode`, `Encounter.reasonReference`, `Encounter.diagnosis`, `Encounter.location`, `Encounter.length`, `Encounter.account`. Note: fhir-to-omop-demo extracts `Encounter.type` codings to also produce `condition_occurrence`, `observation`, and `procedure_occurrence` rows from the same Encounter resource.

## Vocabulary Mappings

### Visit Type (`Encounter.class.code` → `visit_concept_id`)

| FHIR class code | OMOP concept_id | OMOP concept_name | Notes |
|---|---|---|---|
| `IMP` | 9201 | Inpatient Visit | Universal across all implementations |
| `ACUTE` | 9201 | Inpatient Visit | Acute care treated as inpatient (our project) |
| `AMB` | 9202 | Outpatient Visit | Universal across all implementations |
| `EMER` | 9203 | Emergency Room Visit | Universal across all implementations |
| `HH` | 581476 | Home Visit | Our project. fhir-x-omop uses 581379 (Home Health). |
| `SS` | 9202 | Outpatient Visit | Short stay → outpatient (our project) |
| `OBSENC` | 9201 | Inpatient Visit | Observation encounter → inpatient (our project) |
| `FLD` | 9202 | Outpatient Visit | Field → outpatient (our project, omoponfhir O→F mapping) |
| `VR` | 9202 | Outpatient Visit | Virtual → outpatient (our project). fhir-x-omop uses 32036 (Telehealth). |
| (unknown) | 0 | No matching concept | omoponfhir, ETL-German. Our project also defaults to 0. |

Core consensus: `IMP→9201`, `AMB→9202`, `EMER→9203` are universal across **all** implementations (our project, omoponfhir, FhirToCdm, ETL-German, NACHC, fhir-x-omop, fhir-to-omop-demo, mends-on-fhir). `HH→581476` is used by our project; fhir-x-omop differs (581379). The remaining codes vary -- some implementations use 0 for unknown codes, others route to 9202 as a safe default.

Additional OMOP visit concepts not in the standard FHIR class mapping:
- 262 = Emergency Room and Inpatient Visit (ER→admission). mends-on-fhir maps this back to `IMP`. No F→O implementation detects ER-to-inpatient transitions automatically.
- 9201 = Inpatient Visit (also used for long-term care, rehab)
- 42898160 = Non-hospital institution Visit (SNF, nursing home)
- 8863 = Skilled Nursing Facility. mends-on-fhir maps this to `AMB`.
- 705159 = Ambulatory long COVID clinic. mends-on-fhir maps this to `AMB`.

### Visit Type Concept (`visit_type_concept_id`)

| OMOP concept_id | OMOP concept_name | Used by |
|---|---|---|
| 32817 | EHR | Our project, FhirToCdm, fhir-to-omop-demo (for condition_occurrence) |
| 44818518 | Visit derived from EHR | omoponfhir, fhir-x-omop, fhir-to-omop-demo (for visit_occurrence) |
| 32810 | Claim | Used when source data is claims-based |
| 32827 | EHR encounter record | fhir-to-omop-demo (for observation_period) |

The distinction between 32817 and 44818518 reflects OMOP vocabulary evolution. 32817 (EHR) is from the "Type Concept" vocabulary and is OMOP-recommended for CDM v5.4. 44818518 (Visit derived from EHR) is from an older vocabulary. Both are acceptable. ETL-German derives this from the encounter status via a custom concept lookup.

### Discharge Disposition (`Encounter.hospitalization.dischargeDisposition` → `discharged_to_concept_id`)

| FHIR code | OMOP concept_id | OMOP concept_name | Source |
|---|---|---|---|
| `home` | 8536 | Home | fhir-x-omop |
| `snf` | 8676 | Skilled Nursing Facility | fhir-x-omop |
| `rehab` | 8615 | Rehabilitation Hospital | fhir-x-omop |
| `exp` | 4216643 | Patient died | fhir-x-omop |
| (unmapped) | 0 | No matching concept | our project, FhirToCdm |

Most implementations do not perform discharge vocabulary mapping. HL7 IG FML passes through the code as-is. Our project stores the source value but maps to concept_id 0.

### Admit Source (`Encounter.hospitalization.admitSource` → `admitted_from_concept_id`)

No implementation in the reference set performs a vocabulary lookup for admit source → OMOP concept. All either default to 0 or store the source value only. ETL-German defers this to post-processing. NACHC defaults to a constant.

## Reference Resolution

### `participant[]` → `provider_id`

`Encounter.participant` is an array of individuals involved in the encounter, each with a `type` (admitting, attending, consulting, etc.) and `individual` reference. OMOP has a single `provider_id`.

Strategy:
1. Iterate `participant[]`, find entries where `individual` references a `Practitioner`.
2. Take the first match (our implementation) or prefer `attending`/`ATND` type (fhir-x-omop) or `PPRF` primary performer (fhir-to-omop-demo).
3. Resolve to integer `provider_id` via the Practitioner mapper.
4. omoponfhir uses `getParticipantFirstRep()` without type filtering.
5. NACHC defaults `provider_id` to 1.

### `serviceProvider` → `care_site_id`

Single Organization reference. Resolve to `care_site_id` from the Organization/care_site mapper.

Implementation notes:
- Our project resolves via `ctx.ids.resolveRef()`.
- omoponfhir resolves via `IdMapping.getOMOPfromFHIR()` and loads the `CareSite` entity.
- FhirToCdm creates a `Provider` object from `serviceProvider.display` instead of linking to `care_site`.
- NACHC defaults `care_site_id` to 1.
- fhir-to-omop-demo uses `location[0].location.id` instead of `serviceProvider`.
- ETL-German resolves via department (FAB) code to `care_site`.

### `subject` → `person_id`

Mandatory. All implementations require this reference to be resolvable:
- Our project: `ctx.ids.resolveRef()`, defaults to 0 if unresolved.
- omoponfhir: returns null (skips encounter) if subject is missing.
- ETL-German: looks up by both identifier and logical ID, skips if not found.

## Edge Cases

| Case | Handling |
|---|---|
| Missing `period.start` | Skip -- cannot create visit_occurrence without a start date. (our project, ETL-German). omoponfhir writes epoch 0 (`new Date(0)`). |
| Missing `period.end` | Use `visit_start_date` as `visit_end_date` (our project, NACHC). ETL-German uses `LocalDateTime.now()` for still-admitted patients. omoponfhir writes epoch 0. |
| Status = `planned` / `cancelled` / `entered-in-error` | Skip -- only `finished` and `in-progress` produce rows (our project, ETL-German). omoponfhir does not filter (bidirectional server). FhirToCdm does not filter. |
| Status = `unknown` with no end date | ETL-German treats as CONCEPT_STILL_PATIENT and sets end date to now. |
| Multiple participants | Take first Practitioner reference for `provider_id` (our project). omoponfhir takes `getParticipantFirstRep()`. fhir-to-omop-demo filters for PPRF. fhir-x-omop filters for ATND. |
| `partOf` (nested encounter) | Ideally creates `visit_detail` row linked to parent `visit_occurrence`. ETL-German handles this via `EncounterDepartmentCaseMapper` (706 lines). omoponfhir supports `visit_detail` via `partOf`. Our implementation does not yet support this. |
| No `class` code | `visit_concept_id = 0` (our project, omoponfhir). ETL-German returns CONCEPT_NO_MATCHING_CONCEPT. |
| Class code not in lookup | `visit_concept_id = 0` (our project, omoponfhir). FhirToCdm defaults to 9202. fhir-x-omop defaults to 9202. |
| ER-to-inpatient admission | Two separate encounters in FHIR; could merge into OMOP concept 262 (ER+Inpatient). No implementation does this automatically -- requires post-processing. |
| Missing `subject` | Skip -- cannot create visit_occurrence without `person_id`. All implementations skip or throw. |
| Encounter with `location[]` transfers | ETL-German creates one `visit_detail` row per location with separate start/end dates from `location[].period`. Other implementations ignore location transfers. |
| German-specific class codes (`station`, `stationaer`) | ETL-German maps these to CONCEPT_INPATIENT (9201). Not relevant for US Core data. |
| `visit_type_concept_id` variation | 32817 (EHR) vs 44818518 (Visit derived from EHR). Both acceptable. Choose based on CDM version guidance. |
| `hospitalization` absent | All admit/discharge fields default to 0/null. No error. |
| Encounter without an `id` | Our project: `visit_occurrence_id` remains undefined. Most implementations require an ID for FK resolution by downstream mappers. |
| Long source values | Our project truncates `admitted_from_source_value` and `discharged_to_source_value` to 50 chars. ETL-German truncates to `MAX_SOURCE_VALUE_LENGTH`. |

## Implementation Comparison

| Aspect | HL7 IG (FML) | omoponfhir (Java) | FhirToCdm (C#) | ETL-German (Java) | NACHC (Java) | fhir-to-omop-demo (jq) | fhir-x-omop (Python) | HealthcareLakeETL (PySpark) | mends-on-fhir (Whistle) | This project (TS) |
|---|---|---|---|---|---|---|---|---|---|---|
| Direction | F→O | F↔O | F→O | F→O | F→O | F→O | F→O | F→O | O→F | F→O |
| Language | FML | Java | C# | Java | Java | jq | Python | PySpark | Whistle | TypeScript |
| Lines | 44 | 425 | ~80 (method) | 872 (visit_occ) + 706 (visit_detail) | 90 + 70 | 146 | 55 | 40 | 107 | 80 |
| Status filter | none | none (bidir) | none | yes (configurable list) | none | none | none | none | N/A (O→F) | yes (finished, in-progress) |
| Class mapping | pass-through code | enum (IMP/AMB/EMER only) | hardcoded (IMP/EMER, else 9202) | concept lookup + German codes | DB-backed concept lookup | via vocab-enriched type | hardcoded (5 codes, default 9202) | column rename (no mapping) | ConceptMap JSON | hardcoded (9 codes) |
| `visit_type_concept_id` | not set | 44818518 | 32817 | derived from status | EMR constant | 44818518 | 44818518 | from extension | N/A | 32817 |
| `visit_detail` | no | yes (via partOf) | no | yes (dept transfers, locations) | no | no | no | no | no | no |
| Admit/discharge concept | pass-through | no | no | post_process_map | defaults | no | yes (4 codes) | column rename | no | no (0) |
| Admit/discharge source | pass-through | no | no | post_process_map | "Not Available" | no | yes | admitSource rename | no | yes (source value) |
| `provider_id` | no | yes (firstParticipant) | no | no | default 1 | yes (PPRF) | yes (ATND) | column rename | no | yes (first Practitioner) |
| `care_site_id` | no | yes (serviceProvider) | no (creates Provider) | yes (FAB code) | default 1 | yes (location[0]) | yes (serviceProvider) | column rename | no | yes (serviceProvider) |
| End date fallback | no | epoch 0 | yes (from Period.End) | now() for still-patient | yes (= start) | no fallback | no fallback | no fallback | N/A | yes (= start date) |
| `person_id` resolution | commented out | IdMapping + FPerson | via personIds dict | identifier + logical ID lookup | from parent OmopPerson | `.subject.id` | reference split | column rename | OMOP source | ctx.ids.resolveRef |
| Diagnosis extraction | no | linked via conditionOccurrence | no | post_process_map (rank, use, type) | no | condition_occurrence from type | no | no | no | no |
| Incremental updates | no | yes (update if exists) | no | yes (delete + recreate) | no | no | no | no | no | no |
| Observation period | no | no | no | yes (post_process_map) | no | yes (separate row) | no | no | no | no |

## Sources

### Reference implementation files

- HL7 IG FML (normative, minimal): `refs/refs/fhir-omop-ig/input/maps/EncounterVisit.fml` (44 lines)
  - Class mapping (pass-through): lines 20-24
  - Period → dates: lines 26-29
  - Admission/discharge (pass-through): lines 31-43
  - Note: uses R5 field names (`actualPeriod`, `admission`) not R4 (`period`, `hospitalization`)
- omoponfhir Java (bidirectional, 425 lines): `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopEncounter.java`
  - `constructFHIR()` O→F: lines 92-223 -- visit concept name → class code, period, serviceProvider, participant, diagnosis
  - `constructOmop()` F→O: lines 285-424 -- subject, visit source, period, class→visit_concept_id, visit_type hardcoded 44818518, participant→provider, serviceProvider→care_site
  - Class code mapping (IMP/AMB/EMER only, else 0): `OmopConceptMapping.java` lines 68-71, 197-213
  - Period handling: lines 329-346 (epoch 0 fallback for missing dates)
  - Provider from participant: lines 371-383
  - Care site from serviceProvider: lines 386-396
- FhirToCdm C# (F→O, ~80 lines for encounter method): `refs/refs/FhirToCdm/FhirToCdmMappings.cs`
  - `CreateVisitOccurenceAndProvider()`: lines 173-250
  - Class code mapping: lines 183-188 (IMP→9201, EMER→9203, else 9202)
  - visit_type_concept_id hardcoded 32817: line 237
  - Provider from serviceProvider.display: lines 215-224
  - No participant mapping, no hospitalization mapping
- ETL-German Java (F→O, visit_occurrence): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/EncounterInstitutionContactMapper.java` (872 lines)
  - Status filtering: lines 138-146 (uses configurable ACCEPTABLE_STATUS_LIST)
  - Person ID resolution: lines 264-272
  - Visit onset extraction: lines 280-298
  - Visit occurrence creation: lines 312-348 (visit_concept_id via concept lookup, visit_type from status)
  - End date handling (still-patient → now()): lines 410-424
  - Admission reason extraction: lines 457-506
  - Discharge reason extraction: lines 519-571
  - Diagnosis information (rank, use): lines 744-795
  - Observation period creation: lines 835-845
- ETL-German Java (F→O, visit_detail): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/EncounterDepartmentCaseMapper.java` (706 lines)
  - Department case → visit_detail: lines 104-192
  - Location-based visit_detail creation: lines 384-431
  - German class code handling (station/stationaer → inpatient): lines 648-663
  - End date with still-patient logic: lines 672-689
- NACHC Java (F→O): `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/visitoccurrence/OmopVisitOccurrenceBuilder.java` (90 lines)
  - Visit occurrence building: lines 50-88
  - End date fallback (= start): lines 59-61
  - Visit concept via DB-backed FhirToOmopConceptMapper: lines 66-74
  - Defaults: care_site_id=1, provider_id=1, admitted_from/discharged_to set to constants
  - Encounter parser: `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/fhir/parser/encounter/EncounterParser.java` (70 lines)
- fhir-to-omop-demo jq (F→O): `refs/refs/fhir-to-omop-demo/demo/translate/map/Encounter.jq` (146 lines)
  - visit_occurrence: lines 48-67 -- also produces condition_occurrence, observation, procedure_occurrence, and observation_period from the same Encounter
  - Provider via PPRF participant type: lines 13-15
  - visit_type_concept_id = 44818518: line 57
  - care_site from location[0].location.id: line 59
  - All admit/discharge fields null: lines 62-66
- fhir-x-omop Python (F→O, 55 lines): `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/visit_occurrence.py`
  - Class mapping (5 codes, HH→581379, VR→32036, default 9202): lines 23-29
  - visit_type_concept_id = 44818518: line 34
  - Provider via ATND participant type: lines 7-17
  - Discharge concept mapping (home/snf/rehab/exp): lines 41-46
  - visit_source_value from type[0] coding (not class): line 37
- HealthcareLakeETL PySpark (F→O, 40 lines): `refs/refs/HealthcareLakeETL/mappings/visit_occurrence.py`
  - Simple column rename, no concept mapping: lines 29-36
  - No vocabulary translation; admitSource → admitted_from_concept_id as raw rename
- mends-on-fhir Whistle (O→F, 107 lines): `refs/refs/mends-on-fhir/whistle-mappings/synthea/whistle-functions/Visit_Encounter.wstl`
  - visit_concept_id → Encounter.class via ConceptMap: line 17
  - ConceptMap JSON: `refs/refs/mends-on-fhir/whistle-mappings/synthea/concept-maps/VisitOccurrence.visit-concept-id--Encounter.class.json` (74 lines)
  - Maps 9201→IMP, 9202→AMB, 9203→EMER, 262→IMP, 8863→AMB, 705159→AMB
- This project TypeScript (F→O, 80 lines): `src/mapper/encounter.ts`
  - Class mapping (9 codes): lines 8-18
  - Status filter (finished, in-progress): lines 20-21
  - visit_type_concept_id = 32817: line 24
  - Provider from first Practitioner participant: lines 27-36
  - Hospitalization source values: lines 55-60

### Specifications

- OMOP CDM v5.4 visit_occurrence: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 Encounter: https://hl7.org/fhir/R4/encounter.html
- FHIR ActEncounterCode value set: http://terminology.hl7.org/ValueSet/v3-ActEncounterCode
- OMOP visit concepts: https://athena.ohdsi.org/search-terms/terms?domain=Visit&standardConcept=Standard
- OMOP type concepts: https://athena.ohdsi.org/search-terms/terms?vocabulary=Type+Concept

### Articles

- [Common Challenges When Transforming FHIR to OMOP](https://build.fhir.org/ig/HL7/fhir-omop-ig/F2OGeneralIssues.html) -- Identifier management, temporal precision, vocabulary alignment.
- [Toward bidirectional FHIR-OMOP CDM transformations using TermX (2026)](https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2026.1736785/full) -- Covers Encounter→Visit Occurrence mapping methodology.
- [An ETL-process design for data harmonization with German real-world data (2022)](https://www.sciencedirect.com/science/article/pii/S1386505622002398) -- ETL-German design including encounter processing at 10 university hospitals.
- [GT-FHIR OMOP Mapping](http://gt-health.github.io/GT-FHIR/fhir_omop_mapping.html) -- Per-resource mapping table including Encounter.
