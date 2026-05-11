---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

# FHIR to OMOP Mapping Project

This project maps FHIR R4 resources to OMOP CDM (Common Data Model) for observational health data research.

## Bootstrap from zero

```sh
# 1. Clone with all submodules (CommonDataModel + ~38 reference implementations under refs/refs/)
git clone --recurse-submodules https://github.com/HealthSamurai/fhir2omop
cd fhir2omop
# Already cloned without --recurse-submodules? Run:
git submodule update --init --recursive

# 2. Install dependencies (uses Bun, not npm)
bun install

# 3. Download FHIR R4 core metadata (~3.7 MB gzipped, 4,574 resources)
#    Writes both fhir-core/ (full) and data/ (slim {url, resourceType, version, id})
bun src/load-fhir-core.ts

# 4. Sanity checks
bun scripts/fhir-structuredef.ts --kind resource --list   # 146 base FHIR resource types
bun scripts/omop-table.ts --list                          # 39 OMOP CDM v5.4 tables
ls mapspec/                                               # Per-resource mapping docs

# 5. Bring up Postgres + load Athena vocabularies (~6.4M concepts, ~75M ancestor rows)
docker compose up -d                                      # Postgres 17 (ParadeDB) on :54392
bun script/init-athena.ts                                 # Pulls bundle ZIP from GCS, loads vocab.*
```

What gets pulled by submodules:
- `CommonDataModel/` — OHDSI source-of-truth: `inst/csv/OMOP_CDMv5.4_*.csv`, DDL for 15 SQL dialects
- `refs/refs/*` — 38 reference implementations (HL7 IG, FhirToCdm, NACHC, omoponfhir, etc.). Pre-analyzed summaries live alongside in `refs/*.md`.

What gets generated locally and is gitignored:
- `fhir-core/` and `data/` — produced by `bun src/load-fhir-core.ts`
- `node_modules/` — produced by `bun install`

## Project Resources

### Documentation
- `sources.md` - OMOP/OHDSI information sources (official docs, tools, community)
- `cdm.md` - Index of OMOP CDM tables, fields, and repository structure

### PostgreSQL — Athena vocabularies

Local Postgres holds the OMOP standardized vocabularies (Athena bundle: SNOMED,
ICD9/10CM, CPT4, HCPCS, LOINC, RxNorm, NDC, ATC, …). Used for code lookups,
hierarchy walks (`concept_ancestor`), and `source_to_concept_map` joins during
FHIR→OMOP ETL.

```
docker-compose.yml               # paradedb/paradedb:latest-pg17 on host port 54392
script/athena-schema.sql         # DDL for the 9 vocab.* tables
script/load-athena.ts            # CSV bundle → vocab.* loader (psql \copy + staging)
script/init-athena.ts            # gcloud cp from GCS + unzip + load (one-shot bootstrap)
athena/downloads/                # ZIP cache (gitignored)
athena/bundle/                   # Extracted CSVs (gitignored)
```

**Connection**
- DSN: `postgresql://athena:athena@localhost:54392/athena`
- Override via `ATHENA_DSN` env var.
- Connect: `PGPASSWORD=athena psql -h localhost -p 54392 -U athena -d athena`

**Bundle source (GCS)**
- Project: `atomic-ehr`
- Bucket: `gs://atomic-ehr-athena-vocab/bundles/`
- Current: `athena-bundle-20260511-v20260227.zip` (928 MB, v20260227 vocabularies)
- Fresh bundles come from https://athena.ohdsi.org/vocabulary/download-history
  — log in, pick vocabs, wait for the email, download, then upload with
  `gcloud storage cp <zip> gs://atomic-ehr-athena-vocab/bundles/`.

**Schemas**
- `vocab.*` — typed target tables (the standard OMOP CDM v5.4 vocabulary schema)
- `vocab_staging.*` — text-column staging tables; created per file by the
  loader and dropped on success (date columns arrive as `YYYYMMDD` strings and
  get converted via `to_date(..., 'YYYYMMDD')`).

**Tables in `vocab` schema** (row counts from the May 2026 bundle):

