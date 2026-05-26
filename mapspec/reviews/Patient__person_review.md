# Patient → person — review

**Status:** closed (2026-05-26). All findings resolved or documented as
non-issues; current implementation is the project's reference-quality
edge.

## 1. Summary

OMOP `person` is the central identity table; every clinical event row
carries a `person_id` FK back to it. Our edge is **implemented**
([`mapspec/edges/Patient__person.json`](../edges/Patient__person.json)):
18 columns, four `cm.*` ConceptMaps, plus two project-native FHIR
extensions (`omop-race`, `omop-ethnicity`) that bypass US Core OMB
translation when the source already speaks OMOP. On a 100-patient
Synthea cohort it materializes 105 rows with full FK alignment to
location / provider / care_site.

The big takeaway: **our implementation exceeds the primary reference
(HL7 FHIR↔OMOP IG `PersonMap.fml`)** — the IG's FML is an 8-line
skeleton with `person_id` commented out as a TODO and race / ethnicity
/ location absent entirely. Where we differ from the IG narrative or
from secondary refs (FhirToCdm, NACHC, ETL-German), the differences are
defensible and in most cases more correct.

## 2. Reference inventory

| Ref | File (`refs/refs/...`) | Approach | Coverage |
|---|---|---|---|
| **fhir-omop-ig** (primary) | `fhir-omop-ig/input/maps/PersonMap.fml` | FML StructureMap — skeleton | gender (no translation), birthDate substring-parse. id, race, ethnicity, location, provider, care_site all absent. `person_id` explicitly commented out: "should actually be a translate". |
| fhir-omop-ig (intro) | `…/pagecontent/StructureMap-PersonMap-intro.md` | Narrative; sex vs gender identity discussion | Table: male=8507 / female=8532 / **other=44814653** / unknown=8551. Convention: time-varying gender identity goes to Observation, not person. |
| fhir-omop-ig (logical) | `…/input/fsh/Person.fsh` | FSH target description | `gender_concept_id` 1..1, treated as "biological sex at birth", not gender identity. |
| fhir-omop-ig (general) | `F2OGeneralIssues.md`, `StrategiesBestPractices.md` | Methodology | Identifier handling, null semantics, source-value preservation, temporal precision (OMOP = date). |
| omoponfhir-omopv5-r4-mapping | `…/mapping/OmopPatient.java:180–340` | Reverse direction (OMOP → FHIR) | Identifier split on `^` (`vocab^code^value`), birthDate fallback 1970-06-15, SSN as separate identifier. |
| FhirToCdm | `FhirToCdm/FhirToCdmMappings.cs:20–170` (`CreatePersonAndLocations`) | C# .NET, hardcoded switch | gender: Male/Female → 8507/8532, everything else → 0. No `other`. Race: Synthea-text switch (`ASIAN`/`BLACK`/`OTHER` → 8522/`WHITE`/`HISPANIC`). Ethnicity: only `race=HISPANIC` → 38003563. Takes `RaceSourceValue` from `Coding.Display` — less stable than ombCategory.code. |
| ETL-German-FHIR-Core | `…/mapper/PatientMapper.java:580–680` | Java + lookup table `source_to_concept_map` | gender via `getCustomConcepts(gender, SOURCE_VOCABULARY_ID_GENDER, dbMappings)` — DB-driven, plus German `genderAmtlichDe` extension for `other`. `data-absent-reason` recognized explicitly. Death written via `post_process_map`. |
| NACHC-fhir-to-omop | `…/util/mapping/GenderMapping.java`, `…/builder/person/OmopPersonBuilder.java` | Java, sequence id + DB lookup | gender: Male/Female only (else → null → 0); `RaceMapping.getOmopConceptForFhirCode(code)` via DB. Crutch: when location / care_site / provider is null → **1** (magic default). |
| fhir-to-omop-demo | `…/translate/map/Patient.jq` | jq script, @tsv output | **Takes `us-core-birthsex` (M/F)** for gender_concept_id, ignoring Patient.gender entirely — matches our COALESCE priority. Birthdate split via jq `tonumber`. |
| mends-on-fhir | `mends-on-fhir/whistle-mappings/synthea/concept-maps/Person.gender.conceptid.json` | Whistle ConceptMap (reverse) | Only 8507 ↔ male, 8532 ↔ female, 0 ↔ unknown. Demonstrates Whistle ConceptMap form (Google Healthcare). |

## 3. Side-by-side comparison

