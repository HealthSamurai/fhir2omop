# Procedure → procedure_occurrence

OMOP CDM v5.4. The `procedure_occurrence` table stores procedures performed on a patient. One FHIR Procedure maps to one `procedure_occurrence` row (unless domain routing redirects the code to another table).

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `procedure_occurrence_id` | integer | Yes (PK) | Surrogate key. Hash/sequence/lookup of `Procedure.id`. HL7 IG FML leaves this as a TODO (commented out). NACHC uses `FhirToOmopIdGenerator.getId()`. |
| `Procedure.subject` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference → integer `person_id`. See Reference Resolution below. |
| `Procedure.code` | `procedure_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | Map SNOMED/CPT/ICD-10-PCS/OPS code → OMOP standard concept via vocabulary lookup. Use `concept_relationship` (Maps to) to find the standard concept. 0 if unmapped. See Vocabulary Mappings below. |
| `Procedure.performed[x]` | `procedure_date` | polymorphic → date | Yes | `performedDateTime` → date part, or `performedPeriod.start` → date part. Required — skip resource if absent. |
| `Procedure.performed[x]` | `procedure_datetime` | polymorphic → datetime | No | Full ISO datetime. Same source as `procedure_date` but preserves time component. |
| `Procedure.performedPeriod.end` | `procedure_end_date` | dateTime → date | No | End date for procedures with duration. For `performedDateTime`, ETL-German leaves null; NACHC sets end = start. |
| `Procedure.performedPeriod.end` | `procedure_end_datetime` | dateTime → datetime | No | Full ISO datetime of procedure end. |
| (constant) | `procedure_type_concept_id` | integer (FK CONCEPT) | Yes | Provenance of the record. See Type Concepts below. Most implementations use 32817 (EHR) or 44786630 (Primary Procedure). |
| `Procedure.bodySite[0]` | `modifier_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | SNOMED body site → OMOP concept lookup. ETL-German also checks OPS site localization extension. 0 if unmapped or absent. |
| `Procedure.bodySite[0].coding[0].code` | `modifier_source_value` | code → varchar(50) | No | Raw body site code string. NACHC defaults to "Not Available" if null. |
| `Procedure.performer[0].actor` | `provider_id` | ref → integer (FK PROVIDER) | No | First Practitioner-typed performer. See Reference Resolution below. |
| `Procedure.encounter` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Resolve Encounter reference → integer `visit_occurrence_id`. See Reference Resolution below. |
| (none) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | null in most implementations. FhirToCdm sets it equal to `visit_occurrence_id` (non-standard). |
| `Procedure.code.coding[best].code` | `procedure_source_value` | code → varchar(50) | No | Raw procedure code string. Best code by vocabulary priority (SNOMED > CPT > ICD-10-PCS). |
| `Procedure.code` | `procedure_source_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | Source vocabulary concept_id (non-standard). Lookup the source code in its native vocabulary. NACHC copies `procedure_concept_id` here if null. 0 if unmapped. |
| (none) | `quantity` | integer | No | FHIR Procedure has no quantity field. NACHC defaults to 1. Most implementations leave null. |

Fields with no FHIR source: `visit_detail_id`, `quantity` default to null/0 as noted above.

FHIR fields with no OMOP target: `Procedure.status` (used for filtering only), `Procedure.statusReason`, `Procedure.category`, `Procedure.reasonCode`, `Procedure.reasonReference`, `Procedure.report`, `Procedure.complication`, `Procedure.complicationDetail`, `Procedure.followUp`, `Procedure.focalDevice`, `Procedure.usedCode` (ETL-German routes to `device_exposure`), `Procedure.usedReference`, `Procedure.note`, `Procedure.location`, `Procedure.instantiatesCanonical`, `Procedure.instantiatesUri`, `Procedure.basedOn`, `Procedure.partOf`, `Procedure.recorder`, `Procedure.asserter`, `Procedure.outcome`.

## Vocabulary Mappings

### Procedure Code (`Procedure.code` → `procedure_concept_id`)

| Source Vocabulary | FHIR system URI | OMOP vocabulary_id | Notes |
|---|---|---|---|
| SNOMED CT | `http://snomed.info/sct` | SNOMED | Preferred. Directly maps to standard concepts in Procedure domain. Some SNOMED procedure codes have `domain_id` = Observation, Drug, or Measurement -- requires domain routing. |
| CPT-4 | `http://www.ama-assn.org/go/cpt` | CPT4 | US billing codes. Standard in OMOP Procedure domain. Direct concept lookup. |
| ICD-10-PCS | `http://hl7.org/fhir/sid/icd-10-pcs` | ICD10PCS | US inpatient procedure codes. Map via `concept_relationship` (Maps to) to standard SNOMED concepts. |
| ICD-9-CM (Vol 3) | `http://hl7.org/fhir/sid/icd-9-cm` | ICD9Proc | Legacy US procedure codes. Map via `concept_relationship` (Maps to) to standard concepts. |
| HCPCS | `https://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets` | HCPCS | US healthcare common procedure coding. Maps to standard concepts. |
| OPS | `http://fhir.de/CodeSystem/bfarm/ops` | OPS | German procedure classification (Operationen- und Prozedurenschluessel). Used by ETL-German. Requires custom `ops_standard_domain_lookup` table. |
| DICOM | (custom) | DICOM | ETL-German supports DICOM procedure codes via `source_to_concept_map`. |

