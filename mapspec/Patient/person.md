# Patient → person

OMOP CDM v5.4. The `person` table is the central identity record for a Patient. One FHIR Patient maps to exactly one `person` row.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `person_id` | integer | Yes (PK) | Surrogate key. Hash/sequence/lookup of `Patient.id`. HL7 IG FML leaves this as a TODO. |
| `Patient.gender` | `gender_concept_id` | code → integer (FK CONCEPT.Gender) | Yes | `male`→8507, `female`→8532, `other`→8521, `unknown`→8551, missing→0 |
| `Patient.gender` | `gender_source_value` | code → varchar(50) | No | Verbatim FHIR code |
| (rare) | `gender_source_concept_id` | integer (FK CONCEPT) | No | Only if a non-standard vocabulary is used in source extensions (e.g., German `GenderAmtlichDe`). Otherwise 0. |
| `Patient.birthDate` | `year_of_birth` | date → integer | Yes | YYYY component. If missing, OMOP convention says drop the person — most projects use 0 or `null` instead. |
| `Patient.birthDate` | `month_of_birth` | date → integer | No | MM component (1-12). Null if `birthDate` is year-only. |
| `Patient.birthDate` | `day_of_birth` | date → integer | No | DD component. Null if `birthDate` is year/month-only. |
| `Patient.birthDate` + `birth-time` ext | `birth_datetime` | dateTime | No | Combine `birthDate` with `http://hl7.org/fhir/StructureDefinition/patient-birthTime` extension. Use 00:00:00 if extension absent and a value is required. |
| `Patient.extension[us-core-race].ombCategory` | `race_concept_id` | code → integer (FK CONCEPT.Race) | Yes | See vocabulary table below. Missing → 0. |
| `Patient.extension[us-core-race].ombCategory.display` | `race_source_value` | code → varchar(50) | No | Display string of OMB Coding |
| (rare) | `race_source_concept_id` | integer | No | 0 unless source uses a non-OMOP-standard vocab |
| `Patient.extension[us-core-ethnicity].ombCategory` | `ethnicity_concept_id` | code → integer (FK CONCEPT.Ethnicity) | Yes | OMB Hispanic/Not Hispanic only. Missing → 0. |
| `Patient.extension[us-core-ethnicity].ombCategory.display` | `ethnicity_source_value` | code → varchar(50) | No | |
| (rare) | `ethnicity_source_concept_id` | integer | No | 0 default |
| `Patient.address` (selected) | `location_id` | integer (FK LOCATION) | No | Resolves to a row in `location`; see [location.md](./location.md) |
| `Patient.generalPractitioner[*]` (Practitioner) | `provider_id` | integer (FK PROVIDER) | No | Resolve reference to integer `provider_id`. Pick first Practitioner-typed entry; ignore PractitionerRole/Organization here. |
| `Patient.managingOrganization` | `care_site_id` | integer (FK CARE_SITE) | No | Resolve Organization reference |
| `Patient.identifier` (selected) | `person_source_value` | string → varchar(50) | No | Best identifier (SSN > MR > first); encoding varies — see edge cases. |

Fields with no FHIR source: `gender_source_concept_id`, `race_source_concept_id`, `ethnicity_source_concept_id` default to `0` ("No matching concept").

FHIR fields with no OMOP standard target (lost unless using non-standard extensions): `Patient.name`, `Patient.telecom`, `Patient.maritalStatus`, `Patient.communication`, `Patient.contact`, `Patient.photo`, `Patient.active`, `Patient.multipleBirth[x]`, all but one `address[]`, all but one `generalPractitioner[]`.

## Vocabulary Mappings

### Gender (`Patient.gender` → `gender_concept_id`)

| FHIR code | OMOP concept_id | OMOP concept_name |
|---|---|---|
| `male` | 8507 | MALE |
| `female` | 8532 | FEMALE |
| `other` | 8521 | OTHER |
| `unknown` | 8551 | UNKNOWN |
| (absent) | 0 | No matching concept |

OMOP Themis recommends `gender_concept_id` capture **biological sex at birth**, not gender identity. US Core's `us-core-birthsex` (`M`/`F`/`UNK`/`ASKU`) is closer to that intent than `Patient.gender` — `fhir-to-omop-demo` reads birthsex first and falls back to nothing. For interoperability, prefer `Patient.gender`; record any birthsex extension in `gender_source_value` only if it disagrees.

### Race (US Core OMB category → `race_concept_id`)