OMOP `person` columns in the order our SQL inserts them
(see [`mapspec/etl/Patient__person.sql`](../etl/Patient__person.sql)).
"IG" = what `PersonMap.fml` actually does (not the intro narrative).

| OMOP column | Ours | IG (PersonMap.fml) | omoponfhir | FhirToCdm | NACHC | German | jq |
|---|---|---|---|---|---|---|---|
| `person_id` | `hashtextextended(Patient.id, 0)` — deterministic 64-bit hash | TODO, commented out | Reverse: DB id | `personIds` Dictionary, sequence | `FhirToOmopIdGenerator.getId` — sequence | Sequence | `.id` verbatim (breaks integer FK) |
| `gender_concept_id` | `COALESCE(us_core_birthsex, gender)` → `cm.gender_to_omop` → COALESCE 0 | Direct code → integer (incorrect) | Reverse | Switch on `Male`/`Female`, else 0 | DB lookup → null → 0 | `getCustomConcepts(gender, 'Gender', dbMappings)` | us-core-birthsex M/F → 8507/8532, else null |
| `gender_source_value` | `COALESCE(us_core_birthsex, gender)` | `cast(gender, "string")` | Reverse | `Patient.Gender.ToString()` | `gender.toCode()` | gender string | `gender.valueCode` |
| `gender_source_concept_id` | `COALESCE(g.source_concept_id, 0)` | — | — | — | `setGenderSourceConceptId(genderId)` — writes the same concept_id | — | null |
| `year_of_birth` | `EXTRACT(YEAR FROM birth_date::date)` | `substring(0,4)` string — no cast | DateTime.Parse | DateTime.Parse | `patient.getBirthYear()` | parse | jq `split("-")[0] | tonumber` |
| `month_of_birth` | `EXTRACT(MONTH ...)` | `substring(5,2)` | — | DateTime.Parse | — | — | jq tonumber |
| `day_of_birth` | `EXTRACT(DAY ...)` | `substring(8,2)` | — | DateTime.Parse | — | — | jq tonumber |
| `birth_datetime` | `COALESCE(birth_time::timestamp, birth_date::timestamp)` — picks up patient-birthTime extension | `bdSrc` from birthDate | Fallback 1970-06-15 | DateTime.Parse | `patient.getBirthDate()` | LocalDateTime parse, ZoneId Europe/Berlin | `null` |
| `race_concept_id` | `COALESCE(omop_race_code::int, rt.concept_id WHEN race_omb_code='UNK', r.concept_id, 0)` — OMOP-native extension wins | — | — | Switch on text (`ASIAN`/`BLACK`/`OTHER` → 8522/…) | `RaceMapping.getOmopConceptForFhirCode(code)` via DB | — | `.race.concept_id` already decoded |
| `race_source_value` | `COALESCE(omop_race_display, race_text)` (US Core extension `text`) | — | — | `Coding.Display` (less stable) | OMB code | — | `.race.concept_code` |
| `race_source_concept_id` | `COALESCE(r.source_concept_id, 0)` (always 0 by OMOP spec — see §4.5) | — | — | — | `setRaceSourceConceptId(raceId)` — duplicates concept_id | — | `.race.source_concept_id` |
| `ethnicity_concept_id` | `COALESCE(omop_ethnicity_code::int, e.concept_id, 0)` | — | — | Switch on OMB display: only Mexican/Puerto Rican/… → 38003563 | DB lookup | — | `.ethnicity.concept_id` |
| `ethnicity_source_value` | `COALESCE(omop_ethnicity_display, ethnicity_text)` | — | — | `Coding.Display` | OMB code | — | `.ethnicity.concept_code` |
| `ethnicity_source_concept_id` | `COALESCE(e.source_concept_id, 0)` (always 0 — see §4.5) | — | — | — | Duplicate | — | — |
| `location_id` | `stringToId(concat_ws('|', line, city, state, zip))` — **composite address hash, dedups across patients** | — | Reverse: address from FPerson.location | Per-address Location aggregate | Magic 1 default | — | null |
| `provider_id` | `referenceToId(general_practitioner_ref)` (Practitioner.id UUID via search-ref resolver) | — | — | Empty (TODO) | Magic 1 default | — | null |
| `care_site_id` | `referenceToId(managing_organization_ref)` | — | — | — | Magic 1 default | — | null |
| `person_source_value` | `v.id` (Patient.id UUID) — OMOP traceability key, not PHI | — | Identifier split `^vocab^code^value` | `patient.Id` | `patient.getId()` | — | `hapi_url` http://localhost:8080/Patient/... |

