# FHIR → OMOP via SQL on FHIR + Library/Query

How to express the entire FHIR→OMOP transformation as a DAG of FHIR
resources — `ViewDefinition` for flat staging, `ConceptMap` for
terminology bridges, `Library` (with chained Query semantics) for
intermediate transformations, and a final mart of OMOP tables. No
external orchestration, no Java code, no FHIR Mapping Language.

This file is the architectural counterpart to [`MAPPING.md`](./MAPPING.md)
(which catalogs *what's hard*) and [`mapspec/`](./mapspec/) (which
documents *what to map*). SOF-MAPPING describes *how to execute*.

---

## 1. Why this approach

The reference implementations under `refs/refs/` split into two camps:

- **Imperative code** — Java (omoponfhir, ETL-German, NACHC), C#
  (FhirToCdm), Python (HealthcareLakeETL, fhir-x-omop), Whistle
  (mends-on-fhir). The mapping logic is buried in functions, not
  inspectable, not composable, not versioned at the field level.
- **Declarative non-FHIR** — FML in fhir-omop-ig (HL7 normative).
  FML is declarative but is its own DSL, has no DAG composition, no
  test layer, and few engines support it well.

SQL on FHIR (`hl7.fhir.uv.sql-on-fhir`) introduced
`ViewDefinition` — a FHIR resource that projects FHIR JSON into a flat
SQL table via FHIRPath columns. That solved the *flatten* part. The
recent addition of executable `Library` resources holding SQL/CQL with
chained-query semantics (each Library can read upstream Library
outputs) closes the gap: now an entire ETL pipeline is **expressible
as a bundle of FHIR resources**, with the same governance, validation,
versioning, and round-tripping that any FHIR data gets.

The result is a dbt-style DAG of FHIR resources. dbt's value
proposition — composable models, ref-based dependencies, tests as
data, documentation co-located with logic — translates almost 1-to-1
into this stack.

---