| Table | Rows | Purpose |
|---|---:|---|
| `vocab.vocabulary` | 59 | Vocabulary registry (id, name, version, reference) |
| `vocab.domain` | 50 | Domain dictionary (Condition, Drug, Measurement, …) |
| `vocab.concept_class` | 433 | Concept class dictionary (Clinical Finding, Ingredient, …) |
| `vocab.relationship` | 722 | Relationship type registry + reverses |
| `vocab.concept` | 6,396,107 | All standardized + source concepts, one row per `concept_id` |
| `vocab.concept_synonym` | 2,700,416 | Alternative names per concept |
| `vocab.concept_relationship` | 39,381,422 | Pairwise relationships (Maps to, Is a, RxNorm has ing, …) |
| `vocab.concept_ancestor` | 75,530,956 | Pre-computed transitive closure of hierarchical "Is a" relationships |
| `vocab.drug_strength` | 2,966,827 | Drug ingredient strengths (amount, numerator/denominator + units) |

**Common queries**

```sql
-- Look up a SNOMED code
SELECT concept_id, concept_name, standard_concept, domain_id
FROM vocab.concept
WHERE vocabulary_id = 'SNOMED' AND concept_code = '44054006';

-- ICD10CM → SNOMED via "Maps to"
SELECT c2.concept_id, c2.concept_name
FROM vocab.concept c1
JOIN vocab.concept_relationship cr
  ON cr.concept_id_1 = c1.concept_id AND cr.relationship_id = 'Maps to'
  AND cr.invalid_reason IS NULL
JOIN vocab.concept c2 ON c2.concept_id = cr.concept_id_2
WHERE c1.vocabulary_id = 'ICD10CM' AND c1.concept_code = 'E11.9';

-- All descendants of "Diabetes mellitus" (SNOMED 73211009 → concept_id 201820)
SELECT descendant_concept_id, c.concept_name
FROM vocab.concept_ancestor a
JOIN vocab.concept c ON c.concept_id = a.descendant_concept_id
WHERE a.ancestor_concept_id = 201820;
```

**Re-loading**
Re-running `bun script/load-athena.ts <dir>` is destructive — it drops and
recreates the `vocab.*` tables (see top of `script/athena-schema.sql`). Pull a
newer ZIP from GCS, point `bun script/init-athena.ts gs://…/newer.zip` at it.

**CPT4 post-processing (optional)**
The bundle ships `cpt4.jar` + `CONCEPT_CPT4.csv`. CPT4 concept names are
licensed and not included in `CONCEPT.csv` — run `sh cpt.sh` inside
`athena/bundle/` with a UMLS API key to hydrate them in place before loading,
if you need them.

### OMOP CDM (git submodule)
```
CommonDataModel/           # https://github.com/OHDSI/CommonDataModel
├── inst/csv/              # Table & field definitions (source of truth)
│   ├── OMOP_CDMv5.4_Table_Level.csv
│   └── OMOP_CDMv5.4_Field_Level.csv
└── inst/ddl/5.4/          # DDL scripts for 15 SQL dialects
```

### FHIR↔OMOP Reference Implementations (git submodules in refs/)
```
refs/
├── fhir-omop-ig/          # HL7 Official FHIR↔OMOP Implementation Guide
├── fhir2omop-cookbook/    # CodeX HL7 FHIR Accelerator - mapping guide
├── FhirToCdm/             # OHDSI .NET Core FHIR→OMOP converter
├── ETL-German-FHIR-Core/  # OHDSI German MII FHIR→OMOP ETL
├── omoponfhir-v54-r4/     # FHIR R4 server on OMOP v5.4
├── NACHC-fhir-to-omop/    # Java FHIR→OMOP tools (Apache 2)
├── omopfhirmap/           # CLI tool for ATLAS cohort↔FHIR bundle
├── GT-FHIR/               # Georgia Tech FHIR server + mapping docs
├── FHIROntopOMOP/         # OMOP as FHIR Knowledge Graph (Ontop)
└── mends-on-fhir/         # OMOP→FHIR for chronic disease surveillance
```

### FHIR R4 Core (not in git)

Source: `https://fs.get-ig.org/rs/hl7.fhir.r4.core-4.0.1.ndjson.gz` (4,574 resources)

Two outputs are written by `bun src/load-fhir-core.ts`:

```
fhir-core/                 # Full canonical resources (one file per resourceType)
├── StructureDefinition.ndjson    # 655   resource/type definitions
├── ValueSet.ndjson               # 1,316 value sets
├── CodeSystem.ndjson             # 1,062 code systems
├── SearchParameter.ndjson        # 1,400 search parameters
├── ConceptMap.ndjson             # 80    concept maps
├── OperationDefinition.ndjson    # 47    operation definitions
├── CapabilityStatement.ndjson    # 6     capability statements
├── CompartmentDefinition.ndjson  # 6     compartment definitions
├── StructureMap.ndjson           # 2     structure maps
├── StructureDefinition-by-type.json   # SDs grouped by .type
└── index.json                    # Summary (source URL, downloadedAt, counts)

data/                      # Slim index — { url, resourceType, version, id } only
├── <ResourceType>.ndjson         # Same 9 types as above, one line per resource
└── index.json                    # Same summary as fhir-core/index.json
```

Use `data/` for fast canonical-URL lookups and inventories without parsing the
full resources; use `fhir-core/` when you need element definitions, concepts,
or any other body content.

Reload FHIR core: `bun src/load-fhir-core.ts` (rewrites both directories)

## Architecture: procedural ctx.fns (adapted from hyper-code2)

**One function per file. Folder = namespace.** Files in `src/` are scanned by
`loadFns` and registered as `ctx.fns.<module>.<fn>` (see `src/loadFns.ts` and
`src/project/classify.ts`).

```
src/
  $main.ts                 entry: loadFns → genTypes → loadRoutes → server.start
  $type_Context.ts         global `Context` type
  ctx_ns.d.ts              AUTO-GEN — FnsRegistry, types.* — written by ctx.genTypes
  loadFns.ts               first-sweep loader (handles bootstrap before ctx.fns exists)
  genTypes.ts              ctx.genTypes — rescans src/ and writes ctx_ns.d.ts

  http/                    ctx.fns.http.* — Bun.serve + dynamic route table
  project/                 ctx.fns.project.* — scan / classify / roots
  repl/                    ctx.fns.repl.* — eval, load (hot-reload), POST /repl
  markdown/                ctx.fns.markdown.* — render, highlight, mermaid
  mapspec/                 ctx.fns.mapspec.* — list (edges loader), render (per-edge UI)
  profiles/                ctx.fns.profiles.* — load, byId, valueSetByUrl, profileForEdge

  $route_GET.ts            GET /
  $route_profiles_GET.ts   GET /profiles
  $route_profiles_$id_GET.ts  GET /profiles/:id
  …
```

### Calling convention

- `export default async function (ctx: Context, opts: {...})` — **anonymous**, no function name. Every fn takes `ctx` first, then a single options-object.
- **Universal calling convention**: `ctx.fns.<ns>.<fn>(ctx, { ...opts })`. Single rule, no per-fn argument-order recall.
- Single-arg fns still take an opts wrapper: `profiles.byId(ctx, { id })`, not `profiles.byId(ctx, id)`.
- Zero-arg fns take `(ctx)` only (no opts wrapper): `profiles.load(ctx)`.
- Routes: `export default async function (ctx, _session, req)` — return `{ title, main, current? }` or a raw `Response`.

### No cross-imports between project files

