# Refactor mapspec/ into edge-list JSON + bidirectional viewer

## Goal

Make every FHIR-resource → OMOP-table mapping a first-class **edge**
in the project, addressable by either side. Replace the
FHIR-resource-keyed folder hierarchy in `mapspec/` with a flat edge
list, plus auto-generated views by OMOP table.

Same content, but:
- "What lands in `person`?" — one query/glob.
- "What does `Observation` map to?" — one query/glob.
- "What's unimplemented?" — one query.
- "What needs vocabulary X?" — one query.
- Reverse direction (OMOP → FHIR) becomes a sibling JSON, not a hack.
- The mapping data feeds SoF compilation (see [SOF-MAPPING.md](./SOF-MAPPING.md)).

## Current state

```
mapspec/
  Patient/index.md
  Patient/person.md
  Patient/death.md
  Patient/location.md
  Patient/observation_period.md
  Encounter/index.md
  Encounter/visit_occurrence.md
  Observation/index.md
  Observation/measurement.md
  Observation/observation.md
  ... (17 FHIR-resource folders, ~30 per-table .md files, ~3.5k lines total)
```

Pros: human-readable, narrative.
Cons: hierarchical by FHIR side only; no native OMOP-side view;
convergent mappings hidden (Practitioner + PractitionerRole both feed
`provider`, but you have to know to look in two folders); reverse
direction unsupported; not machine-queryable.

## Target state

```
mapspec/
  edges/                                  ← source of truth (machine)
    Patient__person.json
    Patient__death.json
    Patient__location.json
    Patient__observation_period.json
    Encounter__visit_occurrence.json
    Encounter__visit_detail.json
    Observation__measurement.json
    Observation__observation.json
    Observation__condition_occurrence.json
    Observation__procedure_occurrence.json
    Observation__drug_exposure.json
    Observation__device_exposure.json
    MedicationRequest__drug_exposure.json
    MedicationDispense__drug_exposure.json
    MedicationAdministration__drug_exposure.json
    MedicationStatement__drug_exposure.json
    Immunization__drug_exposure.json
    Practitioner__provider.json
    PractitionerRole__provider.json
    Organization__care_site.json
    Location__location.json
    Location__care_site.json
    Patient__person.omop-to-fhir.json     (reverse pair, same edge)
    ...
  resources/                              ← per-FHIR narrative (human)
    Patient.md
    Encounter.md
    Observation.md
    ...
  tables/                                 ← per-OMOP autogen (machine → human)
    person.md
    visit_occurrence.md
    measurement.md
    drug_exposure.md
    ...
  schema/
    edge.schema.json                      ← JSON Schema for edges/*.json
  _overview.md
  _references.md
  TODO.md
```

Filename convention: `<FHIR_RT>__<OMOP_TABLE>.json` with a **double**
underscore as separator (OMOP table names contain single underscores).
Reverse direction: same name + `.omop-to-fhir.json` suffix.

## Edge JSON schema (sketch)

```json
{
  "$schema": "../schema/edge.schema.json",
  "fhir_resource": "Patient",
  "omop_table": "person",
  "direction": "fhir-to-omop",
  "status": "documented",
  "primary": true,
  "required": true,

  "narrative_md": "Core demographics; one row per Patient...",

  "fields": [
    {
      "fhir_path": "Patient.gender",
      "omop_column": "gender_concept_id",
      "fhir_type": "code",
      "omop_type": "integer (FK CONCEPT)",
      "concept_map": "gender-fhir-to-omop",
      "notes": "male→8507, female→8532, other→8521, unknown→8551"
    },
    {
      "fhir_path": "Patient.birthDate",
      "omop_column": "year_of_birth",
      "fhir_type": "date",
      "omop_type": "integer",
      "transform": "year(Patient.birthDate)",
      "notes": "Required in OMOP. Year only; month/day in separate columns."
    }
  ],

  "concept_maps": ["gender-fhir-to-omop", "us-core-race-to-omop"],
  "vocabularies": [],

  "references": [
    {"project": "fhir-omop-ig", "kind": "fml",
     "path": "refs/refs/fhir-omop-ig/input/maps/PersonMap.fml"},
    {"project": "omoponfhir-v54-r4", "kind": "java",
     "path": "refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java",
     "lines": [1, 1338]}
  ],

  "edge_cases": [
    {"case": "deceasedBoolean=true without date",
     "handling": "Death record cannot be created (death.death_date NOT NULL)",
     "implementations_handling": ["omoponfhir"],
     "implementations_dropping": ["FhirToCdm", "NACHC", "fhir-to-omop-demo"]}
  ],

  "implementation_in_project": "src/mapper/patient.ts",

  "sof_compile": {
    "view_definition": "patient_flat",
    "intermediate_libraries": ["person_id_map"],
    "mart_library": "person_omop"
  }
}
```

Required fields: `fhir_resource`, `omop_table`, `direction`, `status`,
`fields[]`. Everything else optional. Validated against
`schema/edge.schema.json` in CI / pre-commit.

## What gets auto-generated

`tables/<omop_table>.md` is built from edges:

```
# person — what FHIR maps here

| FHIR resource | direction | status | implementation |
|---|---|---|---|
| Patient → person | F→O | documented | src/mapper/patient.ts |
| Practitioner → person | F→O | not-applicable | (Practitioner targets `provider`, not `person`) |

## Field-level inputs
[merged table from edges/Patient__person.json fields[] etc.]

## Reference implementations covering this table
[deduped list across edges]
```

Built by `scripts/build-tables.ts` (Bun). Re-run on every commit; output checked in for github browsing but regenerated by CI.