## 4. Findings

### 4.1. `PersonMap.fml` is not the source of truth

[`refs/refs/fhir-omop-ig/input/maps/PersonMap.fml:10–18`](../../refs/refs/fhir-omop-ig/input/maps/PersonMap.fml)
is **8 lines** of rules. `person_id` is commented out with "should
actually be a translate". `gender_concept_id` is a direct
`tgt.gender_concept_id = gender` (type mismatch — would be a runtime
error). Race / ethnicity / identifiers / location are absent. **The
normative IG content lives in `pagecontent/` MD files**, not in the
FML. Same pattern applies for all other edges: the FML is declarative
sketch, not implementation.

### 4.2. IG intro vs Athena vocab — `other` gender concept_id

`StructureMap-PersonMap-intro.md:91–94` claims `"other" → 44814653`.
**Concept 44814653 is not in Athena** (v20260227 bundle):

```sql
SELECT * FROM vocab.concept WHERE concept_id = 44814653;  -- 0 rows
```

Standard Gender concepts are only 8507 / 8532. `8521 OTHER` and
`8551 UNKNOWN` exist but `standard_concept IS NULL` (non-Standard).
`8570 AMBIGUOUS` exists too (also non-Standard). Our
`cm.gender_to_omop` maps `other → 8521`, `unknown → 8551` — matches
OHDSI Themis convention ("0 for absent, non-Standard for
known-but-non-binary") and is factually more correct than the IG
intro's 44814653.

**Resolution:** kept 8521; note added to
`mapspec/edges/Patient__person.json` `vocabularies[gender].entries[other].notes`.
SQL header in `Patient__person.sql` flags this as an intentional
deviation from the IG.

### 4.3. gender vs birthsex priority — we agree with jq, IG silent

`Patient.gender` in FHIR R4 is administrative (passport / ticket
gender), can diverge from biological sex. The IG intro is clear that
`gender_concept_id` in OMOP is biological sex; gender identity goes to
Observation. We use `COALESCE(us_core_birthsex, gender)` — birthsex
preferred (US Core extension, M/F). [`Patient.jq:30–40`](../../refs/refs/fhir-to-omop-demo/demo/translate/map/Patient.jq)
takes birthsex and **ignores** Patient.gender entirely. FhirToCdm /
NACHC / German take Patient.gender. Our COALESCE is the right
compromise: prefer biological sex when available, fall back otherwise.

### 4.4. `location_id` dedup — composite address hash

**Resolution:** implemented as
`stringToId(concat_ws('|', line, city, state, zip))` on both sides
(`Patient__person.sql` for the FK, `Patient__location.sql` with
`DISTINCT ON (location_id)` for the row producer). Two patients
sharing an address now share one location row.

Bonus side fix: `location_source_value` was wrongly written as
`v.location_state` — now the verbatim composite address (line, city,
state, zip) truncated to varchar(50), with a PII note in the SQL
header per OMOP privacy guidance.

Synthea has all-unique addresses so no visible diff on our cohort, but
a clone-address test patient confirmed the dedup mechanism is live
(106 patients, 105 locations, 1 pair shares `location_id`).

### 4.5. `*_source_concept_id` always 0 — not a bug

OMOP CDM v5.4 `race_source_concept_id` user_guidance literally says:

> "Due to the small number of options, this tends to be zero. If the
> source data codes race in an OMOP supported vocabulary store the
> concept_id here."

Same wording on `ethnicity_source_concept_id`. So 0 is the
spec-recommended value, not a coverage gap.

Why we can't do better: Athena's `Race` vocabulary uses concept_codes
`1`–`5`, `9`, `UNK` (e.g. concept_id 8527 has concept_code `5` for
White), **not** the OMB codes (`2106-3`, `2054-5`, …). The OMB code
system is not loaded under any race-related `vocabulary_id` in
Athena, so an OMB source code has no Athena counterpart to point at.
Copying the standard target into the source slot (NACHC style) breaks
the "trace which source vocab this came from" semantics.

**Resolution:** documented in
`mapspec/edges/Patient__person.json` field notes and in CLAUDE.md
"OMOP `*_source_concept_id` semantics — zero is fine". The
`omop-source-vocabulary` extension hook in
`src/conceptmap/materialize.ts` remains; a future Athena bundle that
loads OMB Race as a non-Standard vocab would auto-populate this
column with no edge change.

### 4.6. `birth_datetime` — patient-birthTime extension

**Resolution:** view extracts
`birthDate.extension(patient-birthTime).valueDateTime` as `birth_time`;
SQL uses `COALESCE(birth_time::timestamp, birth_date::timestamp)` for
`birth_datetime`. Synthea doesn't emit the extension so its
midnight fallback is unchanged, but a synthetic test patient with the
extension set to `1990-06-15T13:45:00-05:00` confirms the timestamp
flows through.

### 4.7. `person_source_value` — Patient.id, not SSN

The edge JSON originally claimed `Patient.identifier (best: SSN > MR
> first)`. Per OMOP `person_source_value` user_guidance this column
is a **traceability key to the source record**, not a clinical
identifier:

> "Use this field to link back to persons in the source data. This is
> typically used for error checking of ETL logic."

The SQL was already writing `Patient.id` (correct). The edge spec was
the lie. Synthea's other identifiers (SS / MR / DL / PPN) are PHI and
per OHDSI privacy guidance belong in a separate id-mapping table, not
here.

**Resolution:** edge JSON `fields[person_source_value]` corrected to
`Patient.id` with a long-form note citing the OMOP guidance. Project-
wide convention written into CLAUDE.md
"OMOP `*_source_value` semantics".

### 4.8. Death — separate edge by design

ETL-German bundles Patient → person + death in one mapper via
`post_process_map`. We keep `Patient__death` as a separate edge for
separation of concerns. Costs a second pass over `fhir.patient`; not
a blocker.

### 4.9. cm.* materialization — aligned with German / NACHC

IG `codemappings.md` and `StrategiesBestPractices.md` recommend a DB
mapping table (`source_to_concept_map` or local equivalent). We do
this via `cm.*` tables materialized from `mapspec/profiles/*.cm.json`.
Architecturally identical to German / NACHC (DB-driven), but the
input is FHIR ConceptMap JSON in the repo — declarative.

### 4.10. Provider / care_site FK integrity (cross-edge)

This wasn't visible in the original review — found by deep dive after
the dedup work. Synthea writes search-form references for Practitioner /
Organization / Location:

```
"reference": "Practitioner?identifier=http://hl7.org/fhir/sid/us-npi|9999998799"
```

`getReferenceKey()` returned the tail-after-`:` (`us-npi|9999998799`),
which doesn't match the hash on the producer side (Practitioner__provider
hashed NPI directly). Result: **0/6388** Encounter → provider FKs
resolved, **0/4592** drug_exposure, **0/8701** note. Every provider FK
across the project was dangling.