- Call other modules through `ctx.fns.<ns>.<fn>(ctx, { ... })`, not `import`.
- Only `import` from `bun`, `node:*`, or third-party packages.
- (Historical exception: `src/mapspec/list.ts` is a typed catalog with named exports re-used by `render.ts`. Don't follow that pattern in new code.)

### Special filenames (`$` prefix stripped when registering in `ctx.fns`)

- `$main.ts` — entry point. NOT loaded into `ctx.fns`.
- `$route_<path>_<METHOD>.ts` — HTTP route. `_` in path = `/`, `$foo` = `:foo` param. See `src/http/loadRoutes.ts` and `src/project/classify.ts`.
- `$type_<Name>.ts` — type declaration only. Picked up by `ctx.genTypes` as `types.<mod>.<Name>` globally. Never `import type` from project files — use `types.<mod>.<Name>` directly.
- Other `$<name>.ts` (e.g. `$start.ts`) — regular function, loaded as `ctx.fns.<mod>.<name>`.

## REPL workflow (use this, don't restart!)

The server is long-running. Hot-reload everything from the REPL — restart only if something is genuinely broken.

```bash
# Start once
bun src/$main.ts &                    # writes port to .hyper/_runtime/port

# Send code to the running process (`return` not allowed; use console.log)
bun script/repl.ts '1 + 1'
bun script/repl.ts 'console.log(Object.keys(ctx.fns))'
bun script/repl.ts -f /tmp/play.js                     # from file
echo '...' | bun script/repl.ts                        # from stdin

# Hot-reload after editing a file
bun script/repl.ts 'await ctx.fns.repl.load(ctx, { name: "profiles" })'   # whole folder
bun script/repl.ts 'await ctx.fns.repl.load(ctx, { name: "mapspec.render" })'  # single fn
bun script/repl.ts 'await ctx.fns.http.loadRoutes(ctx)'                  # rescan $route_*.ts
bun script/repl.ts 'await ctx.genTypes(ctx)'                             # regen ctx_ns.d.ts

# Clear cached state (e.g. profile cache on ctx.state.profiles)
bun script/repl.ts 'delete ctx.state.profiles; console.log("cleared")'
```

After editing `src/<module>/<fn>.ts`:
1. `repl.load` the module (or just the fn).
2. `genTypes(ctx)` if you added/removed files or `$type_*.ts`.
3. `http.loadRoutes(ctx)` if you added/renamed a `$route_*.ts`.

The route module cache uses `?t=${Date.now()}` so route files reload on each `loadRoutes`. Non-route fn modules need an explicit `repl.load`.

## Scripts

### `scripts/fhir-structuredef.ts` - Search FHIR StructureDefinitions
```sh
bun scripts/fhir-structuredef.ts Patient                    # Search by name
bun scripts/fhir-structuredef.ts --pretty Patient           # Compact output (token-efficient)
bun scripts/fhir-structuredef.ts --pretty --kind resource Observation
bun scripts/fhir-structuredef.ts --full Patient             # Show all elements
bun scripts/fhir-structuredef.ts --kind resource            # Filter by kind
bun scripts/fhir-structuredef.ts --list                     # List all
bun scripts/fhir-structuredef.ts --json Patient             # JSON output
```

Options:
- `--pretty` - Compact pretty print (name, cardinality, types only)
- `--full` - Show full definition with all elements and descriptions
- `--kind <kind>` - Filter: resource, complex-type, primitive-type, logical
- `--list` - List all (compact format)
- `--json` - Output as JSON

### `scripts/fhir-valueset.ts` - Search FHIR ValueSets
```sh
bun scripts/fhir-valueset.ts gender                   # Search by name
bun scripts/fhir-valueset.ts --pretty observation     # Compact output
bun scripts/fhir-valueset.ts --full administrative-gender  # Show concepts
bun scripts/fhir-valueset.ts --list                   # List all 1,316 ValueSets
bun scripts/fhir-valueset.ts --status active          # Filter by status
```

Options:
- `--pretty` - Compact pretty print (name, url, source systems)
- `--full` - Show full definition with included concepts
- `--status <status>` - Filter: active, draft, retired
- `--list` - List all (compact format)
- `--json` - Output as JSON

### `scripts/fhir-codesystem.ts` - Search FHIR CodeSystems
```sh
bun scripts/fhir-codesystem.ts gender                 # Search by name
bun scripts/fhir-codesystem.ts --pretty observation   # Compact output
bun scripts/fhir-codesystem.ts --full administrative-gender  # Show all codes
bun scripts/fhir-codesystem.ts --list                 # List all 1,062 CodeSystems
bun scripts/fhir-codesystem.ts --content complete     # Filter by content type
```

Options:
- `--pretty` - Compact pretty print (name, url, count)
- `--full` - Show full definition with all codes
- `--status <status>` - Filter: active, draft, retired
- `--content <content>` - Filter: complete, fragment, not-present
- `--list` - List all (grouped by content type)
- `--json` - Output as JSON

### `scripts/omop-table.ts` - Search OMOP CDM tables (uses DuckDB)
```sh
bun scripts/omop-table.ts person                    # Search by name
bun scripts/omop-table.ts --pretty person           # Compact output
bun scripts/omop-table.ts --pretty --desc person    # With field descriptions
bun scripts/omop-table.ts --list                    # List all 39 tables
bun scripts/omop-table.ts --list --schema CDM       # Filter by schema
bun scripts/omop-table.ts --full person             # Full descriptions
bun scripts/omop-table.ts --json person             # JSON output
bun scripts/omop-table.ts --sql "SELECT * FROM fields WHERE cdmDatatype = 'date'"
```

Options:
- `--pretty` - Compact pretty print (field, type, PK/FK)
- `--desc` - Add field descriptions (with --pretty)
- `--full` - Show full definition with descriptions
- `--schema <schema>` - Filter: CDM, VOCAB, RESULTS
- `--list` - List all tables
- `--sql <query>` - Run custom SQL (tables: `tables`, `fields`)
- `--json` - Output as JSON

## DuckDB

Used for querying CSV files with SQL. Useful SQL queries for OMOP:
```sh
# Find all date fields
bun scripts/omop-table.ts --sql "SELECT cdmTableName, cdmFieldName FROM fields WHERE cdmDatatype = 'date'"

# Count fields per table
bun scripts/omop-table.ts --sql "SELECT cdmTableName, COUNT(*) as cnt FROM fields GROUP BY 1 ORDER BY 2 DESC"

# Find all FK to CONCEPT table
bun scripts/omop-table.ts --sql "SELECT cdmTableName, cdmFieldName FROM fields WHERE fkTableName = 'CONCEPT'"

# List all data types
bun scripts/omop-table.ts --sql "SELECT DISTINCT cdmDatatype FROM fields ORDER BY 1"
```

DuckDB API usage:
```ts
import duckdb from "duckdb";

const db = new duckdb.Database(":memory:");

// Query CSV directly
db.all(`SELECT * FROM read_csv_auto('data.csv') WHERE col = 'value'`, (err, rows) => {
  console.log(rows);
});

// For complex CSVs with quoted fields containing commas/newlines:
db.all(`SELECT * FROM read_csv('data.csv',
  header = true,
  quote = '"',
  escape = '"',
  ignore_errors = true,
  null_padding = true,
  parallel = false
)`, callback);
```

Note: Bun may crash on cleanup (exit code 133) due to a Bun/DuckDB bug. Output is still correct.

## Mapping Data Model

The FHIR→OMOP mappings live under `mapspec/`, split into machine and human layers:

```
mapspec/
├── schema/edge.schema.json         # JSON Schema for edges
├── edges/<Resource>__<table>.json  # source of truth — 28 mapping edges
├── resources/<Resource>.md         # per-FHIR narrative (one file per resource)
└── <Resource>/<table>.md           # legacy detail markdowns (still used as a
                                     # rendering fallback when edges/*.json
                                     # is missing or thin)
```

`edges/<R>__<T>.json` is the load-bearing unit. Each edge has:

- `fhir_resource`, `omop_table`, `direction` (`fhir-to-omop` | `omop-to-fhir`),
  `status` (`documented` | `implemented` | `stub` | `planned`), `primary`,
  `required`, `condition` (e.g. when an Observation routes to `measurement`
  vs `observation`), `narrative_md`
- `fields[]` — column-level mapping. Each field has `omop_column`, `fhir_path`,
  `omop_type`/`fhir_type`, `required`/`pk`/`fk`/`concept_map`/`constant`,
  `notes`, and `sources[]`.
- `sources[]` (per field) — how each reference implementation handles this
  field. Each source has a `comment` (short differentiator) and
  `references[]` (`project`, `kind`, `path`, optional `lines: [from, to]`,
  optional `notes`). `path` points into `refs/refs/...`.
- `vocabularies[]` — inline static concept maps (e.g. gender → 8507/8532/…).
- `edge_cases[]` — per-edge gotchas with per-impl handling.
- `references[]` — edge-level reference implementations (with the same
  Reference shape used per-field).

Status (May 2026): 28 edges across 20 FHIR resources → 16 OMOP tables.
`bun -e '...'` over the JSONs shows **136 / 439 fields** carry per-field
`sources[]`, totalling **327 source-groups** with concrete file/line refs.
The rest are trivial mappings (constants, single-impl, source-value direct
copies) — no fabrication, no sources beyond what the markdowns supported.

Adding/editing a mapping: edit `mapspec/edges/<R>__<T>.json` (validate against
`mapspec/schema/edge.schema.json`). The renderer picks up changes after a
server restart (edge list is cached in process; see `src/mapspec/list.ts`).

## Viewer App (Bun + htmx)

`bun src/$main.ts` boots the dev server on `:3000` (override with `$PORT`).
Bootstrap: `loadFns` registers every `src/**/<fn>.ts` into `ctx.fns.<dir>.<fn>`,
`genTypes` writes `src/ctx_ns.d.ts` so TS knows the registry shape,
`http.loadRoutes` registers everything matching `$route_*_<METHOD>.ts`,
`http.start` binds the server. Hot iteration: kill the process, restart.
Edits to `src/$layout.ts` / `src/mapspec/render.ts` need a restart.

URL map (registered automatically — see startup log):

| URL | Source | Purpose |
|---|---|---|
| `GET /` | `src/$route_GET.ts` | Home: stats, Sankey graph, edge matrix |
| `GET /mapspec/:resource` | `src/mapspec/$route_$resource_GET.ts` | Resource page: destinations panel + narrative MD |
| `GET /mapspec/:resource/:table` | `src/mapspec/$route_$resource_$table_GET.ts` | Edge detail: field list with per-field sources (collapsible) |
| `GET /table/:name` | `src/$route_table_$name_GET.ts` | OMOP table page: list of FHIR sources for the table |
| `GET /source?path=&from=&to=` | `src/$route_source_GET.ts` | File viewer with line-range highlight (used by reference links) |
| `POST /repl` | `src/repl/$route__POST.ts` | Server-side REPL for poking at `ctx` |

Layout (`src/$layout.ts`) wraps every response in a sidebar + main pane.
Sidebar groups FHIR Resources and OMOP Tables; OMOP table headers link to
`/table/<name>`.

**htmx**: `<body hx-boost="true" hx-target="#main-content"
hx-select="#main-content" hx-select-oob="#sidebar" hx-swap="outerHTML">`.
Sidebar clicks only swap the central pane + OOB-update the sidebar so the
active highlight follows. `document.title` is refreshed from a hidden
`<span data-page-title>` marker on every swap. The source viewer's `<pre>`
opts out with `hx-boost="false"` so `#L123` line anchors do native jumps.

Render path for the edge detail page (the only nontrivial one):
`render.ts` resolves the edge JSON from `loadEdges()`, then `renderEdge()`
emits a header, the field list (one card per `fields[]` entry with badges,
notes, and a `<details>` per-field-sources disclosure), the vocabularies,
edge cases, and edge-level references. Every reference with a `path` is
linked through `renderReference()` to `/source?path=...&from=...&to=...`.

## File-Based Routing & Module Convention

`src/project/classify.ts` is the canonical reference. Stem-based rules:

- `$route_<seg>_<seg>_<METHOD>.ts` — route. Underscores split into URL
  segments; segments starting with `$` become `:params`. Module path
  prefixes the URL. So `src/mapspec/$route_$resource_$table_GET.ts` →
  `GET /mapspec/:resource/:table`.
- `<name>.ts` (no `$` prefix) → registered as `ctx.fns.<dir>.<name>`.
- `$<name>.ts` (e.g. `$layout.ts`, `$start.ts`) → top-level "root fn" or
  module-private (strips the `$`).
- `$type_<Name>.ts` → contributes a `type` to `ctx_ns.d.ts`.
- `$setting_<key>.ts` → settings (must live under a module folder).
- `$script_<name>.js|css` → static asset bundled by Bun on demand.

Match function (`src/http/match.ts`) is a simple segment-by-segment Express
clone. **Caveat**: there is no specificity ordering — literal segments do
not beat `:params` if registered later. Avoid ambiguous paths (e.g. don't
add `/mapspec/tables/:name` because it collides with `/mapspec/:resource/:table`).
That is why the table page lives at `/table/:name`, not under `/mapspec/`.

Route handlers return either a `Response` (used verbatim) or a plain object
`{ title, current, main }` which is run through `ctx.layout()` to apply the
sidebar/HTML chrome.

## Key External Resources
- OMOP CDM docs: https://ohdsi.github.io/CommonDataModel/
- Athena vocabularies: https://athena.ohdsi.org/
- Book of OHDSI: https://ohdsi.github.io/TheBookOfOhdsi/
- FHIR R4 spec: https://hl7.org/fhir/R4/

---

## Bun Runtime

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
