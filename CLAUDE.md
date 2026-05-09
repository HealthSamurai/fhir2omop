---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

# FHIR to OMOP Mapping Project

This project maps FHIR R4 resources to OMOP CDM (Common Data Model) for observational health data research.

## Project Resources

### Documentation
- `sources.md` - OMOP/OHDSI information sources (official docs, tools, community)
- `cdm.md` - Index of OMOP CDM tables, fields, and repository structure

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
