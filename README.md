# fhir2omop

> FHIR R4 → OMOP CDM v5.4 mapping spec + ELT runtime, built on Postgres + SQL on FHIR.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Status: alpha](https://img.shields.io/badge/Status-alpha-orange.svg)]()
[![FHIR R4](https://img.shields.io/badge/FHIR-R4-red.svg)](https://hl7.org/fhir/R4/)
[![OMOP CDM v5.4](https://img.shields.io/badge/OMOP_CDM-v5.4-green.svg)](https://ohdsi.github.io/CommonDataModel/cdm54.html)

**Live demo:** [fhir2omop.apki.dev](https://fhir2omop.apki.dev) — `/profiles`, `/mapspec/<R>/<table>`, edge matrix on `/`.

A working specification — and the tooling to render and execute it — for
converting FHIR R4 data into OMOP CDM v5.4. Unlike most existing
FHIR→OMOP projects, this one is:

- **Profile-gated.** Each FHIR-resource → OMOP-table edge is a
  [FHIR StructureDefinition](https://www.hl7.org/fhir/structuredefinition.html);
  a resource converts to a specific OMOP table iff it validates against that
  profile. Multi-target resources (Observation → `measurement` vs
  `observation`) are routed by the `code` binding to a per-domain
  [ValueSet](https://www.hl7.org/fhir/valueset.html).
- **ELT, not ETL.** Stage 1 is [SQL on FHIR ViewDefinitions](https://build.fhir.org/ig/HL7/sql-on-fhir-v2/)
  flattening raw `fhir.resources(jsonb)` into wide tables; Stage 2 is
  SQL views joining onto `vocab.concept` for concept lookup and Maps-to
  fan-out. Concept-id resolution is a JOIN, not a TS function.
- **Spec-driven.** 29 edges × { mapping doc, edge JSON, profile,
  ViewDefinition, stage-2 SQL }. One source of truth in `mapspec/`;
  everything else (UI, runtime SQL) is generated or directly executed.

## Status

Alpha — but end-to-end. The mapping spec is complete for the 29 standard
edges, Stage-1 (FHIR-flat) and Stage-2 (OMOP-shaped) both run, and a
reference CSV pipeline gives you a row-level diff oracle for validation.

| Layer | State |
|---|---|
| Mapping spec (`mapspec/edges/`) — 29 FHIR↔OMOP edges with field-level docs and reference-impl citations | ✅ |
| FHIR profiles (`mapspec/profiles/`) — gating StructureDefinitions + ConceptMaps (`*.cm.json`) | ✅ 28 profiles + 9 ConceptMaps |
| ValueSets — one per OMOP domain, with example concepts and authoritative SQL expansion | ✅ 8 |
| SQL-on-FHIR ViewDefinitions (`mapspec/views/`) — Stage 1 flatteners | ✅ 29 |
| OMOP Athena vocabularies loaded into Postgres (`vocab.*`) | ✅ 6.4M concepts |
| Stage 2 SQL ETLs (`mapspec/etl/`, OMOP-shaped, vocab joins via `cm.*`) | ✅ 24 / 29 edges (5 stubs: Coverage, Specimen, Medication, MedicationDispense, MedicationStatement — views present, no Synthea source data) |
| Reference ETL from Synthea CSV → `cdm.*` (oracle for diffing) | ✅ 9 tables |
| Side-by-side diff UI: `cdm.*` (CSV oracle) vs `cdm_ours_fhir.*` (FHIR pipeline) | ✅ per-row mismatch cards |
| FHIR-instance validator (profile → SQL `WHERE`) | 🚧 design |

Known gaps and remediation are tracked in [`mapspec/GAPS.md`](mapspec/GAPS.md).

## Bootstrap from zero

```sh
# 1. Clone with all submodules (CommonDataModel + ~38 reference implementations)
git clone --recurse-submodules https://github.com/lampadephoros/fhir2omop
cd fhir2omop

# 2. Install deps (Bun, not Node)
bun install

# 3. Download FHIR R4 core metadata
bun src/load-fhir-core.ts

# 4. Bring up Postgres + load Athena vocabularies (~6.4M concepts, ~75M rows)
docker compose up -d
bun script/init-athena.ts   # ~5 min: gcloud cp + unzip + load
psql -f script/init-vocab-indexes.sql "$ATHENA_DSN"   # ~30s; needed for sub-second stage-2

# 5. Generate Synthea data + load both pipelines
bun script/gen-synthea.ts --patients=100
bun script/load-cdm-reference.ts                       # CSV → cdm.*       (oracle)
bun script/load-fhir-bundles.ts                        # Bundle → fhir.*   (raw)
bun script/etl-all.ts                                  # fhir.* → cdm_ours_fhir.* (full pipeline, ~30s)

# 6. Start the UI/dev server (http://localhost:3000)
bun src/$main.ts
```

Then visit:
- `/` — Resource × Table mapping matrix + Sankey
- `/profiles` — Profiles, ViewDefinitions, ValueSets, ConceptMaps
- `/mapspec/<Resource>/<table>` — per-edge detail (field map + profile + view + stage-2 SQL + references + sample/diff cards)
- `/table/<omop_table>` — OMOP table page (`cdm.*` vs `cdm_ours_fhir.*` row counts, side-by-side row diff)

Hot-reload after edits via REPL (`bun script/repl.ts 'await ctx.fns.repl.load(ctx, { name: "profiles" })'`) — see [CLAUDE.md](CLAUDE.md).

## Repository layout

```
mapspec/
  edges/        29 *.json — field-level mapping per FHIR-resource → OMOP-table edge
  profiles/    StructureDefinitions (28) + ValueSets (8) + ConceptMaps (9 *.cm.json)
  views/       29 SQL-on-FHIR ViewDefinitions — Stage-1 flatteners
  etl/         29 *.sql — Stage-2 OMOP-shaped INSERT/UPDATE (24 wired, 5 stubs for non-Synthea sources)
  resources/   Per-resource narrative markdown
  schema/      JSON schemas for edge.json files
  GAPS.md      Single inventory of known mapping gaps

script/
  init-athena.ts           Bootstrap Athena bundle from GCS into Postgres
  load-athena.ts           CSV-bundle → vocab.* loader
  init-vocab-indexes.sql   Performance-critical vocab indexes (Maps-to partial idx, etc.)
  gen-synthea.ts           Synthea generator wrapper (CSV + FHIR Bundle from one seed)
  load-cdm-reference.ts    Synthea CSV → cdm.* (oracle pipeline)
  load-fhir-bundles.ts     Synthea Bundle → fhir.* (raw FHIR storage)
  etl-all.ts               Full pipeline: cm.* → staging.* → cdm_ours_fhir.* (orchestrator)
  lint-edges.ts            View ↔ stage-2 SQL column-name validator (runs in CI)
  regen-views.ts           Regenerate ViewDefinitions from edges/
  repl.ts                  REPL client for the running server

src/                       Bun HTTP server + UI (see CLAUDE.md)
CommonDataModel/           git submodule — OHDSI source of truth
refs/                      git submodules — ~38 reference implementations
```

## What this is and isn't

This is **the mapping specification** plus a working ELT runtime.
Stage 1 (SoF ViewDefinitions → `staging.*`) and Stage 2
(`staging.*` + `cm.*` + `vocab.*` → `cdm_ours_fhir.*`) both run today.
Production hardening, profile-gated validation, and large-cohort
streaming are on the roadmap. For mature ETLs in adjacent shape look at
[ETL-German-FHIR-Core](https://github.com/miracum/etl-fhir-to-omop),
[FhirToCdm](https://github.com/OHDSI/ETL-CDMBuilder), or
[omoponfhir](https://github.com/omoponfhir) — all cited in our `refs/`
submodules.

What you get here today:
- A single canonical mapping for each of 29 edges with explicit field maps,
  vocabulary requirements, edge cases, and citations to every major
  reference implementation.
- FHIR profiles that codify the **convertibility gate** — useful even
  outside this project (validate a resource against `omop-condition` and
  you know it'll load cleanly into `condition_occurrence`).
- SQL-on-FHIR ViewDefinitions (Stage 1) ready to run through any
  SoF-conformant runtime (Aidbox, Pathling, dbt-sof).
- Stage-2 SQL ETLs that resolve source codes through ConceptMap tables
  (`cm.*`) and pre-indexed `vocab.concept_relationship` Maps-to edges to
  produce OMOP-shaped rows. Full 100-patient Synthea pipeline runs in
  ~30 seconds end-to-end.
- A side-by-side diff UI that compares our FHIR-based output
  (`cdm_ours_fhir.*`) against the Synthea CSV reference (`cdm.*`) row
  by row — so the *correctness* of each mapping is observable, not just
  asserted.
- A loaded `vocab.*` schema you can query independently.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The repo's primary entry point for
contributors is **edges**: open `mapspec/edges/<R>__<table>.json`, fix the
field map, and the UI + JSON viewers update automatically.

Mapping-correction issues are welcome — use the
[mapping-correction issue template](.github/ISSUE_TEMPLATE/mapping_correction.md).

## License

[Apache License 2.0](LICENSE).

Includes references to the OMOP CDM (Apache 2.0, OHDSI), the FHIR R4
specification (HL7), and ~38 reference implementations included as git
submodules under `refs/`, each retaining its original license. See [NOTICE](NOTICE).

FHIR® is the registered trademark of HL7 and is used with permission.
