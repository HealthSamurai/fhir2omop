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

- [x] **Profile validation on stage-1** — Two complementary pieces:
      (a) `script/validate-staging.ts` reports per-FK-reference NULL
      rates against materialized staging.* (offline diagnostic);
      (b) `src/profiles/compile.ts` compiles a profile's
      `differential.element[].min:1` constraints into a JSONB SQL
      WHERE clause that materialize.ts applies when the orchestrator
      runs with `--strict-profiles`. Verified on 100-patient Synthea:
      filter is off by default (zero diff impact); under
      `--strict-profiles` it correctly removes 2,649 BP outer
      Observations that lack top-level `value[x]` (they route to the
      component edge instead). Other staging counts identical → the
      cohort conforms to every profile.

## Performance

- [x] **Pre-materialized vocab maps** — `script/gen-vocab-maps.ts`
      builds 13 `cm.<vocab>_to_<domain>` lookup tables (LOINC→Meas,
      LOINC→Obs, SNOMED→{Cond,Proc,Obs,Specimen,Device}, RxNorm→Drug,
      ICD10/9CM→Cond, CPT4→Proc, HCPCS→Proc, CVX→Drug). 824k rows
      materialized in ~4s. The 24 existing stage-2 SQLs are NOT
      rewritten (their vocab.concept_relationship JOINs already
      sub-second post Maps-to index); the cm.* tables are available
      for new edges to opt into.

- [x] **Partial index on Maps-to** — `script/init-vocab-indexes.sql`
      adds `ix_concept_relationship_mapsto` (concept_id_1, concept_id_2)
      WHERE relationship_id='Maps to' AND invalid_reason IS NULL.
      Speedups observed: Condition 2.5s→60ms, Procedure 2.3s→91ms,
      Observation_meas 8.9s→0.7s.

- [x] **Per-batch streaming for `viewdef.materialize`** — Refactored
      to keyset-paginated reads (`WHERE id > <cursor> ORDER BY id
      LIMIT PAGE`). JS memory now bounded to one PAGE worth (default
      5000 rows, override via `VIEWDEF_PAGE_SIZE`) regardless of
      cohort size. End-to-end time unchanged at 100 patients
      (~26s) — confirms the change isn't a perf regression at small
      scale while making 1M+ patient runs viable.

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

- [x] **CVX vocab missing from Athena bundle** — Loaded directly
      from the CDC public source (`https://www2a.cdc.gov/vaccines/iis/
      iisstandards/downloads/cvx.txt`) via `script/load-cvx.ts`.
      289 concepts inserted into `vocab.concept` with vocabulary_id
      `CVX`, concept_ids in the OMOP Extension reserve range
      (2_000_000_000+). Doesn't ship the CVX→RxNorm crosswalk
      (Athena-only), so `Immunization__drug_exposure` was relaxed to
      LEFT JOIN on Maps-to: 1,616 Synthea immunizations now land in
      `cdm_ours_fhir.drug_exposure` with `drug_source_concept_id`
      populated to the CVX concept (was 0 rows before). When a future
      Athena bundle adds CVX, `drug_concept_id` will start populating
      retroactively on the next run.

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
