# fhir2omop

> FHIR R4 → OMOP CDM v5.4 mapping spec + ELT runtime, built on Postgres + SQL on FHIR.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Status: alpha](https://img.shields.io/badge/Status-alpha-orange.svg)]()
[![FHIR R4](https://img.shields.io/badge/FHIR-R4-red.svg)](https://hl7.org/fhir/R4/)
[![OMOP CDM v5.4](https://img.shields.io/badge/OMOP_CDM-v5.4-green.svg)](https://ohdsi.github.io/CommonDataModel/cdm54.html)

**Live demo:** [fhir2omop.apki.dev](https://fhir2omop.apki.dev) — `/profiles`, `/mapspec/<R>/<table>`, edge matrix on `/`.

A working specification — and the tooling to render and (in progress) execute
it — for converting FHIR R4 data into OMOP CDM v5.4. Unlike most existing
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
- **Spec-driven.** 28 edges × { mapping doc, edge JSON, profile,
  ViewDefinition }. One source of truth in `mapspec/`; everything else
  (UI, runtime SQL) is generated.

## Status

Alpha. Mapping spec is complete for the 28 standard edges; runtime is
under construction.

| Layer | State |
|---|---|
| Mapping spec (`mapspec/edges/`) — 28 FHIR↔OMOP edges with field-level docs and reference-impl citations | ✅ |
| FHIR profiles (`mapspec/profiles/`) — gating StructureDefinitions, one per edge | ✅ 28 |
| ValueSets — one per OMOP domain, with example concepts and authoritative SQL expansion | ✅ 8 |
| SQL-on-FHIR ViewDefinitions (`mapspec/views/`) — Stage 1 flatteners | ✅ 28 |
| OMOP Athena vocabularies loaded into Postgres (`vocab.*`) | ✅ 6.4M concepts |
| Stage 2 SQL views (OMOP-shaped, vocab joins, Maps-to fan-out) | 🚧 design |
| FHIR-instance validator (compiles profile → SQL `WHERE`) | 🚧 design |
| Documentation UI | ✅ Tailwind/htmx server at `:3000` |

Known gaps and remediation are tracked in [`mapspec/GAPS.md`](mapspec/GAPS.md).

## Bootstrap from zero

```sh
# 1. Clone with all submodules (CommonDataModel + ~38 reference implementations)
git clone --recurse-submodules https://github.com/HealthSamurai/fhir2omop
cd fhir2omop

# 2. Install deps (Bun, not Node)
bun install

# 3. Download FHIR R4 core metadata
bun src/load-fhir-core.ts

# 4. Bring up Postgres + load Athena vocabularies (~6.4M concepts, ~75M rows)
docker compose up -d
bun script/init-athena.ts   # ~5 min: gcloud cp + unzip + load

# 5. Start the UI/dev server (http://localhost:3000)
bun src/$main.ts
```

Then visit:
- `/` — Resource × Table mapping matrix
- `/profiles` — Profiles, ViewDefinitions, ValueSets
- `/mapspec/<Resource>/<table>` — per-edge detail (field map + profile + view + references)

Hot-reload after edits via REPL (`bun script/repl.ts 'await ctx.fns.repl.load(ctx, { name: "profiles" })'`) — see [CLAUDE.md](CLAUDE.md).

## Repository layout

```
mapspec/
  edges/        28 *.json — field-level mapping per FHIR-resource → OMOP-table edge
  profiles/    StructureDefinitions (28) + ValueSets (8) + system-aliases.json
  views/       28 SQL-on-FHIR ViewDefinitions — Stage-1 flatteners
  <Resource>/  Per-resource folders with index.md + <table>.md narrative
  schema/      JSON schemas for edge.json files
  GAPS.md      Single inventory of known mapping gaps
  concept-id-analysis.md   Classification of all *_concept_id columns
  concept-requests.json    Machine-readable registry of OMOP concept proposals
  codesystem-mappings.md   FHIR system URL → OMOP vocabulary_id

script/
  init-athena.ts           Bootstrap Athena bundle from GCS into Postgres
  load-athena.ts           CSV-bundle → vocab.* loader
  gen-views.ts             Generate ViewDefinitions from edges/
  repl.ts                  REPL client for the running server

src/                       Bun HTTP server + UI (see CLAUDE.md)
CommonDataModel/           git submodule — OHDSI source of truth
refs/                      git submodules — ~38 reference implementations
```

## What this is and isn't

This is **the mapping specification** plus tooling. It is *not* yet a
turnkey FHIR→OMOP ETL — Stage 2 (vocab joins, Maps-to fan-out, actual
OMOP table population) is on the roadmap. If you need a working ETL today,
look at [ETL-German-FHIR-Core](https://github.com/miracum/etl-fhir-to-omop),
[FhirToCdm](https://github.com/OHDSI/ETL-CDMBuilder), or
[omoponfhir](https://github.com/omoponfhir). Our `refs/` submodules
cite all of them.

What you get here today:
- A single canonical mapping for each of 28 edges with explicit field maps,
  vocabulary requirements, edge cases, and citations to every major
  reference implementation.
- FHIR profiles that codify the **convertibility gate** — useful even
  outside this project (validate a resource against `omop-condition` and
  you know it'll load cleanly into `condition_occurrence`).
- SQL-on-FHIR ViewDefinitions ready to run through any SoF-conformant
  runtime (Aidbox, Pathling, dbt-sof).
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