## Viewer changes

Server gains routes:

- `GET /` — landing matrix (already exists, regenerated from edges)
- `GET /r/<FHIR_RT>` — reads `resources/<FHIR_RT>.md` + lists matching edges
- `GET /t/<OMOP_TABLE>` — renders `tables/<OMOP_TABLE>.md`
- `GET /e/<FHIR_RT>__<OMOP_TABLE>` — renders one edge JSON
- `GET /api/edges` — JSON of all edges (for clients)

## Migration plan

### Phase 1 — schema + prototype (1-2 days)

1. Write `mapspec/schema/edge.schema.json` (JSON Schema 2020-12).
2. Pick **two** FHIR resources to convert manually:
   - `Patient` — has 4 target tables, exercises multi-edge case.
   - `Observation` — has 2 documented + several routed targets, exercises domain routing.
3. Convert `mapspec/Patient/{person,death,location,observation_period}.md` → `mapspec/edges/Patient__*.json`.
4. Move `mapspec/Patient/index.md` narrative → `mapspec/resources/Patient.md`.
5. Convert `mapspec/Observation/{measurement,observation}.md` → `mapspec/edges/Observation__*.json`.
6. Add stub edges for Observation domain routing (`Observation__condition_occurrence.json`, `Observation__procedure_occurrence.json`, ...) — `status: "stub"` so the matrix shows them.
7. Validate: edges parse, schema passes, narrative still readable.

### Phase 2 — autogen + viewer (1-2 days)

8. `scripts/build-tables.ts` — read `mapspec/edges/*.json`, write `mapspec/tables/<omop>.md`. Pure regenerator; idempotent.
9. Update viewer (`src/mapspec/`):
   - `list.ts` reads from edges instead of folder structure.
   - Add `$route_r_$resource_GET.ts`, `$route_t_$table_GET.ts`, `$route_e_$edge_GET.ts`.
   - Layout sidebar shows two trees: "By FHIR resource" + "By OMOP table".
10. Verify Patient + Observation views work correctly.

### Phase 3 — bulk migration (3-5 days)

11. Convert remaining 14 FHIR resources × ~15 edges:
    - Encounter, Condition, Procedure, AllergyIntolerance, DiagnosticReport, Specimen, Device, Immunization, MedicationRequest, MedicationDispense, MedicationAdministration, MedicationStatement, Practitioner, PractitionerRole, Organization, Location, Medication.
12. Run via parallel subagents, two-three at a time, briefed with the schema.
13. After each: validate against schema, regenerate tables/, spot-check viewer.

### Phase 4 — cleanup (1 day)

14. Delete `mapspec/Patient/`, `mapspec/Encounter/`, ... (the per-resource folders).
15. Update `mapspec/_overview.md` matrix to point at `/r/<RT>` and `/t/<table>` URLs.
16. Update `CLAUDE.md` "Project Resources" with the new structure.
17. Update `mapspec/TODO.md` cross-refs.
18. Commit, push.

### Phase 5 — bonus (later)

19. Reverse-direction edges: pair every `<FHIR_RT>__<OMOP_TABLE>.json` with `<FHIR_RT>__<OMOP_TABLE>.omop-to-fhir.json` where round-trip is meaningful.
20. SoF compiler: `scripts/compile-sof.ts` reads edges → emits ViewDefinition / Library / ConceptMap FHIR resources per [SOF-MAPPING.md](./SOF-MAPPING.md).
21. Edge tests: `Library/test-<edge>.json` from `edge_cases[]` array.

## Definition of done

- [ ] `mapspec/edges/*.json` is the source of truth; nothing edited in old per-resource folders.
- [ ] `mapspec/schema/edge.schema.json` validates every edge in CI.
- [ ] `mapspec/tables/*.md` regenerates cleanly; checked in for github browsing.
- [ ] `mapspec/resources/<FHIR_RT>.md` exists for every FHIR resource we cover.
- [ ] Viewer has `/r/<RT>`, `/t/<table>`, `/e/<edge>` routes; sidebar shows both trees.
- [ ] Old `mapspec/<FHIR_RT>/` folders removed.
- [ ] No content lost (line-count parity check between old MD and new JSON+resources/+tables/).
- [ ] Reference paths in `references[]` all resolve on disk (`scripts/check-refs.ts`).
- [ ] OMOP column names in `fields[].omop_column` all exist in `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv` (`scripts/check-omop-cols.ts`).

## Open questions before starting

- Use JSON or YAML for edges? JSON is more queryable; YAML is more
  human-editable. Could allow both via `<edge>.yaml` → `<edge>.json`
  build step. **Default: JSON** (validates, queryable, dbt-style).
- Inline `notes_md` or sidecar `<edge>.md`? Inline is one file
  (simpler); sidecar lets `git blame` markdown changes separately.
  **Default: inline** for the first prototype; revisit if narratives
  grow large.
- Where does `_overview.md` matrix come from? Currently hand-maintained;
  should be **autogenerated** from edges in phase 2.
- Versioning of edges? `version` field in JSON, bumped on substantive
  change? **Defer** — git history is enough until proven otherwise.

## Risk / rollback

- Big restructure of ~3.5k lines of content. Do incrementally; never
  delete old folders until Phase 4.
- Old per-resource folders kept until Phase 4 means viewer needs to
  read both formats during transition (or be split-brain temporarily).
  Acceptable.
- Subagent translation MD → JSON could lose content. Mitigation:
  line-count parity check, plus keep old MD until table regen + spot
  check passes.
