# TODO — fhir2omop

Open improvements, roughly ordered by impact. Snapshot of state when
written: 23 / 28 edges with stage-2 ETL, 14 OMOP tables populated
(~74k rows on 100-patient Synthea).

## Architecture / reliability

- [ ] **Orchestrator `script/etl-all.ts`** — single command `bun
      script/etl-all.ts` runs the full pipeline in the correct order:
      `cm.*` materialization → all `staging.*` views → stage-2 ETLs.
      Currently the order is implicit / manual; some `cdm_ours_fhir.*`
      tables (`measurement`, `observation`, `drug_exposure`,
      `procedure_occurrence`, `care_site`, `location`) accumulate rows
      from 2–5 edges and depend on the right TRUNCATE-then-APPEND
      sequence.

- [ ] **View ↔ SQL column-name validator** — stage-2 SQLs reference
      `staging.X.col_name` directly. If a view rename drops a column,
      the SQL silently fails at INSERT time with "column does not
      exist". A linter that diffs declared view columns vs columns
      referenced in the matching `mapspec/etl/<R>__<T>.sql` would catch
      this in CI.

- [ ] **Profile validation on stage-1** — stage-1 views read everything
      from `fhir.*` without consulting the matching
      `mapspec/profiles/<R>__<T>.profile.json`. Real-world data may
      include resources that violate `mustSupport` / `min:1`
      constraints (e.g. Condition without `code` or `subject`); they
      currently flow through and produce garbage downstream.

## Performance

- [ ] **Pre-materialized vocab maps** — every code-resolving stage-2
      ETL joins through `vocab.concept` → `vocab.concept_relationship`
      (~39M rows) → `vocab.concept`. Pre-computing one `cm.*` table per
      `(source_vocab, target_domain)` pair would replace 3 index probes
      per row with one. Expected speedup 2–10× for the larger edges.

- [ ] **Partial index on Maps-to** — `vocab.concept_relationship`
      partial index `(concept_id_1) WHERE relationship_id='Maps to' AND
      invalid_reason IS NULL` would let the planner skip the 38M+
      irrelevant rows. ~1.5M of 39M total are Maps-to.

- [ ] **Per-batch streaming for `viewdef.materialize`** — currently
      `SELECT resource FROM fhir.*` pulls all rows into JS at once.
      Fine for 100-patient data; will hit memory pressure on 1M+
      patients. Bun.SQL supports streaming via `.simple()`.

## Code quality

- [ ] **Split `script/load-cdm-person.ts`** — it now loads 9 tables and
      is a ~300-line unsafe SQL blob. Refactor to `script/load-cdm/
      <table>.sql` files applied sequentially, plus a thin orchestrator.

- [ ] **Codegen stage-2 SQL** — all 23 ETLs share the same shape (CTE
      `codes` UNION ALL + DISTINCT ON + JOIN to vocab + standard
      column projection). A generator that reads edge.json + view +
      target table schema and emits the SQL would cut maintenance and
      eliminate copy-paste drift.

- [ ] **Tests** — no unit tests today. At least: snapshot tests for
      `viewdef.run` on a handful of canonical FHIR resources; integration
      test for one full edge pipeline on a tiny fixture dataset.

- [ ] **Rename `load-cdm-person.ts` → `load-cdm-reference.ts`** — it's
      no longer person-specific.

## Data coverage

- [ ] **Missing edges** (Synthea doesn't write them, but real data
      will): Coverage, Specimen, Medication (the resource itself),
      MedicationDispense, MedicationStatement. Views exist; stage-2
      SQL not written. Would emit 0 rows on current Synthea data but
      be ready for real EHR sources.

- [ ] **Component Observations** — `Observation.component[]`
      (e.g. blood pressure as systolic + diastolic component coding)
      is silently dropped today. Should fan out into one
      measurement / observation row per component.

- [ ] **CVX vocab missing from Athena bundle** — Immunization edge
      produces 0 rows. Refresh the bundle from
      [athena.ohdsi.org/vocabulary/download-history](https://athena.ohdsi.org/vocabulary/download-history)
      with CVX selected, then `bun script/init-athena.ts gs://…/newer.zip`.

## UI / operations

- [ ] **Add PRIMARY KEY constraints** to `cdm_ours_fhir.*` after ETL
      load. Surrogate IDs are 64-bit hashes — collision probability is
      tiny but non-zero, and without PK an accidental duplicate from
      multi-edge appends would silently coexist.

- [ ] **TZ-handling convention** — `Encounter` and `Procedure` cast
      timestamps via `::timestamptz AT TIME ZONE 'UTC'` because their
      CSV writes UTC and FHIR writes local zone. `Condition` uses the
      naive `::date` cast because CSV stores local date only with no
      time. The two are documented in commit messages but easy to mix
      up. Either pick one convention or formalize "CSV-side timestamp
      semantics" per source CSV.

- [ ] **PractitionerRole stage-2 is an UPDATE, not INSERT** — the
      placeholder SQL returns a no-op SELECT so it fits our
      INSERT-wrapped runner. Either build a separate UPDATE-runner or
      fold PractitionerRole's specialty + care_site enrichment into
      Practitioner__provider's stage-2 via JOIN.

- [ ] **README / CLAUDE.md drift** — both still describe earlier
      versions (e.g. `condition_status_concept_id` hardcoded 0). Bring
      them up to current state: 23 edges, 14 tables populated, the
      `cm.*` ConceptMap table convention, `@relatedArtefact` directive,
      Side-by-side diff card.

## ConceptMap improvements

- [ ] **Race "Other" → 8522** — currently we honor FHIR's
      `ombCategory=UNK` as Unknown (8552). Synthea's exporter conflates
      "Other" with "Unknown" by emitting both. A source-specific
      pre-processor or a `cm.race_text_synthea_to_omop` derived map
      could recover the distinction without polluting the generic CM.
      See `mapspec/GAPS.md` §7.

- [ ] **`*_source_concept_id` for Synthea CSV-only codes** — `cdm.*`
      reference hardcodes 0 (mirrors ETL-Synthea). Could augment with
      Athena lookup so reference also lights up where source codes are
      themselves Athena concepts.