## 2. Layered architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ Layer                  Resources                  dbt analog         │
├──────────────────────────────────────────────────────────────────────┤
│ 1. Sources             FHIR raw resources         sources             │
│ 2. Staging             ViewDefinition             models/staging      │
│ 3. Seeds (vocab)       ConceptMap, CodeSystem,    seeds, macros       │
│                        bulk-loaded CONCEPT        (Athena dump)       │
│ 4. Intermediate        Library + chained Query    models/intermediate │
│ 5. Marts (OMOP)        Library + chained Query    models/marts        │
│ 6. Tests               Query / Library            tests               │
│ 7. Documentation       Library.description,       docs                │
│                        relatedArtifact            (mapspec/*.md)      │
└──────────────────────────────────────────────────────────────────────┘
```

Every node in the DAG is a versioned, FHIR-validated, navigable
resource. Dependencies are explicit FHIR `Reference`s.

### Layer 1 — Sources

Whatever the FHIR data store contains. For Aidbox / Pathling / HAPI:
JSONB-backed FHIR resources. For Bulk Data: NDJSON pulled via
`$export`. For this project: `data/<ResourceType>.ndjson` (see
[CLAUDE.md](./CLAUDE.md)).

### Layer 2 — Staging (ViewDefinition)

One `ViewDefinition` per FHIR resource type (or per profile, where
relevant). Goal: a flat SQL table that mirrors the resource's
*shape*, no semantic interpretation. All FHIRPath polymorphism
(`effective[x]`, `medication[x]`, contained references) is resolved
here, but no vocabulary lookup, no FK resolution.

```yaml
# example: ViewDefinition/patient_flat
resource: Patient
select:
  - column:
      - { name: id, path: id }
      - { name: gender, path: gender }
      - { name: birth_date, path: birthDate }
      - { name: deceased_datetime, path: deceasedDateTime }
  - forEach: name
    column:
      - { name: name_use, path: use }
      - { name: name_family, path: family }
      - { name: name_given, path: given.first() }
  - forEach: address
    column:
      - { name: addr_use, path: use }
      - { name: addr_line, path: line.first() }
      - { name: addr_city, path: city }
      - { name: addr_state, path: state }
      - { name: addr_zip, path: postalCode }
  - forEach: extension.where(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.where(url='ombCategory')
    column:
      - { name: race_omb_code, path: valueCoding.code }
      - { name: race_omb_display, path: valueCoding.display }
```

Output: SQL table `patient_flat(id, gender, birth_date, deceased_datetime, name_use, name_family, name_given, addr_use, ..., race_omb_code, ...)`.

A patient with two addresses and three race entries produces multiple
rows; collapsing to one-per-person happens in Layer 4.

### Layer 3 — Seeds (vocabulary)

Two distinct sub-layers, both addressable as FHIR resources but
materialized differently:

**3a. Small mapping tables → `ConceptMap`** (gender, US Core race
OMB, FHIR OrganizationType, CMS Place of Service, FHIR Encounter
class, etc.). Each is ≤ ~20 rows. Native FHIR resource, validates,
versions, supports `$translate` operation. Stored as resources.

```yaml
# ConceptMap/gender-fhir-to-omop
sourceUri: http://hl7.org/fhir/administrative-gender
targetUri: http://omop.org/concept-id
group:
  - element:
      - { code: male,    target: { code: '8507' } }
      - { code: female,  target: { code: '8532' } }
      - { code: other,   target: { code: '8521' } }
      - { code: unknown, target: { code: '8551' } }
```

**3b. Athena vocabulary dump → bulk-loaded CONCEPT/CONCEPT_ANCESTOR/
CONCEPT_RELATIONSHIP tables**. ~6M concepts. Loading every concept
as a FHIR `CodeSystem` is impractical (and not what FHIR was designed
for). Instead: load CSV directly into Postgres tables, then expose a
**marker `Library`** that documents the source CSV, version, and
last-loaded timestamp, and references the underlying tables by name.
This is identical to dbt seeds + `{{ source() }}` references.

```yaml
# Library/athena-vocab-v5
url: http://example.org/Library/athena-vocab-v5
version: 5.0-2025-Q1
status: active
type: { coding: [{ system: ..., code: asset-collection }] }
content:
  - contentType: text/x-sql
    title: schema.sql
    data: <base64-encoded CREATE TABLE concept (...) etc.>
relatedArtifact:
  - type: depends-on
    document: { url: https://athena.ohdsi.org/vocabulary/list }
extension:
  - url: http://example.org/StructureDefinition/library-physical-table
    valueCode: omop_vocab.concept
```

Layer 4/5 Libraries `JOIN omop_vocab.concept ON ...` directly. The
marker exists so the DAG knows about it.

### Layer 4 — Intermediate (Library + Query)

Reusable transformations that aren't yet OMOP marts. Examples:

- `Library/person_id_map` — surrogate `person_id` generation
  (`ROW_NUMBER() OVER (ORDER BY patient_id)` or hash-based, one
  choice for the project).
- `Library/medication_resolved` — collapse contained + bundle +
  external `medicationReference` into a single (subject_id,
  drug_code, drug_system, drug_text) row per medication-event
  resource.
- `Library/observation_with_domain` — `JOIN` flat observation onto
  Athena `concept` to get `domain_id`, used by domain routing.
- `Library/encounter_resolved` — flatten `partOf` recursion via
  recursive CTE for `visit_detail` parentage.

Each Library has:
- `content[]` — the SQL/expression as base64 text or attachment
- `parameter[]` — typed input declarations (`subject_table`,
  `vocab_version`)
- `relatedArtifact[]` of type `depends-on` — references to upstream
  Libraries / ViewDefinitions / ConceptMaps. **This is the DAG.**
- `description` — what the model does, in prose

Query semantics on top: a downstream Library reads an upstream
Library's output by referencing it. Engines materialize or inline
based on cost.

### Layer 5 — Marts (OMOP tables)

One `Library` per OMOP table (`person`, `visit_occurrence`,
`measurement`, `drug_exposure`, ...). Reads from staging +
intermediate, applies type concepts and final FK resolution, writes
to the OMOP-shaped destination table.

### Layer 6 — Tests

Tests are also Libraries. Each emits a row count or SQL boolean. By
convention, a test passing returns zero rows (the "failures" view).

```yaml
# Library/test-measurement-required-fields
content:
  - contentType: text/x-sql
    data: |
      SELECT measurement_id, 'measurement_concept_id is null' AS reason
      FROM measurement WHERE measurement_concept_id IS NULL
      UNION ALL
      SELECT measurement_id, 'person_id is null'
      FROM measurement WHERE person_id IS NULL
      UNION ALL
      SELECT measurement_id, 'measurement_date is null'
      FROM measurement WHERE measurement_date IS NULL
relatedArtifact:
  - { type: depends-on, resource: Library/measurement_omop }
```

### Layer 7 — Documentation

`mapspec/<Resource>/<table>.md` files become the human-readable
counterpart of each mart Library. The Library's
`relatedArtifact[type=documentation]` points back to the markdown.
This is the bidirectional bridge: spec ↔ executable.

---

## 3. Worked examples for the hard problems in MAPPING.md

### 3.1 Patient → person (surrogate ID, multi-race collapse)

```
Patient (raw)
   └─→ ViewDefinition/patient_flat              (Layer 2)
            ↓
   ConceptMap/gender-fhir-to-omop               (Layer 3a)
   ConceptMap/us-core-race-to-omop              (Layer 3a)
            ↓
   Library/person_id_map                        (Layer 4)
       SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS person_id
       FROM patient_flat
            ↓
   Library/person_omop                          (Layer 5)
       INSERT INTO person
       SELECT
         m.person_id,
         translate('gender', p.gender) AS gender_concept_id,
         CAST(strftime('%Y', p.birth_date) AS INTEGER) AS year_of_birth,
         ...
         -- multi-race collapse: pick first ombCategory if multi
         translate('race', FIRST(p.race_omb_code)) AS race_concept_id,
         ...
       FROM patient_flat p
       JOIN person_id_map m ON p.id = m.id
       LEFT JOIN address_resolved a ON ...
       GROUP BY m.person_id, p.gender, p.birth_date, ...
            ↓
   Library/test-person-required-fields          (Layer 6)
```

`translate()` is a FHIR-native operation (or the SQL equivalent
exposed by the engine) that consults the named ConceptMap. The race
collapse rule is documented in `Library/person_omop.description` and
mirrored in `mapspec/Patient/person.md` — the docs and the executable
are intentionally co-located so they don't drift.

### 3.2 Observation → measurement / observation (domain routing)

The hardest problem in MAPPING.md becomes a single intermediate
Library plus two mart Libraries:

```
Observation (raw)
   └─→ ViewDefinition/observation_flat          (Layer 2)
            ↓
   Library/athena-vocab-v5                      (Layer 3b, marker)
            ↓
   Library/observation_with_domain              (Layer 4)
       SELECT o.*, c.concept_id, c.domain_id, c.standard_concept
       FROM observation_flat o
       LEFT JOIN omop_vocab.concept c
         ON c.concept_code = o.code
        AND c.vocabulary_id = vocab_for(o.code_system)
            ↓
            ├─→ Library/measurement_omop        (Layer 5, domain='Measurement')
            ├─→ Library/observation_omop        (Layer 5, domain='Observation')
            ├─→ Library/condition_from_obs      (Layer 5, domain='Condition')
            ├─→ Library/procedure_from_obs      (Layer 5, domain='Procedure')
            ├─→ Library/drug_from_obs           (Layer 5, domain='Drug')
            └─→ Library/device_from_obs         (Layer 5, domain='Device')
```

Each mart Library is a `WHERE c.domain_id = '<Domain>'` filter on the
intermediate, plus column-shaping for the destination OMOP table.
This is exactly the routing that *every* reference implementation
either skips or hardcodes — here it's six clean Library resources
sharing one upstream.

### 3.3 MedicationRequest → drug_exposure (medication resolution)

The trick is collapsing `medicationCodeableConcept` and
`medicationReference` into a single normalized form before the mart:

```
MedicationRequest (raw)
   └─→ ViewDefinition/medication_request_flat   (Layer 2)
Medication (raw)
   └─→ ViewDefinition/medication_flat           (Layer 2)
            ↓
   Library/medication_resolved                  (Layer 4)
       -- inline CodeableConcept path
       SELECT mr.id, mr.subject_id,
              mr.med_code AS drug_code,
              mr.med_system AS drug_system,
              mr.med_text AS drug_text
       FROM medication_request_flat mr
       WHERE mr.med_code IS NOT NULL
       UNION ALL
       -- reference path: join through Medication resource
       SELECT mr.id, mr.subject_id,
              m.code AS drug_code, m.system, m.text
       FROM medication_request_flat mr
       JOIN medication_flat m ON m.id = mr.med_reference
       WHERE mr.med_reference IS NOT NULL
            ↓
   Library/athena-vocab-v5  (RxNorm/ATC/NDC)    (Layer 3b)
            ↓
   Library/drug_exposure_from_medreq            (Layer 5)
       -- + days_supply derivation, refills, route, type=38000177
```

Reference resolution that omoponfhir does in 1338 lines of Java (and
that most projects skip entirely) becomes one `UNION ALL` in a Library.

### 3.4 AllergyIntolerance.reaction[] flatten

```
AllergyIntolerance (raw)
   └─→ ViewDefinition/allergy_flat              (Layer 2)
            forEach: reaction
              forEach: manifestation
                column: { name: manifestation_code, path: coding[0].code }
                column: { name: severity, path: ../severity }
            ↓
   Library/observation_from_allergy             (Layer 5)
```

`forEach` cardinality fan-out is exactly the operation OMOP needs
(one observation row per reaction × manifestation), and it's a single
FHIRPath construct in ViewDefinition.

### 3.5 Encounter.partOf → visit_detail (recursive)

```
Encounter (raw)
   └─→ ViewDefinition/encounter_flat            (Layer 2)
            ↓
   Library/encounter_hierarchy                  (Layer 4)
       WITH RECURSIVE encounter_tree AS (
         SELECT id, partOf_id, 0 AS depth, id AS root_id
         FROM encounter_flat WHERE partOf_id IS NULL
         UNION ALL
         SELECT e.id, e.partOf_id, t.depth + 1, t.root_id
         FROM encounter_flat e JOIN encounter_tree t ON e.partOf_id = t.id
       )
       SELECT * FROM encounter_tree
            ↓
            ├─→ Library/visit_occurrence_omop   (depth = 0, root encounters)
            └─→ Library/visit_detail_omop       (depth > 0, descendants)
```

Recursive CTE is plain SQL; the only reason this is hard in
imperative code is bookkeeping. Library-as-DAG-node makes it natural.

---

## 4. Execution order (DAG)

The execution engine walks the dependency graph topologically:

```
Layer 3a (ConceptMaps)         Layer 3b (Athena vocab marker)
        │                              │
        └──────────┬───────────────────┘
                   │
        Layer 2: all ViewDefinitions (parallel)
                   │
        Layer 4: intermediate Libraries
        ├─ person_id_map
        ├─ medication_resolved
        ├─ observation_with_domain
        ├─ encounter_hierarchy
        └─ ...
                   │
        Layer 5: mart Libraries (in admin → patient → encounter → events order)
        ├─ Location/location.md     ──→ omop.location
        ├─ Organization/care_site   ──→ omop.care_site
        ├─ Practitioner/provider    ──→ omop.provider
        ├─ Patient/person           ──→ omop.person
        │     (depends on location, care_site, provider, person_id_map)
        ├─ Encounter/visit_occurrence ──→ omop.visit_occurrence
        │     (depends on person, care_site, provider)
        ├─ Encounter/visit_detail   ──→ omop.visit_detail
        ├─ Observation routing      ──→ measurement, observation, ...
        ├─ Condition/condition_occurrence
        ├─ Procedure/procedure_occurrence
        ├─ Medication marts         ──→ drug_exposure
        └─ ...
                   │
        Layer 6: tests (run after marts, fail build on findings)
```

Every dependency is a `relatedArtifact[type=depends-on]`. Cycles are
forbidden; the engine validates this at plan time, just like dbt does.

---

## 5. What this resolves from MAPPING.md

| MAPPING.md problem | SoF + Library/Query treatment |
|---|---|
| **Domain routing (Observation, Condition, Procedure)** | One intermediate Library joins to Athena CONCEPT once, six mart Libraries filter by domain. Reusable pattern across resources. |
| **Vocabulary lookup** | Layer 3b marker Library pins Athena version; downstream Libraries JOIN. ConceptMaps for small fixed lookups. `$translate` operation for resource-level translation. |
| **`person_id` surrogate** | One Library `person_id_map` chooses a single strategy for the whole project; documented in its `description`. Every downstream Library uses it. |
| **`deceasedBoolean` drop** | Filter clause in `person_omop` Library; documented in the Library description and mirrored to `mapspec/Patient/death.md`. |
| **Multi-race collapse** | Aggregation Query with stated rule (first / Other / Unknown). One Library, one decision, applied uniformly. |
| **`medicationReference` resolution** | `medication_resolved` Library does the bundle/contained/external union-all. Every medication mart depends on it. |
| **`Timing` / `days_supply` derivation** | Postgres SQL function or ViewDefinition with FHIRPath, exposed via a `Library/parse_timing` utility. Still application logic, but versioned and tested. |
| **Reference resolution order** | DAG dependencies make order explicit; engine refuses to run downstream before upstream. |
| **Type concept choices** | Hardcoded in the relevant mart Library; one place to change. |
| **`effective[x]` polymorphism** | Resolved in Layer 2 ViewDefinition (`iif(effectiveDateTime.exists(), …, …)`); downstream sees flat columns. |
| **Bundle integration** | Aidbox accepts bundles transactionally; SoF runs after commit. References inside a bundle are valid before transformation kicks off. |
| **Incremental ETL** | Library version bump + DAG dependency analysis = exactly what to recompute. Same model dbt uses. |

---

## 6. What SoF + Library/Query *doesn't* close

Honest accounting:

- **Athena vocabulary is large** (~6M concepts). The Library is just
  a marker; the real load is bulk CSV → Postgres. SoF doesn't
  replace the loader, only documents the dependency.
- **Specification stability**. Library-as-chained-Query semantics in
  the SoF-2 lineage is recent. STU stages may shift. Some engines
  (Pathling, Aidbox, in-house) implement different subsets.
- **Complex `Timing.repeat`** — multi-period schedules, `when`
  codes, `offset` — exceeds FHIRPath in ViewDefinition. Push to a
  Postgres function or pre-parse.
- **Profile awareness** (US Core, German MII, IPA). ViewDefinition
  can use `extension.where(url='…')`, but profile-conditional
  logic is application-level. Either ship parallel ViewDefinitions
  per profile, or branch in the Library.
- **OMOP → FHIR (reverse direction)**. Same architecture works in
  reverse (mart Library reads OMOP, ConceptMap reverses, ViewDefinition
  becomes resource-construction logic), but conceptually noisier
  than R2RML approaches like FHIROntopOMOP.
- **Operational concerns** — observability of Library executions,
  failure modes, retry semantics, idempotency. dbt has solved these
  with `--full-refresh`, model tests, etc.; the SoF + Library
  ecosystem hasn't standardized them yet.

---

## 7. Tooling & engines

What's needed to run a SOF-MAPPING bundle end-to-end:

| Capability | Candidates | Notes |
|---|---|---|
| FHIR resource store | Aidbox, HAPI FHIR JPA, Pathling | Holds raw FHIR + the Library/ViewDefinition/ConceptMap resources |
| ViewDefinition execution | Pathling, Aidbox, sof-cli | Spark-based vs Postgres-native |
| Library/Query chained execution | Aidbox `/sql`, Pathling `executeQuery`, custom orchestrator | Engine support varies; SoF-2 spec evolving |
| FHIRPath in SQL | `pathling`, `aidbox` (via `fhirpath_extract`) | Postgres extension or compute layer |
| Athena vocabulary loader | Standard Postgres `COPY` or OHDSI `Vocabulary-v5.0` package | Needed; SoF doesn't replace |
| FSH-to-bundle compilation | Sushi (`hl7.fhir.uv.sushi`) | Author Library/ViewDefinition/ConceptMap in FSH, compile to JSON bundle |
| CI / test runner | dbt-style runner (custom) or HL7 IG Publisher | Walk DAG, run Layer 6 tests |

The closest end-to-end picture today: **Aidbox** as resource store
(holds source FHIR + all Layer 2-6 resources) + **Postgres OMOP
tables in the same database** (mart targets) + **`/sql` endpoint** to
execute Library SQL, with `fhirpath_extract` for FHIRPath-in-SQL
inside ViewDefinitions. **Sushi** authors the Library/ViewDefinition/
ConceptMap from FSH, like fhir-omop-ig already does for FML. **dbt-
adapter for FHIR** would be a natural OSS extension if not already
written.

For Pathling: same idea, Spark-backed, ViewDefinition execution
already production-ready. Library chaining is less mature.

---

## 8. Migration path from current `mapspec/`

Each `mapspec/<Resource>/` folder is the human spec; the goal is to
add an executable companion alongside, then prove equivalence:

```
mapspec/
  Patient/
    index.md              ← human spec (exists)
    person.md             ← human spec (exists)
    death.md              ← human spec (exists)
    location.md           ← human spec (exists)
    person.fsh            ← NEW: ViewDefinition + Library
    person.test.fsh       ← NEW: Library/test-person-*
    death.fsh             ← NEW
    death.test.fsh        ← NEW
    ...
```

Each `.fsh` file is FHIR Shorthand; Sushi compiles to JSON resources
that drop into a bundle:

```
out/
  bundle/
    ConceptMap-gender.json
    ConceptMap-us-core-race.json
    ViewDefinition-patient-flat.json
    Library-person-id-map.json
    Library-person-omop.json
    Library-test-person-required.json
    ...
```

The bundle is loaded into Aidbox / Pathling; one `POST /sql/run-dag`
(or similar engine-specific call) executes the whole pipeline end to
end. Layer 6 tests fail the build on regression.

### Suggested staging

1. **Patient → person + death + location**. Smallest closed loop;
   exercises ConceptMap (gender), surrogate ID, multi-race collapse,
   conditional death record. ~5 Libraries, ~3 ConceptMaps, 1
   ViewDefinition.
2. **Encounter → visit_occurrence + visit_detail**. Adds recursive
   CTE, FK resolution to Layer 5 marts.
3. **Observation → measurement + observation**. The first time
   Athena vocab is required; the first domain-routing intermediate.
4. Other resources follow once the pattern is established.

After step 3, every remaining resource is a variation on patterns
already captured.

---

## 9. Comparing to existing mapping technologies

| Technology | Composability | DAG | Tests | FHIR-native | Used by |
|---|---|---|---|---|---|
| Imperative (Java/C#/Python) | Low | Implicit | External | No | omoponfhir, FhirToCdm, ETL-German, NACHC |
| FHIR Mapping Language (FML) | Low | No | No | Yes | HL7 fhir-omop-ig |
| R2RML | Medium | Limited | Limited | No | FHIROntopOMOP |
| dbt + raw SQL | High | Yes | Yes | No | None for FHIR→OMOP |
| **SoF + Library/Query** | **High** | **Yes** | **Yes** | **Yes** | **(this proposal)** |
| Whistle | Medium | Limited | No | No | mends-on-fhir (reverse) |

The combination is the only one that gets all five columns. dbt has
the operational maturity but isn't FHIR-native; FML is FHIR-native but
isn't composable. SoF + Library closes the gap.

---

## 10. Open questions for this project

These are the decisions blocking a proof-of-concept:

1. **Engine choice.** Aidbox (HS-native, single-Postgres) vs Pathling
   (Spark, OSS, OMOP-mature). Likely Aidbox given the project context.
2. **`person_id` strategy** — sequence vs hash vs lookup. Pin in
   `Library/person_id_map`. (`mapspec/Patient/person.md` already
   surveys options.)
3. **Athena vocab loading** — direct CSV or via OHDSI loader. Same
   destination, different pre-step.
4. **FSH-to-bundle compile pipeline** — Sushi only, or custom
   tooling for chained-Library semantics not yet in Sushi templates.
5. **DAG runner** — write a small Bun script, or rely on engine
   built-in (Aidbox's `/sql`, Pathling's `executeQuery`).
6. **Reverse direction (OMOP → FHIR)** — out of scope for first PoC,
   but architecture choice should not preclude it.

Once these are settled, the first executable Patient → person
pipeline is ~10 resources and ~200 lines of FSH. The gain over
re-implementing in Java is enormous, and every subsequent resource
gets cheaper as the pattern library grows.
