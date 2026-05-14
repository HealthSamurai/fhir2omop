# Contributing to fhir2omop

Thanks for the interest. This document covers what kinds of contributions
are welcome, where to make changes, and the conventions to follow.

## Ways to contribute

| Contribution | Where it lives | Effort |
|---|---|---|
| Correct a field mapping or add an edge case | `mapspec/edges/<R>__<table>.json` | small |
| Add references to a new implementation | `mapspec/edges/<R>__<table>.json` `fields[].sources[]` or top-level `references[]` | small |
| Tighten a profile (cardinality, binding) | `mapspec/profiles/<R>__<table>.profile.json` | small |
| Add example codes to a ValueSet | `mapspec/profiles/<Domain>.valueset.json` `compose.include` | small |
| Improve narrative docs | `mapspec/<R>/<table>.md` | small |
| Close a gap from `mapspec/GAPS.md` | usually edge JSON + profile + narrative | medium |
| Stage-2 SQL generator | new `script/gen-omop-views.ts` | larger — discuss first |
| UI improvements | `src/$route_*.ts`, `src/mapspec/render.ts` | small–medium |

## Quick start

```sh
git clone --recurse-submodules https://github.com/HealthSamurai/fhir2omop
cd fhir2omop
bun install
bun src/load-fhir-core.ts
docker compose up -d
bun script/init-athena.ts
bun src/$main.ts                          # http://localhost:3000
```

In a second terminal, hot-reload after edits without restarting the server:

```sh
bun script/repl.ts 'await ctx.fns.repl.load(ctx, { name: "profiles" })'
bun script/repl.ts 'await ctx.fns.http.loadRoutes(ctx)'
bun script/repl.ts 'await ctx.genTypes(ctx)'
```

See [CLAUDE.md](CLAUDE.md) §"Architecture: procedural ctx.fns" and
"REPL workflow" for the full convention.

## Editing a mapping

The shape is in `mapspec/schema/edge.schema.json`. A correction usually
means editing `mapspec/edges/<Resource>__<table>.json` directly:

```json
{
  "omop_column": "person_id",
  "fhir_path": "Patient.id",
  "fhir_type": "id",
  "omop_type": "integer",
  "required": true,
  "pk": true,
  "notes": "Surrogate key. Hash/sequence/lookup of Patient.id.",
  "sources": [
    {
      "comment": "Auto-incrementing sequence",
      "references": [
        { "project": "ETL-German-FHIR-Core", "kind": "java",
          "path": "refs/refs/ETL-German-FHIR-Core/src/main/java/.../PatientMapper.java" }
      ]
    }
  ]
}
```

After editing, the running server picks the change up on the next request
to `/mapspec/Patient/person`. ViewDefinitions are generated separately:

```sh
bun script/gen-views.ts
```

Always look at the per-resource narrative (`mapspec/<Resource>/<table>.md`)
to make sure prose and edge JSON agree.

## Code conventions

This repo follows the procedural `ctx.fns` convention from hyper-code2:

- **One function per file, anonymous default export.**
  `export default async function (ctx: Context, opts: {...}) { ... }`
- **No cross-imports between project files.** Call other modules via
  `ctx.fns.<module>.<fn>(ctx, { ... })`. Only `import` from `bun`,
  `node:*`, or third-party packages.
- **Folder = namespace.** `src/profiles/load.ts` registers as
  `ctx.fns.profiles.load`. Add `src/<mod>/<fn>.ts` and it shows up
  automatically after `ctx.genTypes(ctx)` + `ctx.fns.repl.load(ctx, { name: "<mod>" })`.
- **Types** go in `$type_<Name>.ts` and are accessed globally as
  `types.<mod>.<Name>` — no `import type` from project files.
- **Routes** are filename-based: `src/$route_<path>_<METHOD>.ts`
  → `<METHOD> /<path>` (underscores split into URL segments).

Don't use npm packages when a Bun built-in exists (`Bun.file`, `Bun.$`,
`Bun.sql`, `bun:sqlite`, `WebSocket`, ...).

## Pull requests

1. Open an issue first for non-trivial changes — pick the relevant template
   in `.github/ISSUE_TEMPLATE/`.
2. Keep PRs focused: one edge / one profile / one feature.
3. Run sanity checks before pushing:
   ```sh
   bun test            # if any tests under src/**/*.test.ts
   bunx tsc --noEmit   # type-check
   ```
4. PR title should be ≤70 chars; body uses the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
5. Mention the related edge/profile in the title:
   `Fix Patient__person.gender_source_concept_id lookup`.

## Reporting mapping errors

If you spot an incorrect mapping (wrong concept_id, missing FHIR path,
wrong cardinality), use the
[mapping-correction issue template](.github/ISSUE_TEMPLATE/mapping_correction.md).
Cite the edge JSON file and link to the reference implementation that
disagrees, if any.

## Code of Conduct

Project is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
(Contributor Covenant v2.1).

## License

By contributing you agree your contribution is licensed under
[Apache License 2.0](LICENSE).