**Mapping algorithm:**
1. For each `coding` in `Procedure.code.coding`, look up the code in the OMOP `concept` table using `concept_code` + `vocabulary_id`.
2. If the concept's `standard_concept` = 'S', use its `concept_id` directly.
3. If non-standard, follow `concept_relationship` where `relationship_id` = 'Maps to' to find the standard concept.
4. Check the standard concept's `domain_id` -- if not "Procedure", route to the appropriate table (see Domain Routing below).
5. If multiple codings exist, prefer SNOMED > CPT > ICD-10-PCS > other (implementation-defined priority).

### Body Site (`Procedure.bodySite` → `modifier_concept_id`)

| Source Vocabulary | FHIR system URI | OMOP vocabulary_id | Notes |
|---|---|---|---|
| SNOMED CT (Body Structure) | `http://snomed.info/sct` | SNOMED | Body site concepts in SNOMED hierarchy under 442083009 (Anatomical or acquired body structure). Map to OMOP concept_id. |
| OPS Site Localization | (German extension) | Custom | ETL-German extracts laterality from OPS coding extension `siteLocalization`. Mapped via `source_to_concept_map`. |

### Type Concepts (`procedure_type_concept_id`)

| OMOP concept_id | concept_name | Used By |
|---|---|---|
| 32817 | EHR | FhirToCdm, ETL-German (via `CONCEPT_EHR` constant) |
| 44786630 | Primary Procedure | omoponfhir (default), NACHC |
| 32818 | EHR administration | fhir-x-omop (varies by system URI) |
| 32820 | EHR encounter record | fhir-x-omop (default fallback) |

The OMOP convention is: `procedure_type_concept_id` indicates the **provenance** of the record (EHR, claim, self-reported), not the clinical category. 32817 (EHR) is the most appropriate for FHIR EHR data. 44786630 (Primary Procedure) is a legacy choice from older CDM conventions.

## Reference Resolution

### `Procedure.subject` → `person_id`

`Procedure.subject` references a `Patient`. Resolution strategy:

1. Extract the reference string (e.g., `"Patient/123"` or a full URL).
2. Parse the resource ID from the reference.
3. Look up the corresponding `person_id` using the same ID-mapping function used when the Patient was processed (hash, sequence, or lookup table).
4. If unresolved, skip the Procedure resource -- `person_id` is required. omoponfhir throws `FHIRException("Unable to get OMOP person ID")`. ETL-German logs and returns null.

### `Procedure.encounter` → `visit_occurrence_id`

`Procedure.encounter` references an `Encounter`. Resolution strategy:

1. Extract the reference string.
2. Look up the corresponding `visit_occurrence_id` from the Encounter mapper.
3. If unresolved, set `visit_occurrence_id = null` (optional field). ETL-German logs a debug message but proceeds. omoponfhir throws an exception.

