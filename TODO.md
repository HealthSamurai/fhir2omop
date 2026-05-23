# TODO — fhir2omop

Open improvements, roughly ordered by impact. Original snapshot:
23 / 28 edges with stage-2 ETL, 14 OMOP tables populated (~74k rows on
100-patient Synthea). Current snapshot: 24 / 29 edges wired, 14 OMOP
tables, end-to-end run ~30s.

## Architecture / reliability

- [x] **Orchestrator `script/etl-all.ts`** — single command runs the
      full pipeline in dependency order (`cm.*` → `staging.*` →
      stage-2). Handles TRUNCATE-then-APPEND for multi-edge targets,
      ANALYZEs fresh stats, adds PKs.

- [x] **View ↔ SQL column-name validator** — `script/lint-edges.ts`
      diffs declared view columns vs `v.<col>` refs in stage-2 SQL,
      wired into CI (`--strict`).

- [~] **Profile validation on stage-1** — Lightweight version
      delivered as `script/validate-staging.ts`: checks that every
      materialized staging.* table exists, has rows, has zero NULL
      `id`s, and reports per-FK-reference NULL rates. Flags 100%-NULL
      columns as `VIOL`, partial as `INFO`. Catches the common
      "reference missing from source" case before garbage flows
      downstream; surfaced 10 real Synthea-data gaps (Procedure has
      no performer, Encounter has no part_of, PractitionerRole has no
      practitioner back-link, etc.).
      Still TODO: full FHIR-profile-driven validation — compile
      `differential.element[].min:1` constraints from the
      StructureDefinition profile into a SQL WHERE clause and filter
      non-conformant resources out of `staging.*`. Useful for real
      EHR data where Synthea's "everything has subject + code"
      guarantees don't hold.

## Performance

- [~] **Pre-materialized vocab maps** — Deferred. The original
      premise (2–10× speedup for vocab JOINs) was eaten by the
      Maps-to partial index (Observation_measurement: 8.9s→0.7s, 12×).
      Full 100-patient pipeline now runs in ~26s; no big-ETL is
      vocab-bound. Worth revisiting when scaling to ≥1M patients.

- [x] **Partial index on Maps-to** — `script/init-vocab-indexes.sql`
      adds `ix_concept_relationship_mapsto` (concept_id_1, concept_id_2)
      WHERE relationship_id='Maps to' AND invalid_reason IS NULL.
      Speedups observed: Condition 2.5s→60ms, Procedure 2.3s→91ms,
      Observation_meas 8.9s→0.7s.

- [~] **Per-batch streaming for `viewdef.materialize`** — Deferred.
      100-patient pipeline runs in ~26s with no memory pressure. Will
      need to revisit at ≥1M patients; the migration is a localized
      change in `src/viewdef/materialize.ts` from buffered `SELECT` to
      `Bun.SQL.simple()` streaming + per-row INSERT batching.

## Code quality

- [x] **Split `script/load-cdm-person.ts`** — refactored into
      `script/load-cdm/<NN>-<table>.sql` files (00-shared, 10-person,
      20-death, …, 90-device_exposure) applied sequentially by
      `script/load-cdm-reference.ts`.

- [x] **Codegen stage-2 SQL** — delivered as `script/scaffold-edge.ts`:
      a SCAFFOLD generator for new edges only. Reads edge.json and
      emits a stage-2 SQL skeleton with column projection, surrogate
      PK, FK `referenceToId(...)` wrappers, constants inlined, and
      `-- TODO vocab JOIN` markers where a `concept_map` / fk-to-CONCEPT
      needs a hand-written join. Won't overwrite without `--force`.
      Deliberately does NOT regenerate the 24 existing ETLs — their
      CTEs, vocab priority and per-source comments don't round-trip
      through edge.json without expanding it into a SQL-in-JSON DSL.

- [x] **Tests** — `src/viewdef/run.test.ts` (9 unit tests) +
      `src/viewdef/snapshot.test.ts` (4 snapshot tests against real
      mapspec/views/*.view.json + fixture FHIR resources). CI runs
      `bun test` without `continue-on-error`. Open: integration test
      against a tiny fixture dataset that exercises the full pipeline.

- [x] **Rename `load-cdm-person.ts` → `load-cdm-reference.ts`** — done
      as part of the split.

## Data coverage

- [x] **Missing edges** — Coverage, Specimen, Medication,
      MedicationDispense, MedicationStatement stage-2 SQLs written.
      Emit 0 rows on Synthea (no source data) but ready for real EHRs.

- [x] **Component Observations** — `Observation_component__measurement`
      edge fans `Observation.component[]` into per-component
      measurement rows via `forEach component` in the view + hash of
      `(Observation.id, component.code)` for `measurement_id`. Adds
      3,586 BP rows (1,793 × systolic/diastolic) on 100-patient
      Synthea.

- [ ] **CVX vocab missing from Athena bundle** — Immunization edge
      produces 0 rows. Refresh the bundle from
      [athena.ohdsi.org/vocabulary/download-history](https://athena.ohdsi.org/vocabulary/download-history)
      with CVX selected, then `bun script/init-athena.ts gs://…/newer.zip`.
      **External — needs Athena account + GCS upload.**

## UI / operations

- [x] **Add PRIMARY KEY constraints** to `cdm_ours_fhir.*` — wired
      into the orchestrator (`PK_BY_TABLE` block in
      `script/etl-all.ts`, drops + recreates 14 PKs after each load).

- [x] **TZ-handling convention** — Formalized as `mapspec/GAPS.md` §9
      "Timezone semantics per source CSV". Documents the per-CSV cast
      convention (UTC-rebase vs naive `::date`) with the dateline edge
      case that motivated the split.

- [x] **PractitionerRole stage-2 is an UPDATE, not INSERT** —
      orchestrator now runs `mode: "update"` edges as-is (no INSERT
      wrapper). `mapspec/etl/PractitionerRole__provider.sql` is a
      direct UPDATE that augments existing `provider` rows with
      specialty + care_site from PractitionerRole.

- [x] **README / CLAUDE.md drift** — refreshed to 29 edges / 24 wired
      stage-2 ETLs / lampadephoros repo / `cm.*` ConceptMap convention /
      `@relatedArtefact` directive / side-by-side diff card / current
      bootstrap steps.

## ConceptMap improvements

- [x] **Race "Other" → 8522** — Added
      `mapspec/profiles/race-text-synthea-to-omop.cm.json`, a source-
      specific derived ConceptMap. `Patient__person.sql` falls back to
      `cm.race_text_synthea_to_omop` only when `ombCategory=UNK`, so
      the generic `race-omb-to-omop` map stays clean. Verified on
      100-patient Synthea: 2 patients recovered to 8522 (Other Race),
      1 to 8557 (Native Hawaiian / Pacific Islander). The cdm CSV
      oracle leaves all 3 at 0 — our FHIR pipeline is now strictly
      more informative on race than the reference.

- [x] **`*_source_concept_id` for Synthea CSV-only codes** — Audited:
      five of six event loaders (`observations`, `conditions`,
      `procedures`, `drug_exposure`, `device_exposure`,
      `allergy_observation`) already populate `*_source_concept_id`
      via Athena lookup of the SNOMED/LOINC/RxNorm code in the source
      CSV. Remaining hardcoded zeros (person.gender/race/ethnicity,
      visit_occurrence) are correct by OMOP semantics: the
      `*_source_value` columns there are Synthea internals (`M`,
      `WHITE`, encounter UUID) with no Athena equivalent. No real
      augmentation gap remained.
