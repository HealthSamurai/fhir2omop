#!/usr/bin/env bun
// Load an Athena vocabulary bundle (CSV files) into PostgreSQL.
//
// Usage:
//   bun script/load-athena.ts <bundle-dir>
//   bun script/load-athena.ts ~/Downloads/vocabulary_download_v5_...
//
// Athena CSV format: tab-separated, no quoting, header row, dates as YYYYMMDD,
// empty string = NULL. We COPY each file into a staging table (text columns),
// then INSERT-SELECT into the typed vocab.* tables with TO_DATE for dates.

import { $ } from "bun";
import { readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const DSN = process.env.ATHENA_DSN
  ?? "postgresql://athena:athena@localhost:54392/athena";

const bundleDir = process.argv[2];
if (!bundleDir) {
  console.error("usage: bun script/load-athena.ts <bundle-dir>");
  process.exit(1);
}
if (!existsSync(bundleDir)) {
  console.error(`bundle dir not found: ${bundleDir}`);
  process.exit(1);
}

// Map of Athena CSV → { staging columns (all text), final table, typed SELECT }
type Spec = {
  file: string;
  cols: string[];
  table: string;
  insert: string;
};

const date = (c: string) => `to_date(NULLIF(${c}, ''), 'YYYYMMDD')`;
const int = (c: string) => `NULLIF(${c}, '')::int`;
const num = (c: string) => `NULLIF(${c}, '')::numeric`;
const nz = (c: string) => `NULLIF(${c}, '')`;

const SPECS: Spec[] = [
  {
    file: "VOCABULARY.csv",
    table: "vocab.vocabulary",
    cols: ["vocabulary_id", "vocabulary_name", "vocabulary_reference",
           "vocabulary_version", "vocabulary_concept_id"],
    insert: `vocabulary_id, vocabulary_name, ${nz("vocabulary_reference")},
             ${nz("vocabulary_version")}, vocabulary_concept_id::int`,
  },
  {
    file: "DOMAIN.csv",
    table: "vocab.domain",
    cols: ["domain_id", "domain_name", "domain_concept_id"],
    insert: `domain_id, domain_name, domain_concept_id::int`,
  },
  {
    file: "CONCEPT_CLASS.csv",
    table: "vocab.concept_class",
    cols: ["concept_class_id", "concept_class_name", "concept_class_concept_id"],
    insert: `concept_class_id, concept_class_name, concept_class_concept_id::int`,
  },
  {
    file: "CONCEPT.csv",
    table: "vocab.concept",
    cols: ["concept_id", "concept_name", "domain_id", "vocabulary_id",
           "concept_class_id", "standard_concept", "concept_code",
           "valid_start_date", "valid_end_date", "invalid_reason"],
    insert: `concept_id::int, concept_name, domain_id, vocabulary_id,
             concept_class_id, ${nz("standard_concept")}, concept_code,
             ${date("valid_start_date")}, ${date("valid_end_date")},
             ${nz("invalid_reason")}`,
  },
  {
    file: "RELATIONSHIP.csv",
    table: "vocab.relationship",
    cols: ["relationship_id", "relationship_name", "is_hierarchical",
           "defines_ancestry", "reverse_relationship_id",
           "relationship_concept_id"],
    insert: `relationship_id, relationship_name, is_hierarchical,
             defines_ancestry, reverse_relationship_id,
             relationship_concept_id::int`,
  },
  {
    file: "CONCEPT_RELATIONSHIP.csv",
    table: "vocab.concept_relationship",
    cols: ["concept_id_1", "concept_id_2", "relationship_id",
           "valid_start_date", "valid_end_date", "invalid_reason"],
    insert: `concept_id_1::int, concept_id_2::int, relationship_id,
             ${date("valid_start_date")}, ${date("valid_end_date")},
             ${nz("invalid_reason")}`,
  },
  {
    file: "CONCEPT_SYNONYM.csv",
    table: "vocab.concept_synonym",
    cols: ["concept_id", "concept_synonym_name", "language_concept_id"],
    insert: `concept_id::int, concept_synonym_name, language_concept_id::int`,
  },
  {
    file: "CONCEPT_ANCESTOR.csv",
    table: "vocab.concept_ancestor",
    cols: ["ancestor_concept_id", "descendant_concept_id",
           "min_levels_of_separation", "max_levels_of_separation"],
    insert: `ancestor_concept_id::int, descendant_concept_id::int,
             min_levels_of_separation::int, max_levels_of_separation::int`,
  },
  {
    file: "DRUG_STRENGTH.csv",
    table: "vocab.drug_strength",
    cols: ["drug_concept_id", "ingredient_concept_id", "amount_value",
           "amount_unit_concept_id", "numerator_value",
           "numerator_unit_concept_id", "denominator_value",
           "denominator_unit_concept_id", "box_size",
           "valid_start_date", "valid_end_date", "invalid_reason"],
    insert: `drug_concept_id::int, ingredient_concept_id::int,
             ${num("amount_value")}, ${int("amount_unit_concept_id")},
             ${num("numerator_value")}, ${int("numerator_unit_concept_id")},
             ${num("denominator_value")}, ${int("denominator_unit_concept_id")},
             ${int("box_size")}, ${date("valid_start_date")},
             ${date("valid_end_date")}, ${nz("invalid_reason")}`,
  },
];

async function psql(sql: string) {
  return await $`psql ${DSN} -v ON_ERROR_STOP=1 -c ${sql}`.quiet();
}

async function loadSpec(spec: Spec, path: string) {
  const stagingTable = `vocab_staging.${basename(spec.file, ".csv").toLowerCase()}`;
  const colDef = spec.cols.map(c => `${c} text`).join(", ");
  const colList = spec.cols.join(", ");

  console.log(`→ ${spec.file}`);

  await psql(`
    DROP TABLE IF EXISTS ${stagingTable};
    CREATE UNLOGGED TABLE ${stagingTable} (${colDef});
  `);

  // \copy is psql-side; use it so the CSV is read from the client filesystem.
  // QUOTE E'\\b' effectively disables quote handling (Athena exports raw tabs).
  const copyCmd = `\\copy ${stagingTable}(${colList}) FROM '${path}' WITH (FORMAT csv, DELIMITER E'\\t', HEADER true, QUOTE E'\\b', NULL '')`;
  await $`psql ${DSN} -v ON_ERROR_STOP=1 -c ${copyCmd}`.quiet();

  await psql(`
    INSERT INTO ${spec.table} (${colList})
    SELECT ${spec.insert}
    FROM ${stagingTable};
    DROP TABLE ${stagingTable};
  `);

  const count = await $`psql ${DSN} -tAc ${`SELECT count(*) FROM ${spec.table}`}`.quiet();
  console.log(`  ${spec.table}: ${count.text().trim()} rows`);
}

// --- main ---
console.log(`Bundle: ${bundleDir}`);
console.log(`Target: ${DSN}`);

const available = new Set(readdirSync(bundleDir));
console.log(`Files:  ${[...available].filter(f => f.endsWith(".csv")).join(", ")}`);

// Schema
const schemaPath = join(import.meta.dir, "athena-schema.sql");
console.log(`\nApplying schema: ${schemaPath}`);
await $`psql ${DSN} -v ON_ERROR_STOP=1 -f ${schemaPath}`.quiet();

// Load each spec that has a matching CSV
console.log("\nLoading tables…");
for (const spec of SPECS) {
  if (!available.has(spec.file)) {
    console.log(`  skip ${spec.file} (not in bundle)`);
    continue;
  }
  await loadSpec(spec, join(bundleDir, spec.file));
}

console.log("\nDone.");