### `Procedure.performer[].actor` → `provider_id`

`Procedure.performer` is a list of BackboneElements, each with an `actor` reference and optional `function` (role). Resolution strategy:

1. Iterate `performer[]` entries.
2. Filter to entries where `actor` references a `Practitioner` resource (not Organization, Patient, PractitionerRole, RelatedPerson, or Device).
3. Resolve the first matching Practitioner reference to integer `provider_id`.
4. If the performer has a `function` (role) coded as a specialty, omoponfhir updates the `provider.specialty_concept` if it was previously empty (lines 460-485).
5. If no Practitioner performer found, `provider_id = null`. NACHC defaults to `provider_id = 1`.

### `Procedure.location` → (no direct OMOP target)

FHIR `Procedure.location` references a `Location` resource, but `procedure_occurrence` has no location field. omoponfhir notes this as a TODO. The information is lost in standard mapping.

## Domain Routing

Some procedure codes have `domain_id` values other than "Procedure" in the OMOP vocabulary. A full implementation must check the domain and route accordingly:

| OMOP Domain | Target OMOP Table | Implementations |
|---|---|---|
| Procedure | `procedure_occurrence` | All |
| Observation | `observation` | ETL-German (line 645-660), NACHC (line 66) |
| Measurement | `measurement` | ETL-German (line 676-692), NACHC (line 62) |
| Drug | `drug_exposure` | ETL-German (line 661-675), NACHC (not handled) |
| Condition | `condition_occurrence` | NACHC (line 65, non-standard) |
| Device | `device_exposure` | ETL-German (lines 218-265, via `usedCode`) |

ETL-German is the most comprehensive: it routes based on the standard concept's `domain_id` and handles OPS, SNOMED, and DICOM vocabularies. NACHC also implements domain routing including the unusual Condition domain. FhirToCdm checks domain but only partially implements routing (line 437-440). omoponfhir and HL7 IG do not implement domain routing.

## Status Filtering

| FHIR Status | Action | Notes |
|---|---|---|
| `completed` | Map | All implementations accept this status. |
| `in-progress` | Skip or Map | ETL-German accepts (in `FHIR_RESOURCE_ACCEPTABLE_EVENT_STATUS_LIST`). Most others skip. |
| `on-hold` | Skip or Map | ETL-German accepts. Most others skip. |
| `unknown` | Skip or Map | ETL-German accepts. Most others skip. |
| `not-done` | Skip | Procedure was not performed. All implementations skip. |
| `entered-in-error` | Skip | Data quality issue. All implementations skip. |
| `stopped` | Skip | Procedure was halted. Most implementations skip. |
| `preparation` | Skip | Procedure not yet started. Most implementations skip. |

ETL-German is the most permissive, accepting: `in-progress`, `on-hold`, `completed`, `unknown` (Constants.java line 106-107). omoponfhir does not filter by status at all (always maps, sets FHIR status to `completed` on reverse mapping). The recommended approach is to map only `completed` procedures.

## performed[x] Handling

| Type | Mapping | Notes |
|---|---|---|
| `performedDateTime` | → `procedure_date` (date part) + `procedure_datetime` (full datetime) | `procedure_end_date` = same date (NACHC) or null (ETL-German). |
| `performedPeriod` | `start` → `procedure_date`/`procedure_datetime`; `end` → `procedure_end_date`/`procedure_end_datetime` | If `end` is absent, NACHC falls back to `start`; ETL-German leaves null. |
| (absent) | Skip resource | `procedure_date` is required. ETL-German logs warning and returns null. HL7 IG FML does not handle this case. |

omoponfhir extracts the date using `performedType.castToDateTime()` or `performedType.castToPeriod().getStart()` (lines 493-510). FhirToCdm always casts to Period (line 445-446), which fails for `performedDateTime`. NACHC uses `getPerformedPeriod()` only (ProcedureParser.java lines 87-93).

## Edge Cases