**Resolution:** `script/resolve-search-refs.ts` walks `fhir.*` and
rewrites all `Resource?identifier=…|VALUE` references to
`Resource/<UUID>` form using each resource's own identifier array.
Practitioner__provider now hashes Practitioner.id (not NPI) — aligned
with all 9 consumers. After the fix: 6388/6388 visit_occurrence,
4592/4592 drug_exposure, 6388/8701 note (the 2313 remaining
unresolved are Organization-typed DR.performer — a separate concern,
fixed under task #29).

## 5. ConceptMap audit

Five ConceptMaps from `mapspec/profiles/` materialized into `cm.*`:

| ConceptMap | `cm.*` table | Rows | Notes |
|---|---|---|---|
| `gender-to-omop.cm.json` | `cm.gender_to_omop` | 8 | Two groups (FHIR R4 lowercase + HL7 v3 uppercase M/F/OTH/UNK) |
| `race-omb-to-omop.cm.json` | `cm.race_omb_to_omop` | 6 | OMB codes |
| `race-text-synthea-to-omop.cm.json` | `cm.race_text_synthea_to_omop` | 2 | Synthea-specific escape for UNK + text='Other' |
| `ethnicity-omb-to-omop.cm.json` | `cm.ethnicity_omb_to_omop` | 2 | Hispanic / Not Hispanic |
| (new) `omop-race.valueset.json` + `omop-ethnicity.valueset.json` | — | 7 + 2 | Athena concepts allowed in the new project-native extensions |

Concept IDs verified against the May 2026 Athena bundle:

```
8507  MALE      Gender    Standard='S'
8532  FEMALE    Gender    Standard='S'
8521  OTHER     Gender    Standard=NULL  (non-Standard, valid)
8551  UNKNOWN   Gender    Standard=NULL
8657  American Indian or Alaska Native     Race   Standard='S'
8515  Asian                                Race   Standard='S'
8516  Black or African American            Race   Standard='S'
8527  White                                Race   Standard='S'
8557  Native Hawaiian or Other Pacific Islander  Race  Standard='S'
8522  Other Race                           Race   Standard=NULL
8552  Unknown                              Race   Standard=NULL
38003563  Hispanic or Latino       Ethnicity  Standard='S'
38003564  Not Hispanic or Latino   Ethnicity  Standard='S'
44814653  — NOT IN VOCAB (IG intro doc error, see §4.2)
```

All `cm.*.target_concept_id` values resolve. `source_concept_id` is 0
across all maps per OMOP convention (see §4.5).

## 6. Resolution log

| # | Item | Resolution |
|---|---|---|
| 4.2 | 44814653 in IG intro doc | Note added to edge JSON `vocabularies[gender].entries[other]`. SQL header documents the deviation. Kept 8521 per Themis. |
| 4.4 | location_id dedup | Implemented `stringToId(concat_ws('|', line, city, state, zip))` on both sides. Clone-address test confirms. Bonus: `location_source_value` fix + PII note. |
| 4.5 | source_concept_id = 0 | Closed as not-a-bug. OMOP spec literally says "tends to be zero". Documented in edge JSON + CLAUDE.md. |
| 4.6 | birth_time extension | View + SQL updated. Synthetic test patient with `patient-birthTime='1990-06-15T13:45:00-05:00'` confirms the timestamp flows through. |
| 4.7 | person_source_value spec drift | Edge JSON corrected; SQL was already right. CLAUDE.md "OMOP `*_source_value` semantics" added. |
| — | SQL header documenting deviations | Block in `Patient__person.sql` calls out the three intentional deviations (4.2, 4.4, 4.7). |
| 4.10 | Provider / care_site FK | `script/resolve-search-refs.ts` pre-rewrites search-refs; Practitioner ETL aligned to hash Practitioner.id. 0 dangling FKs across all event tables. |

### Beyond the review

Three additions made during the review pass that the original review
didn't flag:

- **OMOP-native extensions.** New `omop-race` / `omop-ethnicity`
  StructureDefinitions + ValueSets, wired into the Patient profile as
  preferred slices over US Core. ETL `COALESCE`s OMOP-native first,
  US Core / OMB as fallback. Lets a source that already speaks OMOP
  bypass ConceptMap translation entirely.
- **`stringToId` helper.** `mapspec/etl/_functions.sql` now exposes
  a general-purpose null-safe string-hash primitive;
  `referenceToId` is a thin wrapper. Used for composite-key
  surrogates (e.g. address dedup).
- **PII labelling on `location_source_value`.** SQL header in
  `Patient__location.sql` flags this column as PII-bearing per OMOP
  CDM Privacy guide; downstream de-id should redact.

## 7. Cross-cutting notes for other edges

Findings from the IG / refs that don't apply to person but matter for
other edges:

- **`F2OGeneralIssues.md` §"Status and Intent Elements".** `MedicationRequest`,
  `Procedure`, `Encounter`, etc. carry `status` (`completed` /
  `planned` / `cancelled` / `in-progress` / `entered-in-error`). OMOP
  convention: only completed events become facts.
  **Done:** filters added across 10 edges (MedicationRequest,
  MedicationAdministration, Procedure, Encounter, Immunization,
  DiagnosticReport ×4, Observation ×2, Observation_component ×2,
  Condition.verificationStatus; AllergyIntolerance had it already).
- **`F2OGeneralIssues.md` §"HL7 Flavors of Null".** `data-absent-reason`
  extension. Not handled anywhere yet. Synthea rarely emits;
  production EHR routinely does.
- **`F2OGeneralIssues.md` §"Temporal Precision".** OMOP `*_date` is
  `DATE`, `*_datetime` is `TIMESTAMP`. Per-CSV TZ convention partially
  documented in `mapspec/GAPS.md` §9. Per-edge audit still pending.
- **`StrategiesBestPractices.md` §"Differentiating Patient-Reported vs
  Clinician-Verified".** `*_type_concept_id` columns
  (`drug_type_concept_id`, `observation_type_concept_id`, etc.)
  should reflect provenance. We hardcode them as constants in
  medication / observation / procedure edges.

These four points should be considered in each subsequent edge review
rather than copy-pasted.