| OMB code | Display | OMOP concept_id |
|---|---|---|
| `1002-5` | American Indian or Alaska Native | 8657 |
| `2028-9` | Asian | 8515 |
| `2054-5` | Black or African American | 8516 |
| `2076-8` | Native Hawaiian or Other Pacific Islander | 8557 |
| `2106-3` | White | 8527 |
| (absent) | — | 0 |

Multi-race patients: US Core allows multiple `ombCategory` entries. OMOP has a single `race_concept_id` and no concept for "Multiple races." Implementations either: (a) pick the first, (b) pick "Other" → 8522, or (c) write 0. ETL-German uses 8552 ("Unknown"). No consensus.

`detailed` extension entries (e.g., 2036-2 Filipino) are richer than OMB but no standard `race_concept_id` exists for them — store in `race_source_value` if needed.

### Ethnicity (US Core OMB category → `ethnicity_concept_id`)

| OMB code | Display | OMOP concept_id |
|---|---|---|
| `2135-2` | Hispanic or Latino | 38003563 |
| `2186-5` | Not Hispanic or Latino | 38003564 |
| (absent) | — | 0 |

OMB ethnicity is binary (Hispanic / Not Hispanic). FhirToCdm fold-routes a US Core "Hispanic" race entry to ethnicity 38003563 — non-standard but pragmatic.

### Type concepts

`person` has no `_type_concept_id` field; provenance is implicit. (Compare with `death.death_type_concept_id` = 32817 EHR.)

## Reference Resolution

### `generalPractitioner[]` → `provider_id`

`Patient.generalPractitioner` may reference `Practitioner`, `PractitionerRole`, or `Organization`. OMOP `provider` corresponds to `Practitioner` only. Strategy:

1. Iterate `generalPractitioner[]`, filter to `Practitioner` references.
2. Resolve to integer `provider_id` via the same mapping function used by the Practitioner mapper (sequence, hash, or pre-built lookup).
3. If multiple, take the **last** (most recent primary care provider per OMOP convention) or the **first** (omoponfhir's behavior). Document the choice.
4. If reference unresolved at Patient-mapping time, defer or use a placeholder (NACHC defaults to 1).

### `managingOrganization` → `care_site_id`

Single reference. Resolve to integer `care_site_id` from the Organization mapper. Same fallback options as `provider_id`.

## Edge Cases

| Case | Handling |
|---|---|
| Missing `birthDate` | OMOP convention: drop the person. ETL-German derives year from age extension (`http://hl7.org/fhir/StructureDefinition/patient-birthTime` is for time, not age — German uses a custom Age extension). Most implementations write `year_of_birth = 0` and proceed. |
| Partial `birthDate` (`2024`, `2024-03`) | Year always populated; month/day null when not provided. `birth_datetime` requires full precision — leave null if any component missing. |
| Multiple `identifier[]` | Pick best by priority: SSN (`http://hl7.org/fhir/sid/us-ssn`) → MR (`type.coding.code = 'MR'`) → first. Encoding (verbatim, `system\|value`, `system^value`) is implementation-defined and breaks interop — see comparison below. |
| Missing `gender` | `gender_concept_id = 0`, `gender_source_value = null`. Per OMOP Themis, leave concept 0 rather than 8551 (which means explicitly "Unknown"). |
| `deceasedBoolean = true` (no date) | Cannot create `death` row (`death_date` is NOT NULL). Log warning. See [death.md](./death.md). |
| Multiple `address[]` | Pick most recent `home` address. See [location.md](./location.md). |
| `link[]` (replaced-by, replaces) | Patient deduplication signal. No standard mapping; handle upstream or note in source value. |
| Tenant / multi-source | Same FHIR Patient.id from different sources collides. Use a tenant-prefixed surrogate key. |
| `Patient.deceased[x]` is `false` | Person is alive — no `death` record. Do not write a row with null death_date. |

## Implementation Comparison

| Aspect | HL7 IG (FML) | omoponfhir | FhirToCdm | ETL-German | NACHC | omopfhirmap | mends-on-fhir | fhir-to-omop-demo |
|---|---|---|---|---|---|---|---|---|
| Direction | F→O | F↔O | F→O | F→O | F→O | F↔O | O→F | F→O |
| `person_id` strategy | TODO (commented) | direct from FPerson | sequence | sequence | autogen sequence | direct | OMOP source | uses FHIR.id |
| Gender other/unknown | pass-through code | 8521/8551 | 0/0 | concept lookup | null→0/null→0 | 0/0 | 8521/8551 | null (no map) |
| Birthsex source | `Patient.gender` | `Patient.gender` | `Patient.gender` | `Patient.gender` + ext | `Patient.gender` | `Patient.gender` | OMOP gender concept | **us-core-birthsex** ext |
| `birth_datetime` | yes (direct copy) | no | no | no | yes | no | derived | no |
| Race source | — | US Core OMB | US Core display string | German `ethnicGroup` (SNOMED) | US Core, DB-mapped | not mapped (TODO) | OMOP concept → US Core | US Core OMB |
| `provider_id` | — | yes | no | no | default 1 | yes | yes | null |
| `care_site_id` | — | yes | no | no | default 1 | yes | no | null |
| `location_id` | — | yes (linked) | yes (separate row) | post-processed | default 1 | no | partial (state/zip) | null |
| Death record | — | yes | no | yes (post-process) | no | no | no | no |
| Identifier encoding | — | `system^value` | `Patient.id` | MR truncated | `Patient.id` | `Patient.id` | constructed | hapi URL |

The HL7 IG FML maps only `gender` (without translation) and `birthDate` — see source. Everything else is non-normative implementation choice.

## Sources

- HL7 IG FML (normative, minimal): `refs/refs/fhir-omop-ig/input/maps/PersonMap.fml`
- HL7 IG logical model: `refs/refs/fhir-omop-ig/input/fsh/Person.fsh`
- omoponfhir Java (bidirectional, 1338 lines): `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java`
  - Gender concept map: lines 201-213, 1006-1022
  - Identifier `system^value`: lines 188-199, 955-978
  - Birth date split: lines 226-248, 1024-1046
  - Race extension: lines 397-416
  - generalPractitioner resolver: lines 129-138, 568-595
- FhirToCdm C#: `refs/refs/FhirToCdm/FhirToCdmMappings.cs` — `CreatePersonAndLocations()` lines 20-170
  - Gender switch: lines 50-63
  - Race switch (display-string-based): lines 139-165
  - US Core extensions: lines 91-116
- ETL-German Java: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/PatientMapper.java`
  - Gender (with German extension): lines 607-641
  - Birth date from age extension: lines 494-524
  - Address staging via `post_process_map`: lines 293-334
  - Death staging: lines 653-675
  - Incremental update: lines 139-142, 185-191
- NACHC Java: `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/person/OmopPersonBuilder.java`
  - Gender: `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/util/mapping/GenderMapping.java`
  - Race (DB-backed): `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/util/mapping/RaceMapping.java`
  - Ethnicity: `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/util/mapping/EthnicityMapping.java`
  - Race CSV vocabulary: `refs/refs/NACHC-fhir-to-omop/docs/pages/resources/mappings/race-eth/RaceAndEthnicityCDC-OMOP-MAPPING-Race.csv`
- omopfhirmap Java: `refs/refs/omopfhirmap/src/main/java/com/canehealth/omopfhirmap/mapping/PatientMapper.java`
  - `mapOmopToFhir` lines 34-89, `mapFhirToOmop` lines 91-157
- mends-on-fhir Whistle: `refs/refs/mends-on-fhir/whistle-mappings/synthea/whistle-functions/Person_Patient.wstl`
  - Gender ConceptMap: `refs/refs/mends-on-fhir/whistle-mappings/synthea/concept-maps/Person.gender.conceptid.json`
  - Race ConceptMap (OMOP → US Core OMB): `refs/refs/mends-on-fhir/whistle-mappings/synthea/concept-maps/Person.race-concept-id--Patient.x.uscore-omb.json`
- fhir-to-omop-demo jq: `refs/refs/fhir-to-omop-demo/demo/translate/map/Patient.jq`
- fhir-x-omop Python: `refs/refs/fhir-x-omop/fhir_x_omop/to_fhir/patient.py`
- HealthcareLakeETL PySpark: `refs/refs/HealthcareLakeETL/mappings/patient.py`
- GT-FHIR Java (DSTU2 legacy): `refs/refs/GT-FHIR/gt-fhir-entities/src/main/java/edu/gatech/i3l/fhir/dstu2/entities/Person.java`
- FHIROntopOMOP (R2RML): `refs/refs/FHIROntopOMOP/turtle-template/src/main/resources/mapping/Patient.json`
- OMOP CDM v5.4 person spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