| Case | Handling |
|---|---|
| Multiple `bodySite` entries | Take first `bodySite[0]` for `modifier_concept_id`. ETL-German additionally filters to SNOMED codings only (line 1069-1071). Remaining body sites are lost. |
| Multiple `performer` entries | Iterate and take first Practitioner-typed actor for `provider_id`. omoponfhir breaks after first match (line 488). Non-Practitioner performers (Organization, Device) are ignored. |
| Multiple `code.coding` entries | Implementations differ. ETL-German processes all codings and selects by vocabulary priority (OPS > DICOM > SNOMED). FhirToCdm creates one row per coding (line 416-417). HL7 IG takes first coding only. Recommended: select best coding by vocabulary priority. |
| `code` with non-Procedure domain | Route to appropriate OMOP table (`drug_exposure`, `observation`, `measurement`). Requires vocabulary lookup. See Domain Routing above. |
| `focalDevice` present | Could create `device_exposure` row. ETL-German handles `usedCode` (not `focalDevice`) for device exposure. No standard mapping for `focalDevice`. |
| `reasonReference` → Condition | Could populate `fact_relationship` to link procedure and condition. Not implemented in any reference. |
| Missing `subject` reference | Skip resource. `person_id` is required. All implementations validate this. |
| Missing `code` | Skip resource. `procedure_concept_id` is required (0 is acceptable). ETL-German logs and skips (line 159-163). |
| `status = entered-in-error` | Skip resource and, for incremental loads, delete any previously mapped record. ETL-German handles deletion explicitly (lines 131-138). |
| Extremely long `procedure_source_value` | OMOP field is `varchar(50)`. Truncate code string to 50 characters. No implementation explicitly handles this. |
| `usedCode` (device codes) | ETL-German creates `device_exposure` rows from `Procedure.usedCode` codings (lines 187-199, 218-265). Other implementations ignore this field. |
| `Procedure.category` | Could inform `procedure_type_concept_id`, but no implementation uses it. omoponfhir has commented-out code for this (lines 382-395). |

## Implementation Comparison

| Aspect | HL7 IG (FML) | omoponfhir | FhirToCdm | ETL-German | NACHC | fhir-x-omop | HealthcareLakeETL |
|---|---|---|---|---|---|---|---|
| Direction | F→O | F↔O | F→O | F→O | F→O | F→O | F→O |
| `procedure_occurrence_id` | TODO (commented) | sequence via IdMapping | (not set) | sequence | `FhirToOmopIdGenerator` | `int(id)` | uses `id` |
| Status filtering | none | none (always maps) | none | `completed`, `in-progress`, `on-hold`, `unknown` | none | none | none |
| `procedure_concept_id` | copies code verbatim | vocab DB lookup (`OmopConceptToUse`) | vocab DB lookup (`LookupCode`) | vocab DB lookup (SNOMED/OPS/DICOM) | DB lookup (`FhirToOmopConceptMapper`) | hardcoded 0 | uses coding array |
| `procedure_type_concept_id` | not set | 44786630 (Primary Procedure) | 32817 (EHR) | 32817 (EHR) | 44786630 | varies by system URI | uses extension |
| Domain routing | no | no | partial (checks domain) | yes (Procedure/Obs/Meas/Drug) | yes (Proc/Obs/Meas/Cond) | no | no |
| `performed[x]` handling | dateTime + Period | dateTime + Period.start | Period only (casts) | dateTime + Period (with start/end) | Period.start/end only | `performedDateTime` only | Period.start only |
| `modifier_concept_id` (body site) | not mapped | not mapped | not mapped | SNOMED body site + OPS localization | defaults to 0 | hardcoded 0 | not mapped |
| `provider_id` | not mapped | first Practitioner performer | not mapped | not mapped | defaults to 1 | `performer[0].actor` | uses performer |
| `visit_occurrence_id` | not mapped | Encounter reference | visit lookup | Encounter reference | Encounter reference | `encounter.reference` | `encounter.reference` |
| `visit_detail_id` | not mapped | not mapped | = `visit_occurrence_id` | not mapped | not mapped | = `visit_occurrence_id` | not mapped |
| `procedure_source_value` | = code value | from concept | not set | = code string | = code string | `code.coding[0].code` | not mapped |
| `procedure_source_concept_id` | = code value | from concept | via LookupCode | = source concept_id | = `procedure_concept_id` | hardcoded 0 | not mapped |
| `quantity` | not mapped | not mapped | not mapped | not mapped | defaults to 1 | hardcoded 1 | not mapped |
| `procedure_end_date` | from Period.end | not mapped | from Period.end | not mapped (only start) | = Period.end or start | not mapped | not mapped |
| Device from `usedCode` | no | no | no | yes (→ device_exposure) | no | no | no |
| Incremental updates | no | no | no | yes (delete + reinsert) | no | no | no |

The HL7 IG FML maps only `code` (without proper concept translation) and `performed[x]` -- everything else is non-normative implementation choice. ETL-German has the most complete mapping with domain routing, body site handling, device exposure from `usedCode`, and incremental update support. omoponfhir is the only bidirectional implementation.

## Sources

- HL7 IG FML (normative, minimal, 29 lines): `refs/refs/fhir-omop-ig/input/maps/Procedure.fml`
  - Code mapping: lines 17-21
  - performed[x] dateTime + Period: lines 23-27
  - procedure_occurrence_id and person_id: commented out (lines 11-16)
- omoponfhir Java (bidirectional, 515 lines): `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopProcedure.java`
  - `constructOmop()` (FHIR→OMOP): lines 369-513
  - Type concept default 44786630: line 64, 398
  - Code → concept lookup: lines 401-410
  - Person mapping: lines 413-429
  - Visit occurrence mapping: lines 431-447
  - Provider/performer mapping: lines 449-490
  - Performed date handling: lines 492-510
  - `constructFHIR()` (OMOP→FHIR): lines 154-233
- FhirToCdm C# (OHDSI, 45 lines of procedure logic): `refs/refs/FhirToCdm/FhirToCdmMappings.cs`
  - `CreateProcedureOccurrence()`: lines 407-451
  - Type concept 32817 (EHR): line 426
  - One row per coding: line 416-417
  - Period start/end parsing: lines 445-446
  - Domain check (Measurement): line 437-440
- ETL-German Java (1140 lines, most complete): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ProcedureMapper.java`
  - Status filtering: lines 140-149
  - Person ID resolution: lines 151-156, 880-885
  - Procedure codings extraction: lines 158-163, 962-983
  - Onset date extraction: lines 165-172, 920-953
  - Visit occurrence resolution: lines 174, 897-912
  - Domain routing switch: lines 628-701
  - `setUpProcedure()` builder: lines 703-734
  - Body site + OPS localization: lines 1007-1082
  - Device exposure from `usedCode`: lines 187-199, 218-265
  - Incremental delete: lines 131-138, 1132-1139
  - Acceptable statuses: `Constants.java` lines 106-107 (`in-progress`, `on-hold`, `completed`, `unknown`)
- NACHC Java (DSTU3, 136 lines): `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/procedure/OmopProcedureBuilder.java`
  - Domain routing: lines 55-72 (Procedure/Measurement/Observation/Condition)
  - `addAsProcedure()`: lines 74-119
  - Type concept 44786630: line 97
  - Defaults: modifier_concept_id=0, provider_id=1, quantity=1 (lines 99-116)
  - ProcedureParser date handling: `ProcedureParser.java` lines 87-109 (Period only, end falls back to start)
- fhir-x-omop Python (34 lines): `refs/refs/fhir-x-omop/fhir_x_omop/to_omop/procedure_occurrence.py`
  - All concept_ids hardcoded to 0
  - Type concept varies by code system URI: lines 14-18
  - `performedDateTime` only (no Period): line 12
- HealthcareLakeETL PySpark (44 lines): `refs/refs/HealthcareLakeETL/mappings/procedure_occurrence.py`
  - Minimal PySpark transformation: lines 4-44
  - Period.start only: line 29
  - No concept mapping
- OMOP CDM v5.4 procedure_occurrence spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 Procedure: https://hl7.org/fhir/R4/procedure.html
